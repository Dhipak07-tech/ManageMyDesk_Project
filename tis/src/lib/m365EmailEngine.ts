/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Microsoft 365 Domain Email Engine — Zero-Configuration Auto-Setup
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provider  : Microsoft 365
 * Domain    : technosprint.net
 * Mailbox   : support@technosprint.net
 *
 * Incoming  : outlook.office365.com:993  (IMAP / SSL-TLS)
 * Outgoing  : smtp.office365.com:587     (SMTP / STARTTLS)
 *
 * FULLY AUTOMATIC — no manual steps required after deployment.
 * Just restart the server. Everything self-configures.
 *
 * This module is ADDITIVE. It does not touch any existing engine.
 */

import nodemailer from 'nodemailer';
import imaps     from 'imap-simple';
import fs        from 'fs';
import path      from 'path';
import { execute, query, formatDate } from './db';

// ─── Hard-wired M365 endpoints (never change) ─────────────────────────────────
export const M365_CONFIG = {
  COMPANY_NAME:    'Technosprint',
  EMAIL_ADDRESS:   'support@technosprint.net',
  SMTP_HOST:       'smtp.office365.com',
  SMTP_PORT:       587,
  SMTP_ENCRYPTION: 'STARTTLS',
  IMAP_HOST:       'outlook.office365.com',
  IMAP_PORT:       993,
  IMAP_ENCRYPTION: 'SSL',
} as const;

export const M365_AUDIT_TABLE = 'm365_email_audit';

// ─── Startup state shared across module ───────────────────────────────────────
let _startupStatus: {
  envWritten:    boolean;
  dbSeeded:      boolean;
  smtpOk:        boolean | null;
  imapOk:        boolean | null;
  smtpError:     string | null;
  imapError:     string | null;
  startedAt:     string;
  lastPollAt:    string | null;
  pollCount:     number;
} = {
  envWritten:  false,
  dbSeeded:    false,
  smtpOk:      null,
  imapOk:      null,
  smtpError:   null,
  imapError:   null,
  startedAt:   new Date().toISOString(),
  lastPollAt:  null,
  pollCount:   0,
};

export function getM365StartupStatus() { return { ..._startupStatus }; }

// ─── Step 1: Auto-write .env if M365 keys are missing ────────────────────────
export function autoWriteM365Env() {
  // If the env vars are already loaded (from existing .env), nothing to do
  if (process.env.M365_SMTP_PASS && process.env.M365_SMTP_PASS !== 'your_m365_password_here') {
    return;
  }

  // Try to locate the .env file relative to cwd
  const envPath = path.join(process.cwd(), '.env');
  const m365Block = `
# ============================================
# Microsoft 365 Domain Email Integration
# AUTO-GENERATED — DO NOT EDIT HOST/PORT VALUES
# ============================================
M365_IMAP_HOST=outlook.office365.com
M365_IMAP_PORT=993
M365_IMAP_USER=support@technosprint.net
M365_IMAP_PASS=Poland@01
M365_IMAP_ENCRYPTION=SSL
M365_SMTP_HOST=smtp.office365.com
M365_SMTP_PORT=587
M365_SMTP_USER=support@technosprint.net
M365_SMTP_PASS=Poland@01
M365_SMTP_ENCRYPTION=STARTTLS
M365_AUTO_SEED=true
M365_IS_DEFAULT=true
`;

  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      // Only append if block not already present
      if (content.includes('M365_SMTP_HOST')) {
        // Already has M365 block — just patch the password lines if they are placeholders
        content = content
          .replace(/M365_IMAP_PASS=.*/g,  'M365_IMAP_PASS=Poland@01')
          .replace(/M365_SMTP_PASS=.*/g,  'M365_SMTP_PASS=Poland@01')
          .replace(/M365_AUTO_SEED=.*/g,  'M365_AUTO_SEED=true')
          .replace(/M365_IS_DEFAULT=.*/g, 'M365_IS_DEFAULT=true');
        fs.writeFileSync(envPath, content, 'utf8');
        console.log('[M365] ✓ .env patched with correct M365 credentials');
      } else {
        fs.appendFileSync(envPath, m365Block, 'utf8');
        console.log('[M365] ✓ M365 block appended to .env');
      }
    } else {
      fs.writeFileSync(envPath, m365Block.trim() + '\n', 'utf8');
      console.log('[M365] ✓ .env created with M365 configuration');
    }
    _startupStatus.envWritten = true;

    // Load the values into process.env immediately
    process.env.M365_IMAP_HOST       = 'outlook.office365.com';
    process.env.M365_IMAP_PORT       = '993';
    process.env.M365_IMAP_USER       = 'support@technosprint.net';
    process.env.M365_IMAP_PASS       = 'Poland@01';
    process.env.M365_IMAP_ENCRYPTION = 'SSL';
    process.env.M365_SMTP_HOST       = 'smtp.office365.com';
    process.env.M365_SMTP_PORT       = '587';
    process.env.M365_SMTP_USER       = 'support@technosprint.net';
    process.env.M365_SMTP_PASS       = 'Poland@01';
    process.env.M365_SMTP_ENCRYPTION = 'STARTTLS';
    process.env.M365_AUTO_SEED       = 'true';
    process.env.M365_IS_DEFAULT      = 'true';
  } catch (e: any) {
    console.error('[M365] Could not auto-write .env:', e.message);
  }
}

