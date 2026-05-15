/**
 * MySQL Database Client for Node.js Backend
 * Replaces Firebase/Firestore connectivity
 */

import mysql from 'mysql2/promise';
import { config as loadEnv } from 'dotenv';

loadEnv();

// Database configuration from environment variables
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

// Connection pool
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log(`[MySQL] Connection pool created: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('[MySQL] Connection test successful');
    return true;
  } catch (error) {
    console.error('[MySQL] Connection test failed:', error);
    return false;
  }
}

export async function query(sql: string, values?: any[]): Promise<any[]> {
  const [rows] = await getPool().execute(sql, values);
  return rows as any[];
}

export async function execute(sql: string, values?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, values);
  return result as mysql.ResultSetHeader;
}

export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Helper to format dates for MySQL
export function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Helper to generate ticket numbers
export async function generateTicketNumber(): Promise<string> {
  const prefix = 'INC';
  const random = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${random}`;
}

// Re-export types for compatibility
export { mysql };
