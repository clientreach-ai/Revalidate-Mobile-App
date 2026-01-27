import { Platform } from 'react-native';

// Conditionally load expo-sqlite on native; provide a lightweight web stub to
// avoid bundler/wasm resolution errors when building for web.
let SQLite: any;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
} else {
  // Minimal in-memory stub implementing the methods used by the app.
  SQLite = {
    openDatabaseAsync: async (_name: string) => ({
      execAsync: async (_sql: string) => Promise.resolve(),
      runAsync: async (_sql: string, _args?: any[]) => ({ lastInsertRowId: 1 }),
      getAllAsync: async (_sql: string, _args?: any[]) => ([]),
      getFirstAsync: async (_sql: string, _args?: any[]) => null,
    }),
  };
}

const DB_NAME = 'revalidation_offline.db';

let db: any = null;

export interface OfflineOperation {
  id?: number;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface OfflineData {
  key: string;
  value: string;
  timestamp: number;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        data TEXT,
        headers TEXT,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      );
      
      CREATE TABLE IF NOT EXISTS offline_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_operations_status ON offline_operations(status);
      CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON offline_operations(timestamp);
    `);
  }
  return db;
}

export async function saveOfflineOperation(operation: Omit<OfflineOperation, 'id' | 'status'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO offline_operations (method, endpoint, data, headers, timestamp, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      operation.method,
      operation.endpoint,
      operation.data ? JSON.stringify(operation.data) : null,
      operation.headers ? JSON.stringify(operation.headers) : null,
      operation.timestamp,
      operation.retryCount || 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function getPendingOperations(): Promise<OfflineOperation[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<{
    id: number;
    method: string;
    endpoint: string;
    data: string | null;
    headers: string | null;
    timestamp: number;
    retry_count: number;
    status: string;
  }>(
    `SELECT * FROM offline_operations 
     WHERE status = 'pending' OR status = 'failed'
     ORDER BY timestamp ASC
     LIMIT 50`
  );

  return result.map(row => ({
    id: row.id,
    method: row.method as any,
    endpoint: row.endpoint,
    data: row.data ? JSON.parse(row.data) : undefined,
    headers: row.headers ? JSON.parse(row.headers) : undefined,
    timestamp: row.timestamp,
    retryCount: row.retry_count,
    status: row.status as any,
  }));
}

export async function updateOperationStatus(id: number, status: 'pending' | 'syncing' | 'synced' | 'failed', retryCount?: number): Promise<void> {
  const database = await getDatabase();
  if (retryCount !== undefined) {
    await database.runAsync(
      `UPDATE offline_operations 
       SET status = ?, retry_count = ?
       WHERE id = ?`,
      [status, retryCount, id]
    );
  } else {
    await database.runAsync(
      `UPDATE offline_operations 
       SET status = ?
       WHERE id = ?`,
      [status, id]
    );
  }
}

export async function deleteOperation(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM offline_operations WHERE id = ?', [id]);
}

export async function saveOfflineData(key: string, value: any): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_data (key, value, timestamp)
     VALUES (?, ?, ?)`,
    [key, JSON.stringify(value), Date.now()]
  );
}

export async function getOfflineData<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM offline_data WHERE key = ?',
    [key]
  );

  if (!result) return null;
  return JSON.parse(result.value) as T;
}

export async function deleteOfflineData(key: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM offline_data WHERE key = ?', [key]);
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM offline_operations;
    DELETE FROM offline_data;
  `);
}

export async function getOperationCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_operations WHERE status = "pending" OR status = "failed"'
  );
  return result?.count || 0;
}

export async function queueOperation(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
): Promise<void> {
  await saveOfflineOperation({
    method,
    endpoint,
    data,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
  });
}
