/**
 * Work hours model types and database operations
 */

import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';

export interface WorkHours {
  id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  work_description?: string;
  location?: string;
  shift_type?: string;
  hourly_rate?: number;
  total_earnings?: number;
  work_setting?: string;
  scope_of_practice?: string;
  document_ids?: string; // JSON array of document IDs
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkHours {
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  work_description?: string;
  location?: string;
  shift_type?: string;
  hourly_rate?: number;
  total_earnings?: number;
  work_setting?: string;
  scope_of_practice?: string;
  document_ids?: number[];
}

export interface UpdateWorkHours {
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  work_description?: string;
  location?: string;
  shift_type?: string;
  hourly_rate?: number;
  total_earnings?: number;
  work_setting?: string;
  scope_of_practice?: string;
  document_ids?: number[];
}

/**
 * Create a work hours entry
 */
export async function createWorkHours(
  userId: string,
  data: CreateWorkHours
): Promise<WorkHours> {
  const pool = getMySQLPool();

  // Calculate duration if not provided
  let duration = data.duration_minutes;
  if (!duration && data.end_time) {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
  }

  const [result] = await pool.execute(
    `INSERT INTO work_hours (
      user_id, start_time, end_time, duration_minutes, 
      work_description,
      document_ids, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.start_time,
      data.end_time || null,
      duration || null,
      data.work_description || null,
      data.document_ids ? JSON.stringify(data.document_ids) : null,
      !data.end_time, // Active if no end time
    ]
  ) as any;

  const [workHours] = await pool.execute(
    'SELECT * FROM work_hours WHERE id = ?',
    [result.insertId]
  ) as any[];

  return workHours[0] as WorkHours;
}

/**
 * Get work hours by ID
 */
export async function getWorkHoursById(
  workHoursId: string,
  userId: string
): Promise<WorkHours | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM work_hours WHERE id = ? AND user_id = ?',
    [workHoursId, userId]
  ) as any[];

  if (results.length === 0) {
    return null;
  }

  return results[0] as WorkHours;
}

/**
 * Get all work hours for a user
 */
export async function getUserWorkHours(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ workHours: WorkHours[]; total: number }> {
  const pool = getMySQLPool();

  let query = 'SELECT * FROM work_hours WHERE user_id = ?';
  const params: any[] = [userId];

  if (options?.startDate) {
    query += ' AND start_time >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND start_time <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY start_time DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [workHours] = await pool.execute(query, params) as any[];

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM work_hours WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND start_time >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND start_time <= ?';
    countParams.push(options.endDate);
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return {
    workHours: workHours as WorkHours[],
    total,
  };
}

/**
 * Get active work session for a user
 */
export async function getActiveWorkSession(userId: string): Promise<WorkHours | null> {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    'SELECT * FROM work_hours WHERE user_id = ? AND is_active = 1 ORDER BY start_time DESC LIMIT 1',
    [userId]
  ) as any[];

  if (results.length === 0) {
    return null;
  }

  return results[0] as WorkHours;
}

/**
 * Update work hours entry
 */
export async function updateWorkHours(
  workHoursId: string,
  userId: string,
  updates: UpdateWorkHours
): Promise<WorkHours> {
  const pool = getMySQLPool();

  // Verify ownership
  const existing = await getWorkHoursById(workHoursId, userId);
  if (!existing) {
    throw new ApiError(404, 'Work hours entry not found');
  }

  // Build update query
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.start_time !== undefined) {
    fields.push('start_time = ?');
    values.push(updates.start_time);
  }
  if (updates.end_time !== undefined) {
    fields.push('end_time = ?');
    values.push(updates.end_time);
    fields.push('is_active = 0');
  }
  if (updates.duration_minutes !== undefined) {
    fields.push('duration_minutes = ?');
    values.push(updates.duration_minutes);
  } else if ((updates.end_time || updates.start_time) && (updates.start_time || existing.start_time) && (updates.end_time || existing.end_time)) {
    // Calculate duration if either time is set and both become available
    const start = new Date(updates.start_time || existing.start_time);
    const end = new Date(updates.end_time || existing.end_time || '');
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
      fields.push('duration_minutes = ?');
      values.push(duration);
    }
  }
  if (updates.work_description !== undefined) {
    fields.push('work_description = ?');
    values.push(updates.work_description || null);
  }
  // Missing columns excluded as per user request
  // if (updates.location !== undefined) { ... }
  // if (updates.shift_type !== undefined) { ... }
  // if (updates.hourly_rate !== undefined) { ... }
  // if (updates.total_earnings !== undefined) { ... }
  // if (updates.work_setting !== undefined) { ... }
  // if (updates.scope_of_practice !== undefined) { ... }

  if (updates.document_ids !== undefined) {
    fields.push('document_ids = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(workHoursId, userId);

  await pool.execute(
    `UPDATE work_hours SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  const updated = await getWorkHoursById(workHoursId, userId);
  if (!updated) {
    throw new ApiError(404, 'Work hours entry not found after update');
  }

  return updated;
}

/**
 * Delete work hours entry
 */
export async function deleteWorkHours(
  workHoursId: string,
  userId: string
): Promise<void> {
  const pool = getMySQLPool();

  const [result] = await pool.execute(
    'DELETE FROM work_hours WHERE id = ? AND user_id = ?',
    [workHoursId, userId]
  ) as any;

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Work hours entry not found');
  }
}

/**
 * Get total work hours for a user
 */
export async function getTotalWorkHours(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  const pool = getMySQLPool();

  let query = `
    SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes 
    FROM work_hours 
    WHERE user_id = ? AND is_active = 0
  `;
  const params: any[] = [userId];

  if (startDate) {
    query += ' AND start_time >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND start_time <= ?';
    params.push(endDate);
  }

  const [results] = await pool.execute(query, params) as any[];
  return Math.round(results[0].total_minutes / 60); // Convert to hours
}
