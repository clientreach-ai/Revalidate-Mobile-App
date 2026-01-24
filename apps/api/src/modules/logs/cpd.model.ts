/**
 * CPD hours model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface CpdHours {
  id: number;
  user_id: number;
  activity_date: string;
  duration_minutes: number;
  training_name: string;
  activity_type: 'participatory' | 'non-participatory';
  document_ids?: string; // JSON array of document IDs
  created_at: string;
  updated_at: string;
}

export interface CreateCpdHours {
  activity_date: string;
  duration_minutes: number;
  training_name: string;
  activity_type: 'participatory' | 'non-participatory';
  document_ids?: number[];
}

export interface UpdateCpdHours {
  activity_date?: string;
  duration_minutes?: number;
  training_name?: string;
  activity_type?: 'participatory' | 'non-participatory';
  document_ids?: number[];
}

/**
 * Create CPD hours entry
 */
export async function createCpdHours(
  userId: string,
  data: CreateCpdHours
): Promise<CpdHours> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    `INSERT INTO cpd_hours (
      user_id, activity_date, duration_minutes, training_name, 
      activity_type, document_ids, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.activity_date,
      data.duration_minutes,
      data.training_name,
      data.activity_type,
      data.document_ids ? JSON.stringify(data.document_ids) : null,
    ]
  ) as any;

  const [cpdHours] = await pool.execute(
    'SELECT * FROM cpd_hours WHERE id = ?',
    [result.insertId]
  ) as any[];

  return cpdHours[0] as CpdHours;
}

/**
 * Get CPD hours by ID
 */
export async function getCpdHoursById(
  cpdHoursId: string,
  userId: string
): Promise<CpdHours | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM cpd_hours WHERE id = ? AND user_id = ?',
    [cpdHoursId, userId]
  ) as any[];

  if (results.length === 0) {
    return null;
  }

  return results[0] as CpdHours;
}

/**
 * Get all CPD hours for a user
 */
export async function getUserCpdHours(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    activityType?: 'participatory' | 'non-participatory';
  }
): Promise<{ cpdHours: CpdHours[]; total: number }> {
  const pool = getMySQLPool();

  let query = 'SELECT * FROM cpd_hours WHERE user_id = ?';
  const params: any[] = [userId];

  if (options?.startDate) {
    query += ' AND activity_date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND activity_date <= ?';
    params.push(options.endDate);
  }
  if (options?.activityType) {
    query += ' AND activity_type = ?';
    params.push(options.activityType);
  }

  query += ' ORDER BY activity_date DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [cpdHours] = await pool.execute(query, params) as any[];

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM cpd_hours WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND activity_date >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND activity_date <= ?';
    countParams.push(options.endDate);
  }
  if (options?.activityType) {
    countQuery += ' AND activity_type = ?';
    countParams.push(options.activityType);
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return {
    cpdHours: cpdHours as CpdHours[],
    total,
  };
}

/**
 * Update CPD hours entry
 */
export async function updateCpdHours(
  cpdHoursId: string,
  userId: string,
  updates: UpdateCpdHours
): Promise<CpdHours> {
  const pool = getMySQLPool();

  // Verify ownership
  const existing = await getCpdHoursById(cpdHoursId, userId);
  if (!existing) {
    throw new ApiError(404, 'CPD hours entry not found');
  }

  // Build update query
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.activity_date !== undefined) {
    fields.push('activity_date = ?');
    values.push(updates.activity_date);
  }
  if (updates.duration_minutes !== undefined) {
    fields.push('duration_minutes = ?');
    values.push(updates.duration_minutes);
  }
  if (updates.training_name !== undefined) {
    fields.push('training_name = ?');
    values.push(updates.training_name);
  }
  if (updates.activity_type !== undefined) {
    fields.push('activity_type = ?');
    values.push(updates.activity_type);
  }
  if (updates.document_ids !== undefined) {
    fields.push('document_ids = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(cpdHoursId, userId);

  await pool.execute(
    `UPDATE cpd_hours SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  const updated = await getCpdHoursById(cpdHoursId, userId);
  if (!updated) {
    throw new ApiError(404, 'CPD hours entry not found after update');
  }

  return updated;
}

/**
 * Delete CPD hours entry
 */
export async function deleteCpdHours(
  cpdHoursId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    'DELETE FROM cpd_hours WHERE id = ? AND user_id = ?',
    [cpdHoursId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'CPD hours entry not found');
  }
}

/**
 * Get total CPD hours for a user
 */
export async function getTotalCpdHours(
  userId: string,
  startDate?: string,
  endDate?: string,
  activityType?: 'participatory' | 'non-participatory'
): Promise<number> {
  const pool = getMySQLPool();

  let query = `
    SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes 
    FROM cpd_hours 
    WHERE user_id = ?
  `;
  const params: any[] = [userId];

  if (startDate) {
    query += ' AND activity_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND activity_date <= ?';
    params.push(endDate);
  }
  if (activityType) {
    query += ' AND activity_type = ?';
    params.push(activityType);
  }

  const [results] = await pool.execute(query, params) as any[];
  return Math.round(results[0].total_minutes / 60); // Convert to hours
}
