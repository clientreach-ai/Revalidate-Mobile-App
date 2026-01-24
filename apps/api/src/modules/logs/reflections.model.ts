/**
 * Reflective accounts model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface ReflectiveAccount {
  id: number;
  user_id: number;
  reflection_date: string;
  reflection_text?: string;
  document_ids?: string; // JSON array of document IDs
  created_at: string;
  updated_at: string;
}

export interface CreateReflectiveAccount {
  reflection_date: string;
  reflection_text?: string;
  document_ids?: number[];
}

export interface UpdateReflectiveAccount {
  reflection_date?: string;
  reflection_text?: string;
  document_ids?: number[];
}

export async function createReflectiveAccount(
  userId: string,
  data: CreateReflectiveAccount
): Promise<ReflectiveAccount> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    `INSERT INTO reflective_accounts (
      user_id, reflection_date, reflection_text, document_ids, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.reflection_date,
      data.reflection_text || null,
      data.document_ids ? JSON.stringify(data.document_ids) : null,
    ]
  ) as any;

  const [reflection] = await pool.execute(
    'SELECT * FROM reflective_accounts WHERE id = ?',
    [result.insertId]
  ) as any[];

  return reflection[0] as ReflectiveAccount;
}

export async function getReflectiveAccountById(
  reflectionId: string,
  userId: string
): Promise<ReflectiveAccount | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM reflective_accounts WHERE id = ? AND user_id = ?',
    [reflectionId, userId]
  ) as any[];

  return results.length > 0 ? results[0] as ReflectiveAccount : null;
}

export async function getUserReflectiveAccounts(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ reflectiveAccounts: ReflectiveAccount[]; total: number }> {
  const pool = getMySQLPool();

  let query = 'SELECT * FROM reflective_accounts WHERE user_id = ?';
  const params: any[] = [userId];

  if (options?.startDate) {
    query += ' AND reflection_date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND reflection_date <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY reflection_date DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [reflectiveAccounts] = await pool.execute(query, params) as any[];

  let countQuery = 'SELECT COUNT(*) as total FROM reflective_accounts WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND reflection_date >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND reflection_date <= ?';
    countParams.push(options.endDate);
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return { reflectiveAccounts: reflectiveAccounts as ReflectiveAccount[], total };
}

export async function updateReflectiveAccount(
  reflectionId: string,
  userId: string,
  updates: UpdateReflectiveAccount
): Promise<ReflectiveAccount> {
  const pool = getMySQLPool();

  const existing = await getReflectiveAccountById(reflectionId, userId);
  if (!existing) {
    throw new ApiError(404, 'Reflective account entry not found');
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.reflection_date !== undefined) {
    fields.push('reflection_date = ?');
    values.push(updates.reflection_date);
  }
  if (updates.reflection_text !== undefined) {
    fields.push('reflection_text = ?');
    values.push(updates.reflection_text || null);
  }
  if (updates.document_ids !== undefined) {
    fields.push('document_ids = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(reflectionId, userId);

  await pool.execute(
    `UPDATE reflective_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  const updated = await getReflectiveAccountById(reflectionId, userId);
  if (!updated) {
    throw new ApiError(404, 'Reflective account entry not found after update');
  }

  return updated;
}

export async function deleteReflectiveAccount(
  reflectionId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    'DELETE FROM reflective_accounts WHERE id = ? AND user_id = ?',
    [reflectionId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Reflective account entry not found');
  }
}