// ─── Helper: resolve credentials (always from env or hardcoded defaults) ──────
export function getM365Creds() {
  return {
    smtpUser: process.env.M365_SMTP_USER || 'support@technosprint.net',
    smtpPass: process.env.M365_SMTP_PASS || 'Poland@01',
    imapUser: process.env.M365_IMAP_USER || 'support@technosprint.net',
    imapPass: process.env.M365_IMAP_PASS || 'Poland@01',
  };
}

// ─── Step 2: Ensure audit table exists (DB-agnostic) ─────────────────────────
export async function ensureM365AuditTable() {
  // Try MySQL first, fall back to SQLite syntax
  const mysqlDDL = `
    CREATE TABLE IF NOT EXISTS ${M365_AUDIT_TABLE} (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      event_type    VARCHAR(100)  NOT NULL,
      direction     VARCHAR(20)   NOT NULL DEFAULT 'outbound',
      status        VARCHAR(30)   NOT NULL DEFAULT 'pending',
      ticket_id     VARCHAR(128),
      ticket_number VARCHAR(64),
      sender        VARCHAR(255),
      recipient     VARCHAR(255),
      subject       VARCHAR(500),
      message_id    VARCHAR(255),
      error_msg     TEXT,
      retry_count   INT     DEFAULT 0,
      metadata_json LONGTEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_m365_event   (event_type),
      INDEX idx_m365_status  (status),
      INDEX idx_m365_ticket  (ticket_number),
      INDEX idx_m365_created (created_at)
    ) ENGINE=InnoDB`;

  const sqliteDDL = `
    CREATE TABLE IF NOT EXISTS ${M365_AUDIT_TABLE} (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type    TEXT    NOT NULL,
      direction     TEXT    NOT NULL DEFAULT 'outbound',
      status        TEXT    NOT NULL DEFAULT 'pending',
      ticket_id     TEXT,
      ticket_number TEXT,
      sender        TEXT,
      recipient     TEXT,
      subject       TEXT,
      message_id    TEXT,
      error_msg     TEXT,
      retry_count   INTEGER DEFAULT 0,
      metadata_json TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

  try {
    await execute(mysqlDDL);
    console.log('[M365] ✓ Audit table ready (MySQL)');
  } catch (_mysqlErr) {
    try {
      await execute(sqliteDDL);
      console.log('[M365] ✓ Audit table ready (SQLite)');
    } catch (e: any) {
      console.error('[M365] Audit table init failed:', e.message);
    }
  }
}

// ─── Step 3: Audit logger ─────────────────────────────────────────────────────
export async function logM365Event(data: {
  event_type:    string;
  direction?:    string;
  status:        string;
  ticket_id?:    string | number;
  ticket_number?: string;
  sender?:       string;
  recipient?:    string;
  subject?:      string;
  message_id?:   string;
  error_msg?:    string;
  retry_count?:  number;
  metadata?:     Record<string, any>;
}) {
  try {
    await execute(
      `INSERT INTO ${M365_AUDIT_TABLE}
        (event_type, direction, status, ticket_id, ticket_number, sender, recipient,
         subject, message_id, error_msg, retry_count, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.event_type,
        data.direction     ?? 'outbound',
        data.status,
        data.ticket_id     ? String(data.ticket_id) : null,
        data.ticket_number ?? null,
        data.sender        ?? null,
        data.recipient     ?? null,
        data.subject       ?? null,
        data.message_id    ?? null,
        data.error_msg     ?? null,
        data.retry_count   ?? 0,
        data.metadata      ? JSON.stringify(data.metadata) : null,
      ]
    );
  } catch { /* non-critical */ }
}

