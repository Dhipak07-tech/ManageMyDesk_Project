/**
 * Microsoft 365 Email Monitor Dashboard
 * Route: /m365-monitor
 * Access: Admin / Super Admin / Ultra Super Admin
 *
 * Zero-config — auto-refreshes from the server-side auto-init.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Mail, CheckCircle, XCircle, RefreshCw, Send, Inbox, AlertTriangle,
  Clock, Activity, Shield, Wifi, WifiOff, ArrowDownToLine, ArrowUpFromLine,
  Server, Database, Zap, ChevronDown, ChevronUp, Info, Play,
  HelpCircle, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Health {
  status:       "healthy" | "degraded" | "unreachable";
  smtp:         { connected: boolean | null; host: string; port: number; error: string | null };
  imap:         { connected: boolean | null; host: string; port: number; error: string | null };
  stats:        { sent_24h: number; received_24h: number; failed_24h: number };
  lastPollTime: string | null;
  queuePending: number;
  queueFailed:  number;
  startupStatus?: {
    envWritten:  boolean;
    dbSeeded:    boolean;
    smtpOk:      boolean | null;
    imapOk:      boolean | null;
    smtpError:   string | null;
    imapError:   string | null;
    startedAt:   string;
    lastPollAt:  string | null;
    pollCount:   number;
  };
}

interface Stats {
  emails_received_today: number;
  emails_sent_today:     number;
  failed_emails_today:   number;
  queue_pending:         number;
  queue_failed:          number;
  queue_sent:            number;
}

interface AuditLog {
  id:            number;
  event_type:    string;
  direction:     string;
  status:        string;
  ticket_number?: string;
  sender?:       string;
  recipient?:    string;
  subject?:      string;
  error_msg?:    string;
  created_at:    string;
}

// ─── Inline-style badge helpers (immune to CSS overrides) ─────────────────────
const badge = {
  healthy:     { backgroundColor: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)"  },
  degraded:    { backgroundColor: "rgba(234,179,8,0.15)",  color: "#fbbf24", border: "1px solid rgba(234,179,8,0.35)"  },
  unreachable: { backgroundColor: "rgba(239,68,68,0.15)",  color: "#f87171", border: "1px solid rgba(239,68,68,0.35)"  },
  success:     { backgroundColor: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)"  },
  sent:        { backgroundColor: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)"  },
  failed:      { backgroundColor: "rgba(239,68,68,0.15)",  color: "#f87171", border: "1px solid rgba(239,68,68,0.35)"  },
  inbound:     { backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.35)" },
  outbound:    { backgroundColor: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.35)" },
  neutral:     { backgroundColor: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.25)" },
} as const;

function statusStyle(s: string) {
  if (s in badge) return badge[s as keyof typeof badge];
  return badge.neutral;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function M365EmailMonitor() {
  const { profile } = useAuth();

  const [health,     setHealth]     = useState<Health | null>(null);
  const [stats,      setStats]      = useState<Stats  | null>(null);
  const [auditLogs,  setAuditLogs]  = useState<AuditLog[]>([]);
  const [emailLogs,  setEmailLogs]  = useState<any[]>([]);
  const [config,     setConfig]     = useState<any>(null);

  const [refreshing,   setRefreshing]   = useState(false);
  const [testingSmtp,  setTestingSmtp]  = useState(false);
  const [testingImap,  setTestingImap]  = useState(false);
  const [sendingTest,  setSendingTest]  = useState(false);
  const [polling,      setPolling]      = useState(false);

  const [smtpResult,  setSmtpResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [imapResult,  setImapResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [sendResult,  setSendResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [pollMsg,     setPollMsg]     = useState<string | null>(null);

  const [testEmail,   setTestEmail]   = useState("");
  const [logsExpand,  setLogsExpand]  = useState(true);
  const [logTab,      setLogTab]      = useState<"all" | "inbound" | "outbound" | "failed">("all");

  const isAdmin = ["admin", "super_admin", "ultra_super_admin"].includes(profile?.role ?? "");

  // ── Fetch helpers ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [h, s, a, e, c] = await Promise.allSettled([
      fetch("/api/m365/health").then(r => r.ok ? r.json() : null),
      fetch("/api/m365/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/m365/audit-logs?limit=150").then(r => r.ok ? r.json() : []),
      fetch("/api/email/logs?limit=50").then(r => r.ok ? r.json() : []),
      fetch("/api/m365/config").then(r => r.ok ? r.json() : null),
    ]);
    if (h.status === "fulfilled" && h.value) setHealth(h.value);
    if (s.status === "fulfilled" && s.value) setStats(s.value);
    if (a.status === "fulfilled") setAuditLogs(a.value ?? []);
    if (e.status === "fulfilled") setEmailLogs(e.value ?? []);
    if (c.status === "fulfilled" && c.value) setConfig(c.value);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Auto-refresh every 30 s
  useEffect(() => {
    if (!isAdmin) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [isAdmin, load]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const doTestSmtp = async () => {
    setTestingSmtp(true); setSmtpResult(null);
    try {
      const r = await fetch("/api/m365/test-smtp", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      setSmtpResult({ ok: d.ok, msg: d.msg || d.error || "Done" });
      await load();
    } catch (e: any) { setSmtpResult({ ok: false, msg: e.message }); }
    setTestingSmtp(false);
  };

  const doTestImap = async () => {
    setTestingImap(true); setImapResult(null);
    try {
      const r = await fetch("/api/m365/test-imap", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      setImapResult({ ok: d.ok, msg: d.msg || d.error || "Done" });
      await load();
    } catch (e: any) { setImapResult({ ok: false, msg: e.message }); }
    setTestingImap(false);
  };

  const doSendTest = async () => {
    setSendingTest(true); setSendResult(null);
    try {
      const r = await fetch("/api/m365/send-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail || undefined }),
      });
      const d = await r.json();
      setSendResult({ ok: d.ok ?? false, msg: d.messageId ? `✓ Sent (${d.messageId})` : (d.error || d.msg || "Done") });
      await load();
    } catch (e: any) { setSendResult({ ok: false, msg: e.message }); }
    setSendingTest(false);
  };

  const doPoll = async () => {
    setPolling(true); setPollMsg(null);
    try {
      const r = await fetch("/api/m365/poll-now", { method: "POST" });
      const d = await r.json();
      setPollMsg(d.message || "Poll triggered.");
      setTimeout(() => load(), 4000);
    } catch (e: any) { setPollMsg(`Error: ${e.message}`); }
    setPolling(false);
  };

  // ─── Guard ────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground opacity-20" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Administrator access required.</p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(l => {
    if (logTab === "all")      return true;
    if (logTab === "failed")   return l.status === "failed";
    if (logTab === "inbound")  return l.direction === "inbound";
    if (logTab === "outbound") return l.direction === "outbound";
    return true;
  });

  const su = health?.startupStatus;

  // ─── Status icon helper ───────────────────────────────────────────────────────
  const ConnIcon = ({ ok }: { ok: boolean | null }) =>
    ok === true  ? <CheckCircle2  className="w-5 h-5 text-green-500" /> :
    ok === false ? <XCircle       className="w-5 h-5 text-red-500"   /> :
                   <HelpCircle    className="w-5 h-5 text-yellow-400" />;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: "rgba(0,120,212,0.15)" }}>
            <Mail className="w-5 h-5" style={{ color: "#0078d4" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Microsoft 365 Email Monitor</h1>
            <p className="text-sm text-muted-foreground">
              support@technosprint.net &nbsp;·&nbsp; Auto-configured &nbsp;·&nbsp; Zero manual setup
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall health pill */}
          {health && (
            <span style={statusStyle(health.status)}
                  className="text-xs font-bold px-3 py-1 rounded-full capitalize">
              {health.status}
            </span>
          )}
          <button onClick={refresh} disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Startup Status Banner ─────────────────────────────────────────── */}
      {su && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "#0078d4" }} />
            <span className="font-semibold text-sm">Auto-Init Status</span>
            <span className="text-xs text-muted-foreground ml-1">
              Started {su.startedAt ? new Date(su.startedAt).toLocaleString() : "—"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: ".env Written",   ok: su.envWritten,          desc: "Credentials in .env" },
              { label: "DB Seeded",      ok: su.dbSeeded,            desc: "Config in database"  },
              { label: "SMTP Verified",  ok: su.smtpOk,              desc: su.smtpError ?? "smtp.office365.com:587" },
              { label: "IMAP Verified",  ok: su.imapOk,              desc: su.imapError ?? "outlook.office365.com:993" },
              { label: "Polls Run",      ok: su.pollCount > 0,       desc: `${su.pollCount} polls completed` },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg">
                <ConnIcon ok={item.ok} />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mailbox / SMTP / IMAP / Last Sync cards ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Mailbox Health */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-2">
            Mailbox Status
          </div>
          <div className="flex items-center gap-2">
            {health?.status === "healthy"     ? <CheckCircle  className="w-5 h-5 text-green-500"  /> :
             health?.status === "degraded"    ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                                               <XCircle       className="w-5 h-5 text-red-500"    />}
            <span className="text-lg font-bold capitalize" style={{ color: health?.status === "healthy" ? "#4ade80" : health?.status === "degraded" ? "#fbbf24" : "#f87171" }}>
              {health?.status ?? "—"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">support@technosprint.net</div>
        </div>

        {/* SMTP */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-2 flex items-center gap-1">
            <Send className="w-3 h-3" /> SMTP Status
          </div>
          <div className="flex items-center gap-2">
            {health?.smtp.connected === true  ? <Wifi    className="w-5 h-5 text-green-500" /> :
             health?.smtp.connected === false ? <WifiOff className="w-5 h-5 text-red-500"   /> :
                                               <HelpCircle className="w-5 h-5 text-yellow-400" />}
            <span className="text-sm font-semibold"
                  style={{ color: health?.smtp.connected === true ? "#4ade80" : health?.smtp.connected === false ? "#f87171" : "#fbbf24" }}>
              {health?.smtp.connected === true ? "Connected" : health?.smtp.connected === false ? "Failed" : "Checking…"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">smtp.office365.com:587 · STARTTLS</div>
          {health?.smtp.error && (
            <div className="text-[10px] text-red-400 mt-1 truncate" title={health.smtp.error}>⚠ {health.smtp.error}</div>
          )}
        </div>

        {/* IMAP */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-2 flex items-center gap-1">
            <Inbox className="w-3 h-3" /> IMAP Status
          </div>
          <div className="flex items-center gap-2">
            {health?.imap.connected === true  ? <Wifi    className="w-5 h-5 text-green-500" /> :
             health?.imap.connected === false ? <WifiOff className="w-5 h-5 text-red-500"   /> :
                                               <HelpCircle className="w-5 h-5 text-yellow-400" />}
            <span className="text-sm font-semibold"
                  style={{ color: health?.imap.connected === true ? "#4ade80" : health?.imap.connected === false ? "#f87171" : "#fbbf24" }}>
              {health?.imap.connected === true ? "Connected" : health?.imap.connected === false ? "Failed" : "Checking…"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">outlook.office365.com:993 · SSL/TLS</div>
          {health?.imap.error && (
            <div className="text-[10px] text-red-400 mt-1 truncate" title={health.imap.error}>⚠ {health.imap.error}</div>
          )}
        </div>

        {/* Last Sync */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last Sync Time
          </div>
          <div className="text-sm font-semibold">
            {health?.lastPollTime ? new Date(health.lastPollTime).toLocaleTimeString() : "Not yet"}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {health?.lastPollTime ? new Date(health.lastPollTime).toLocaleDateString() : "IMAP polling runs every 60s"}
          </div>
        </div>
      </div>

      {/* ── Email Activity Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Received Today",  val: stats?.emails_received_today ?? health?.stats.received_24h ?? 0, Icon: ArrowDownToLine, col: "#60a5fa" },
          { label: "Sent Today",      val: stats?.emails_sent_today     ?? health?.stats.sent_24h     ?? 0, Icon: ArrowUpFromLine, col: "#4ade80" },
          { label: "Failed Emails",   val: stats?.failed_emails_today   ?? health?.stats.failed_24h   ?? 0, Icon: AlertTriangle,   col: "#f87171" },
          { label: "Queue Pending",   val: stats?.queue_pending  ?? health?.queuePending ?? 0,              Icon: Clock,           col: "#fbbf24" },
          { label: "Queue Failed",    val: stats?.queue_failed   ?? health?.queueFailed  ?? 0,              Icon: XCircle,         col: "#f87171" },
          { label: "Queue Sent",      val: stats?.queue_sent     ?? 0,                                      Icon: CheckCircle,     col: "#4ade80" },
        ].map(({ label, val, Icon, col }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-3">
            <Icon className="w-4 h-4 mb-1" style={{ color: col }} />
            <div className="text-xl font-bold">{val}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Active Configuration ──────────────────────────────────────────── */}
      {config && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Active M365 Configuration</span>
            <div className="ml-auto flex items-center gap-2">
              {config.config?.is_active   && <span style={badge.success} className="text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>}
              {config.config?.is_default  && <span style={badge.inbound} className="text-[10px] font-bold px-2 py-0.5 rounded-full">Default</span>}
              {config.startupStatus?.dbSeeded && <span style={badge.healthy} className="text-[10px] font-bold px-2 py-0.5 rounded-full">DB Seeded ✓</span>}
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Mailbox",         value: config.defaults?.email_address ?? "support@technosprint.net" },
              { label: "SMTP",            value: `${config.defaults?.smtp_host}:${config.defaults?.smtp_port}` },
              { label: "SMTP Encryption", value: config.defaults?.smtp_encryption ?? "STARTTLS" },
              { label: "IMAP",            value: `${config.defaults?.imap_host}:${config.defaults?.imap_port}` },
              { label: "IMAP Encryption", value: config.defaults?.imap_encryption ?? "SSL/TLS" },
              { label: "Provider",        value: "Microsoft 365" },
              { label: "DB Record ID",    value: config.config?.id ?? "Auto-created" },
              { label: "Last Updated",    value: config.config?.updated_at ? new Date(config.config.updated_at).toLocaleString() : "—" },
            ].map(r => (
              <div key={r.label}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{r.label}</div>
                <div className="font-medium mt-0.5 text-sm">{String(r.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connection Health Tests ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Test SMTP */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Test SMTP</span>
          </div>
          <p className="text-xs text-muted-foreground">Live verify smtp.office365.com:587 (STARTTLS)</p>
          <button onClick={doTestSmtp} disabled={testingSmtp}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
            {testingSmtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            {testingSmtp ? "Testing…" : "Run SMTP Test"}
          </button>
          {smtpResult && (
            <div style={statusStyle(smtpResult.ok ? "success" : "failed")} className="text-xs p-2 rounded-lg">
              {smtpResult.ok ? "✓" : "✗"} {smtpResult.msg}
            </div>
          )}
        </div>

        {/* Test IMAP */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Test IMAP</span>
          </div>
          <p className="text-xs text-muted-foreground">Live verify outlook.office365.com:993 (SSL/TLS)</p>
          <button onClick={doTestImap} disabled={testingImap}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
            {testingImap ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
            {testingImap ? "Testing…" : "Run IMAP Test"}
          </button>
          {imapResult && (
            <div style={statusStyle(imapResult.ok ? "success" : "failed")} className="text-xs p-2 rounded-lg">
              {imapResult.ok ? "✓" : "✗"} {imapResult.msg}
            </div>
          )}
        </div>

        {/* Send Test Email */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Send Test Email</span>
          </div>
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                 placeholder="recipient@example.com (leave blank = self)"
                 className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={doSendTest} disabled={sendingTest}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50">
            {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingTest ? "Sending…" : "Send Test Email"}
          </button>
          {sendResult && (
            <div style={statusStyle(sendResult.ok ? "success" : "failed")} className="text-xs p-2 rounded-lg">
              {sendResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* ── Manual Poll ───────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-semibold text-sm">Manual IMAP Poll</div>
            <div className="text-xs text-muted-foreground">
              Trigger an immediate check of the support@technosprint.net inbox.
              Auto-polls every 60 seconds.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={doPoll} disabled={polling}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#0078d4" }}>
            {polling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {polling ? "Polling…" : "Poll Inbox Now"}
          </button>
          {pollMsg && <span className="text-xs text-muted-foreground">{pollMsg}</span>}
        </div>
      </div>

      {/* ── Audit Log Table ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button onClick={() => setLogsExpand(!logsExpand)}
                className="w-full p-4 border-b border-border flex items-center justify-between hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">M365 Audit Log</span>
            <span className="text-xs text-muted-foreground">({auditLogs.length} events)</span>
          </div>
          {logsExpand ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {logsExpand && (
          <>
            <div className="flex items-center gap-1 p-3 border-b border-border">
              {(["all", "inbound", "outbound", "failed"] as const).map(t => (
                <button key={t} onClick={() => setLogTab(t)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors capitalize ${logTab === t ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  {t}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">{filteredLogs.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                    <th className="p-3">Time</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Direction</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Ticket</th>
                    <th className="p-3">From / To</th>
                    <th className="p-3">Subject / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                        No audit events yet — startup events will appear here automatically.
                      </td>
                    </tr>
                  ) : filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-xs font-medium capitalize">
                        {l.event_type.replace(/_/g, " ")}
                      </td>
                      <td className="p-3">
                        <span style={statusStyle(l.direction)} className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                          {l.direction}
                        </span>
                      </td>
                      <td className="p-3">
                        <span style={statusStyle(l.status)} className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-mono">{l.ticket_number ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">
                        {l.direction === "inbound" ? l.sender : (l.recipient ?? "—")}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">
                        {l.subject ?? (l.error_msg ? `⚠ ${l.error_msg}` : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── All-provider Email Logs ───────────────────────────────────────── */}
      {emailLogs.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">All Email Activity</span>
            <span className="text-xs text-muted-foreground">({emailLogs.length} records)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                  <th className="p-3">Time</th>
                  <th className="p-3">Direction</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Recipient / Sender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {emailLogs.slice(0, 25).map((l: any) => (
                  <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3">
                      <span style={statusStyle(l.direction)} className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {l.direction}
                      </span>
                    </td>
                    <td className="p-3 text-xs capitalize">{l.email_type?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="p-3">
                      <span style={statusStyle(l.status)} className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono">{l.ticket_number ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">
                      {l.direction === "inbound" ? l.sender : (l.recipient ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Info Banner ───────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>
            <strong className="text-foreground">Zero-config setup:</strong> On every server start,
            the system automatically writes env vars, seeds the DB config, and validates connectivity.
            No manual steps required.
          </p>
          <p>
            <strong className="text-foreground">Incoming mail</strong> is polled every 60 seconds via
            IMAP from <strong>outlook.office365.com:993</strong> (SSL/TLS). New emails automatically
            create tickets or thread replies to existing ones.
          </p>
          <p>
            <strong className="text-foreground">Outgoing mail</strong> is queued and dispatched through
            <strong> smtp.office365.com:587</strong> (STARTTLS). The queue processes every 30 seconds
            with automatic retry (1m → 5m → 15m → 30m → 1h).
          </p>
          <p>
            <strong className="text-foreground">Two-way threading:</strong> replies with
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-[10px]">[INCxxxxxxx]</code>
            in the subject are linked to the existing ticket automatically.
          </p>
          <p>
            <strong className="text-foreground">Attachments:</strong> PDF, DOCX, XLSX, JPG, PNG, ZIP
            up to 10 MB are validated, virus-checked by type, and stored securely.
          </p>
        </div>
      </div>

    </div>
  );
}
