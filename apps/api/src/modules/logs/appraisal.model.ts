/**
 * Appraisal records model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface AppraisalRecord {
  id: number;
  user_id: number;
  appraisal_date: string;
  notes?: string;
  document_ids?: string; // JSON array of document IDs
  created_at: string;
  updated_at: string;
}

export interface CreateAppraisalRecord {
  appraisal_date: string;
  notes?: string;
  document_ids?: number[];
}

export interface UpdateAppraisalRecord {
  appraisal_date?: string;
  notes?: string;
  document_ids?: number[];
}

export async function createAppraisalRecord(
  userId: string,
  data: CreateAppraisalRecord
): Promise<AppraisalRecord> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    `INSERT INTO appraisal_records (
      user_id, appraisal_date, notes, document_ids, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.appraisal_date,
      data.notes || null,
      data.document_ids ? JSON.stringify(data.document_ids) : null,
    ]
  ) as any;

  const [appraisal] = await pool.execute(
    'SELECT * FROM appraisal_records WHERE id = ?',
    [result.insertId]
  ) as any[];

  return appraisal[0] as AppraisalRecord;
}

export async function getAppraisalRecordById(
  appraisalId: string,
  userId: string
): Promise<AppraisalRecord | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM appraisal_records WHERE id = ? AND user_id = ?',
    [appraisalId, userId]
  ) as any[];

  return results.length > 0 ? results[0] as AppraisalRecord : null;
}

export async function getUserAppraisalRecords(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ appraisalRecords: AppraisalRecord[]; total: number }> {
  const pool = getMySQLPool();

  let query = 'SELECT * FROM appraisal_records WHERE user_id = ?';
  const params: any[] = [userId];

  if (options?.startDate) {
    query += ' AND appraisal_date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND appraisal_date <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY appraisal_date DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [appraisalRecords] = await pool.execute(query, params) as any[];

  let countQuery = 'SELECT COUNT(*) as total FROM appraisal_records WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND appraisal_date >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND appraisal_date <= ?';
    countParams.push(options.endDate);
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return { appraisalRecords: appraisalRecords as AppraisalRecord[], total };
}

export async function updateAppraisalRecord(
  appraisalId: string,
  userId: string,
  updates: UpdateAppraisalRecord
): Promise<AppraisalRecord> {
  const pool = getMySQLPool();

  const existing = await getAppraisalRecordById(appraisalId, userId);
  if (!existing) {
    throw new ApiError(404, 'Appraisal record entry not found');
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.appraisal_date !== undefined) {
    fields.push('appraisal_date = ?');
    values.push(updates.appraisal_date);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes || null);
  }
  if (updates.document_ids !== undefined) {
    fields.push('document_ids = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(appraisalId, userId);

  await pool.execute(
    `UPDATE appraisal_records SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  const updated = await getAppraisalRecordById(appraisalId, userId);
  if (!updated) {
    throw new ApiError(404, 'Appraisal record entry not found after update');
  }

  return updated;
}

export async function deleteAppraisalRecord(
  appraisalId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    'DELETE FROM appraisal_records WHERE id = ? AND user_id = ?',
    [appraisalId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Appraisal record entry not found');
  }
}