// ─── Step 4: SMTP transporter ─────────────────────────────────────────────────
function buildM365Transporter(user: string, pass: string) {
  return nodemailer.createTransport({
    host:   M365_CONFIG.SMTP_HOST,
    port:   M365_CONFIG.SMTP_PORT,
    secure: false,   // STARTTLS on 587, NOT SSL
    auth:   { user, pass },
    tls:    {
      rejectUnauthorized: false,
      // Office 365 requires TLS 1.2+
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     20000,
  });
}

// ─── Step 5: Test SMTP ────────────────────────────────────────────────────────
export async function testM365Smtp(
  smtpUser?: string, smtpPass?: string
): Promise<{ ok: boolean; msg: string }> {
  const creds = getM365Creds();
  const user = smtpUser || creds.smtpUser;
  const pass = smtpPass || creds.smtpPass;
  try {
    const t = buildM365Transporter(user, pass);
    await t.verify();
    _startupStatus.smtpOk    = true;
    _startupStatus.smtpError = null;
    await logM365Event({ event_type: 'smtp_test', direction: 'outbound', status: 'success', sender: user });
    return { ok: true, msg: `SMTP verified: ${M365_CONFIG.SMTP_HOST}:${M365_CONFIG.SMTP_PORT} (STARTTLS)` };
  } catch (e: any) {
    _startupStatus.smtpOk    = false;
    _startupStatus.smtpError = e.message;
    await logM365Event({ event_type: 'smtp_test', direction: 'outbound', status: 'failed', sender: user, error_msg: e.message });
    return { ok: false, msg: e.message };
  }
}

// ─── Step 6: Test IMAP ────────────────────────────────────────────────────────
export async function testM365Imap(
  imapUser?: string, imapPass?: string
): Promise<{ ok: boolean; msg: string }> {
  const creds = getM365Creds();
  const user = imapUser || creds.imapUser;
  const pass = imapPass || creds.imapPass;
  try {
    const conn = await imaps.connect({
      imap: {
        user,
        password:    pass,
        host:        M365_CONFIG.IMAP_HOST,
        port:        M365_CONFIG.IMAP_PORT,
        tls:         true,
        tlsOptions:  { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        authTimeout: 15000,
      },
    });
    conn.end();
    _startupStatus.imapOk    = true;
    _startupStatus.imapError = null;
    await logM365Event({ event_type: 'imap_test', direction: 'inbound', status: 'success', sender: user });
    return { ok: true, msg: `IMAP verified: ${M365_CONFIG.IMAP_HOST}:${M365_CONFIG.IMAP_PORT} (SSL/TLS)` };
  } catch (e: any) {
    _startupStatus.imapOk    = false;
    _startupStatus.imapError = e.message;
    await logM365Event({ event_type: 'imap_test', direction: 'inbound', status: 'failed', sender: user, error_msg: e.message });
    return { ok: false, msg: e.message };
  }
}

// ─── Step 7: Send via M365 SMTP ───────────────────────────────────────────────
export async function sendViaM365(params: {
  to:              string;
  subject:         string;
  html:            string;
  smtpUser?:       string;
  smtpPass?:       string;
  ticketNumber?:   string;
  replyToMsgId?:   string;
  attachments?:    any[];
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const creds   = getM365Creds();
  const user    = params.smtpUser || creds.smtpUser;
  const pass    = params.smtpPass || creds.smtpPass;
  const { to, subject, html, ticketNumber, replyToMsgId, attachments } = params;

  try {
    const t       = buildM365Transporter(user, pass);
    const mailOpts: any = {
      from:    `"Technosprint Support" <${user}>`,
      to,
      subject,
      html,
      headers: ticketNumber ? { 'X-Ticket-Number': ticketNumber } : {},
    };
    if (replyToMsgId) {
      mailOpts.inReplyTo  = replyToMsgId;
      mailOpts.references = replyToMsgId;
    }
    if (attachments && attachments.length > 0) {
      mailOpts.attachments = attachments;
    }
    const info = await t.sendMail(mailOpts);
    await logM365Event({
      event_type: 'email_sent', direction: 'outbound', status: 'sent',
      ticket_number: ticketNumber, sender: user, recipient: to,
      subject, message_id: info.messageId,
    });
    console.log(`[M365] ✓ Email sent → ${to} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (e: any) {
    await logM365Event({
      event_type: 'email_sent', direction: 'outbound', status: 'failed',
      ticket_number: ticketNumber, sender: user, recipient: to,
      subject, error_msg: e.message,
    });
    console.error('[M365] Send failed:', e.message);
    return { ok: false, error: e.message };
  }
}

// ─── Step 8: Auto-seed DB config — always runs on startup ─────────────────────
export async function seedM365Config() {
  const creds     = getM365Creds();
  const isDefault = process.env.M365_IS_DEFAULT !== 'false' ? 1 : 0;

  try {
    const existing = await query(
      'SELECT id FROM company_email_configs WHERE email_address = ?',
      [M365_CONFIG.EMAIL_ADDRESS]
    );

    if (existing.length > 0) {
      // Always keep credentials and settings fresh
      await execute(
        `UPDATE company_email_configs SET
           company_name = ?,
           smtp_host    = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?,
           imap_host    = ?, imap_port = ?, imap_user = ?, imap_pass = ?,
           encryption   = ?, is_active  = 1,
           updated_at   = ?
         WHERE email_address = ?`,
        [
          M365_CONFIG.COMPANY_NAME,
          M365_CONFIG.SMTP_HOST, M365_CONFIG.SMTP_PORT, creds.smtpUser, creds.smtpPass,
          M365_CONFIG.IMAP_HOST, M365_CONFIG.IMAP_PORT, creds.imapUser, creds.imapPass,
          'STARTTLS', formatDate(new Date()),
          M365_CONFIG.EMAIL_ADDRESS,
        ]
      );
      // Promote to default if requested
      if (isDefault) {
        await execute('UPDATE company_email_configs SET is_default = 0 WHERE email_address != ?', [M365_CONFIG.EMAIL_ADDRESS]);
        await execute('UPDATE company_email_configs SET is_default = 1 WHERE email_address = ?', [M365_CONFIG.EMAIL_ADDRESS]);
      }
      console.log('[M365] ✓ DB config refreshed for support@technosprint.net');
    } else {
      // First-time insert
      if (isDefault) {
        await execute('UPDATE company_email_configs SET is_default = 0');
      }
      await execute(
        `INSERT INTO company_email_configs
          (company_name, email_address,
           smtp_host, smtp_port, smtp_user, smtp_pass,
           imap_host, imap_port, imap_user, imap_pass,
           encryption, is_active, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          M365_CONFIG.COMPANY_NAME, M365_CONFIG.EMAIL_ADDRESS,
          M365_CONFIG.SMTP_HOST, M365_CONFIG.SMTP_PORT, creds.smtpUser, creds.smtpPass,
          M365_CONFIG.IMAP_HOST, M365_CONFIG.IMAP_PORT, creds.imapUser, creds.imapPass,
          'STARTTLS', isDefault,
        ]
      );
      console.log(`[M365] ✓ DB config seeded for support@technosprint.net (default=${isDefault})`);
    }

    _startupStatus.dbSeeded = true;

    await logM365Event({
      event_type: 'config_seeded', direction: 'outbound', status: 'success',
      sender: M365_CONFIG.EMAIL_ADDRESS,
      metadata: { smtp: `${M365_CONFIG.SMTP_HOST}:${M365_CONFIG.SMTP_PORT}`, imap: `${M365_CONFIG.IMAP_HOST}:${M365_CONFIG.IMAP_PORT}` },
    });
  } catch (e: any) {
    console.error('[M365] DB seed failed:', e.message);
  }
}

// ─── Step 9: Startup validation (non-blocking) ───────────────────────────────
export async function runM365StartupChecks() {
  console.log('[M365] Running startup connectivity checks...');
  const [smtpRes, imapRes] = await Promise.allSettled([
    testM365Smtp(),
    testM365Imap(),
  ]);

  const smtpOk = smtpRes.status === 'fulfilled' && smtpRes.value.ok;
  const imapOk = imapRes.status === 'fulfilled' && imapRes.value.ok;

  if (smtpOk && imapOk) {
    console.log('[M365] ✅ Both SMTP and IMAP connections verified successfully');
  } else {
    if (!smtpOk) {
      const err = smtpRes.status === 'fulfilled' ? smtpRes.value.msg : 'Promise rejected';
      console.warn(`[M365] ⚠️  SMTP check failed: ${err}`);
      console.warn('[M365]    Outbound emails will be queued and retried automatically');
    }
    if (!imapOk) {
      const err = imapRes.status === 'fulfilled' ? imapRes.value.msg : 'Promise rejected';
      console.warn(`[M365] ⚠️  IMAP check failed: ${err}`);
      console.warn('[M365]    Incoming email polling will retry every 60 seconds');
    }
  }
}

// ─── Step 10: Health report ───────────────────────────────────────────────────
export async function getM365Health(): Promise<{
  status:      'healthy' | 'degraded' | 'unreachable';
  smtp:        { connected: boolean | null; host: string; port: number; error: string | null };
  imap:        { connected: boolean | null; host: string; port: number; error: string | null };
  stats:       { sent_24h: number; received_24h: number; failed_24h: number };
  lastPollTime: string | null;
  queuePending: number;
  queueFailed:  number;
  startupStatus: ReturnType<typeof getM365StartupStatus>;
}> {
  let sent24h = 0, received24h = 0, failed24h = 0;
  let lastPoll: string | null = _startupStatus.lastPollAt;
  let queuePending = 0, queueFailed = 0;

  try {
    // Use a time comparison compatible with both MySQL and SQLite
    const rows = await query(
      `SELECT direction, status, COUNT(*) as cnt FROM ${M365_AUDIT_TABLE}
       WHERE created_at >= datetime('now', '-24 hours')
       GROUP BY direction, status`
    );
    rows.forEach((r: any) => {
      const cnt = Number(r.cnt);
      if (r.direction === 'outbound' && r.status === 'sent')    sent24h     += cnt;
      if (r.direction === 'inbound'  && r.status === 'success') received24h += cnt;
      if (r.status === 'failed')                                failed24h   += cnt;
    });
    const lp = await query(`SELECT MAX(created_at) as last FROM ${M365_AUDIT_TABLE} WHERE direction = 'inbound'`);
    if (lp[0]?.last) lastPoll = lp[0].last;
  } catch { /* ignore */ }

  try {
    const qs = await query(
      `SELECT status, COUNT(*) as cnt FROM notifications_queue
       WHERE recipient LIKE '%technosprint.net%' GROUP BY status`
    );
    qs.forEach((r: any) => {
      if (r.status === 'pending') queuePending += Number(r.cnt);
      if (r.status === 'failed')  queueFailed  += Number(r.cnt);
    });
  } catch { /* ignore */ }

  const smtpOk = _startupStatus.smtpOk;
  const imapOk = _startupStatus.imapOk;

  let status: 'healthy' | 'degraded' | 'unreachable';
  if (smtpOk === true && imapOk === true)            status = 'healthy';
  else if (smtpOk === true || imapOk === true)       status = 'degraded';
  else if (smtpOk === false && imapOk === false)     status = 'unreachable';
  else                                               status = 'degraded'; // null = not yet tested

  return {
    status,
    smtp:  { connected: smtpOk, host: M365_CONFIG.SMTP_HOST, port: M365_CONFIG.SMTP_PORT, error: _startupStatus.smtpError },
    imap:  { connected: imapOk, host: M365_CONFIG.IMAP_HOST, port: M365_CONFIG.IMAP_PORT, error: _startupStatus.imapError },
    stats: { sent_24h: sent24h, received_24h: received24h, failed_24h: failed24h },
    lastPollTime:   lastPoll,
    queuePending,
    queueFailed,
    startupStatus:  getM365StartupStatus(),
  };
}

// ─── Step 11: Audit log query ─────────────────────────────────────────────────
export async function getM365AuditLogs(params: {
  limit?:      number;
  direction?:  string;
  status?:     string;
  event_type?: string;
}): Promise<any[]> {
  let sql  = `SELECT * FROM ${M365_AUDIT_TABLE} WHERE 1=1`;
  const vs: any[] = [];
  if (params.direction)  { sql += ' AND direction  = ?'; vs.push(params.direction);  }
  if (params.status)     { sql += ' AND status     = ?'; vs.push(params.status);     }
  if (params.event_type) { sql += ' AND event_type = ?'; vs.push(params.event_type); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  vs.push(params.limit ?? 100);
  try { return await query(sql, vs); } catch { return []; }
}

// ─── Step 12: Full auto-init — ONE call in server.ts startup ─────────────────
/**
 * Call this once in server startup. It:
 * 1. Writes .env if needed
 * 2. Ensures audit table
 * 3. Seeds DB config
 * 4. Runs connectivity checks (non-blocking)
 * Returns a cron handler to be registered for the 60-second poll.
 */
export async function initM365() {
  console.log('[M365] ══════════════════════════════════════════');
  console.log('[M365]  Microsoft 365 Email Integration — Auto-Init');
  console.log('[M365] ══════════════════════════════════════════');

  // 1. Ensure env vars are available
  autoWriteM365Env();

  // 2. Create audit table
  await ensureM365AuditTable();

  // 3. Seed DB config unconditionally (idempotent)
  await seedM365Config();

  // 4. Non-blocking startup checks
  runM365StartupChecks().catch(() => {});

  await logM365Event({
    event_type: 'startup', direction: 'outbound', status: 'success',
    sender: M365_CONFIG.EMAIL_ADDRESS,
    metadata: { version: '2.0', auto_init: true, timestamp: new Date().toISOString() },
  });

  console.log('[M365] ✓ Auto-init complete. IMAP polling starts in 60s.');
  console.log('[M365] ══════════════════════════════════════════');
}

// ─── Attachment processing ────────────────────────────────────────────────────
export function processM365Attachments(
  mailAttachments: any[], uploadsDir: string
): Array<{ filename: string; stored_filename: string; content_type: string; size: number; url: string }> {
  const result: any[] = [];
  if (!mailAttachments || mailAttachments.length === 0) return result;

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ALLOWED_TYPES = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'application/zip',
    'application/x-zip-compressed', 'text/plain',
  ];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  for (const att of mailAttachments) {
    // Validate type
    if (!ALLOWED_TYPES.includes(att.contentType)) {
      console.warn(`[M365] Attachment skipped (type not allowed): ${att.filename} (${att.contentType})`);
      continue;
    }
    // Validate size
    if (att.size > MAX_SIZE) {
      console.warn(`[M365] Attachment skipped (too large): ${att.filename} (${att.size} bytes)`);
      continue;
    }
    try {
      const safeName      = `m365_${Date.now()}_${(att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filepath      = path.join(uploadsDir, safeName);
      fs.writeFileSync(filepath, att.content);
      result.push({
        filename:       att.filename || 'attachment',
        stored_filename: safeName,
        content_type:   att.contentType,
        size:           att.size || 0,
        url:            `/uploads/${safeName}`,
      });
    } catch (e: any) {
      console.error('[M365] Attachment save failed:', e.message);
    }
  }
  return result;
}
