/**
 * Feedback log model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface FeedbackLog {
  id: number;
  user_id: number;
  feedback_date: string;
  feedback_type: 'patient' | 'colleague';
  feedback_text?: string;
  document_ids?: string; // JSON array of document IDs
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackLog {
  feedback_date: string;
  feedback_type: 'patient' | 'colleague';
  feedback_text?: string;
  document_ids?: number[];
}

export interface UpdateFeedbackLog {
  feedback_date?: string;
  feedback_type?: 'patient' | 'colleague';
  feedback_text?: string;
  document_ids?: number[];
}

export async function createFeedbackLog(
  userId: string,
  data: CreateFeedbackLog
): Promise<FeedbackLog> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    `INSERT INTO feedback_log (
      user_id, feedback_date, feedback_type, feedback_text, 
      document_ids, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.feedback_date,
      data.feedback_type,
      data.feedback_text || null,
      data.document_ids ? JSON.stringify(data.document_ids) : null,
    ]
  ) as any;

  const [feedback] = await pool.execute(
    'SELECT * FROM feedback_log WHERE id = ?',
    [result.insertId]
  ) as any[];

  return feedback[0] as FeedbackLog;
}

export async function getFeedbackLogById(
  feedbackId: string,
  userId: string
): Promise<FeedbackLog | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM feedback_log WHERE id = ? AND user_id = ?',
    [feedbackId, userId]
  ) as any[];

  return results.length > 0 ? results[0] as FeedbackLog : null;
}

export async function getUserFeedbackLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    feedbackType?: 'patient' | 'colleague';
  }
): Promise<{ feedbackLogs: FeedbackLog[]; total: number }> {
  const pool = getMySQLPool();

  let query = 'SELECT * FROM feedback_log WHERE user_id = ?';
  const params: any[] = [userId];

  if (options?.startDate) {
    query += ' AND feedback_date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND feedback_date <= ?';
    params.push(options.endDate);
  }
  if (options?.feedbackType) {
    query += ' AND feedback_type = ?';
    params.push(options.feedbackType);
  }

  query += ' ORDER BY feedback_date DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [feedbackLogs] = await pool.execute(query, params) as any[];

  let countQuery = 'SELECT COUNT(*) as total FROM feedback_log WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND feedback_date >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND feedback_date <= ?';
    countParams.push(options.endDate);
  }
  if (options?.feedbackType) {
    countQuery += ' AND feedback_type = ?';
    countParams.push(options.feedbackType);
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return { feedbackLogs: feedbackLogs as FeedbackLog[], total };
}

export async function updateFeedbackLog(
  feedbackId: string,
  userId: string,
  updates: UpdateFeedbackLog
): Promise<FeedbackLog> {
  const pool = getMySQLPool();

  const existing = await getFeedbackLogById(feedbackId, userId);
  if (!existing) {
    throw new ApiError(404, 'Feedback log entry not found');
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.feedback_date !== undefined) {
    fields.push('feedback_date = ?');
    values.push(updates.feedback_date);
  }
  if (updates.feedback_type !== undefined) {
    fields.push('feedback_type = ?');
    values.push(updates.feedback_type);
  }
  if (updates.feedback_text !== undefined) {
    fields.push('feedback_text = ?');
    values.push(updates.feedback_text || null);
  }
  if (updates.document_ids !== undefined) {
    fields.push('document_ids = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(feedbackId, userId);

  await pool.execute(
    `UPDATE feedback_log SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  const updated = await getFeedbackLogById(feedbackId, userId);
  if (!updated) {
    throw new ApiError(404, 'Feedback log entry not found after update');
  }

  return updated;
}

export async function deleteFeedbackLog(
  feedbackId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    'DELETE FROM feedback_log WHERE id = ? AND user_id = ?',
    [feedbackId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Feedback log entry not found');
  }
}
