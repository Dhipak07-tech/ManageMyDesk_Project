import mysql from 'mysql2/promise';
import { config as loadEnv } from "dotenv";
import path from "path";
import fs from "fs";

loadEnv();

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'connectit_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool: mysql.Pool | null = null;
let sqliteDb: any = null;
let useSQLite = false;

export async function getSQLiteDb() {
  if (!sqliteDb) {
    const { open } = await import('sqlite');
    const sqlite3Module = await import('sqlite3');
    const sqlite3 = sqlite3Module.default || sqlite3Module;
    sqliteDb = await open({
      filename: './timesheet.sqlite',
      driver: sqlite3.Database
    });
  }
  return sqliteDb;
}

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export function setUseSQLite(val: boolean) {
  useSQLite = val;
}

export async function query(sql: string, values?: any[]): Promise<any[]> {
  // Check if we should use SQLite (fallback)
  if (useSQLite) {
    const db = await getSQLiteDb();
    return await db.all(sql, values || []);
  }
  
  try {
    const [rows] = await getPool().execute(sql, values);
    return rows as any[];
  } catch (err: any) {
    console.error('[DB Query Error]', err.message);
    // If MySQL fails and we haven't explicitly set useSQLite, try SQLite as a last resort
    if (!useSQLite) {
        try {
            const db = await getSQLiteDb();
            return await db.all(sql, values || []);
        } catch (e) {
            throw err;
        }
    }
    throw err;
  }
}

export async function execute(sql: string, values?: any[]): Promise<any> {
  if (useSQLite) {
    const db = await getSQLiteDb();
    const result = await db.run(sql, values || []);
    return { insertId: result.lastID, affectedRows: result.changes };
  }
  
  try {
    const [result] = await getPool().execute(sql, values);
    return result as mysql.ResultSetHeader;
  } catch (err: any) {
    console.error('[DB Execute Error]', err.message);
    if (!useSQLite) {
        try {
            const db = await getSQLiteDb();
            const result = await db.run(sql, values || []);
            return { insertId: result.lastID, affectedRows: result.changes };
        } catch (e) {
            throw err;
        }
    }
    throw err;
  }
}

export function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
