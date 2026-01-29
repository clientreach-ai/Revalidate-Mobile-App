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

let initPromise: Promise<any> | null = null;

async function getDatabase(): Promise<any> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log('[OfflineStorage] Initializing database...');
        const database = await SQLite.openDatabaseAsync(DB_NAME);

        await database.execAsync(`
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

        db = database;
        console.log('[OfflineStorage] Database initialized successfully');
        return database;
      } catch (error) {
        console.error('[OfflineStorage] Database initialization failed:', error);
        initPromise = null; // Allow retry on next call
        throw error;
      }
    })();
  }

  return initPromise;
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
  const result = await database.getAllAsync(
    `SELECT * FROM offline_operations 
     WHERE status = 'pending' OR status = 'failed'
     ORDER BY timestamp ASC
     LIMIT 50`
  ) as any[];

  return result.map((row: any) => ({
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
  const result = await database.getFirstAsync(
    'SELECT value FROM offline_data WHERE key = ?',
    [key]
  ) as { value: string } | null;

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
  const result = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM offline_operations WHERE status = "pending" OR status = "failed"'
  ) as { count: number } | null;
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

// ==========================================
// User Data Caching for Premium Offline Mode
// ==========================================

const USER_PROFILE_KEY = 'user_profile';
const USER_STATS_KEY = 'user_stats';
const CPD_LOGS_KEY = 'cpd_logs';
const PRACTICE_HOURS_KEY = 'practice_hours';

export interface CachedUserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  professionalRole?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  onboardingCompleted?: boolean;
  cachedAt: number;
}

export async function cacheUserProfile(profile: Omit<CachedUserProfile, 'cachedAt'>): Promise<void> {
  await saveOfflineData(USER_PROFILE_KEY, {
    ...profile,
    cachedAt: Date.now(),
  });
}

export async function getCachedUserProfile(): Promise<CachedUserProfile | null> {
  return getOfflineData<CachedUserProfile>(USER_PROFILE_KEY);
}

export async function cacheUserStats(stats: any): Promise<void> {
  await saveOfflineData(USER_STATS_KEY, {
    ...stats,
    cachedAt: Date.now(),
  });
}

export async function getCachedUserStats(): Promise<any> {
  return getOfflineData(USER_STATS_KEY);
}

export async function cacheCPDLogs(logs: any[]): Promise<void> {
  await saveOfflineData(CPD_LOGS_KEY, {
    logs,
    cachedAt: Date.now(),
  });
}

export async function getCachedCPDLogs(): Promise<{ logs: any[]; cachedAt: number } | null> {
  return getOfflineData(CPD_LOGS_KEY);
}

export async function cachePracticeHours(hours: any[]): Promise<void> {
  await saveOfflineData(PRACTICE_HOURS_KEY, {
    hours,
    cachedAt: Date.now(),
  });
}

export async function getCachedPracticeHours(): Promise<{ hours: any[]; cachedAt: number } | null> {
  return getOfflineData(PRACTICE_HOURS_KEY);
}

export async function clearUserCache(): Promise<void> {
  await deleteOfflineData(USER_PROFILE_KEY);
  await deleteOfflineData(USER_STATS_KEY);
  await deleteOfflineData(CPD_LOGS_KEY);
  await deleteOfflineData(PRACTICE_HOURS_KEY);
}
