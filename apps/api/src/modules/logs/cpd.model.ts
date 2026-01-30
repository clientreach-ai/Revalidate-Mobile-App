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
  learning_method?: string;
  cpd_learning_type?: string;
  link_to_standard?: string;
  link_to_standard_proficiency?: string;
  document_ids?: string; // JSON array of document IDs
  created_at: string;
  updated_at: string;
}

export interface CreateCpdHours {
  activity_date: string;
  duration_minutes: number;
  training_name: string;
  activity_type: 'participatory' | 'non-participatory';
  learning_method: string;
  cpd_learning_type: string;
  link_to_standard?: string;
  link_to_standard_proficiency?: string;
  document_ids?: number[];
}

export interface UpdateCpdHours {
  activity_date?: string;
  duration_minutes?: number;
  training_name?: string;
  activity_type?: 'participatory' | 'non-participatory';
  learning_method?: string;
  cpd_learning_type?: string;
  link_to_standard?: string;
  link_to_standard_proficiency?: string;
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
      user_id, date, duration_minutes, topic, 
      method, learning_type, link_code, standards_proficiency,
      participatory_hours, document, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      data.activity_date,
      data.duration_minutes,
      data.training_name,
      data.learning_method,
      data.cpd_learning_type,
      data.link_to_standard || null,
      data.link_to_standard_proficiency || null,
      // Map activity_type to participatory_hours (string column in DB)
      data.activity_type === 'participatory' ? String(data.duration_minutes) : '0',
      data.document_ids ? JSON.stringify(data.document_ids) : null,
    ]
  ) as any;

  const [rows] = await pool.execute(
    'SELECT * FROM cpd_hours WHERE id = ?',
    [result.insertId]
  ) as any[];

  // Map result back to CpdHours interface
  const row = rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    activity_date: row.date,
    duration_minutes: row.duration_minutes,
    training_name: row.topic,
    activity_type: parseInt(row.participatory_hours) > 0 ? 'participatory' : 'non-participatory',
    learning_method: row.method,
    cpd_learning_type: row.learning_type,
    link_to_standard: row.link_code,
    link_to_standard_proficiency: row.standards_proficiency,
    document_ids: row.document,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as any;
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

  const row = results[0];
  return {
    id: row.id,
    user_id: row.user_id,
    activity_date: row.date,
    duration_minutes: row.duration_minutes,
    training_name: row.topic,
    activity_type: parseInt(row.participatory_hours) > 0 ? 'participatory' : 'non-participatory',
    learning_method: row.method,
    cpd_learning_type: row.learning_type,
    link_to_standard: row.link_code,
    link_to_standard_proficiency: row.standards_proficiency,
    document_ids: row.document,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as CpdHours;
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
    query += ' AND date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    query += ' AND date <= ?';
    params.push(options.endDate);
  }
  if (options?.activityType) {
    if (options.activityType === 'participatory') {
      query += ' AND CAST(participatory_hours AS UNSIGNED) > 0';
    } else {
      query += ' AND (participatory_hours IS NULL OR participatory_hours = "0")';
    }
  }

  query += ' ORDER BY date DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const [rows] = await pool.execute(query, params) as any[];

  // Map results back to CpdHours interface
  const cpdHours = rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    activity_date: row.date,
    duration_minutes: row.duration_minutes,
    training_name: row.topic,
    activity_type: parseInt(row.participatory_hours) > 0 ? 'participatory' : 'non-participatory',
    learning_method: row.method,
    cpd_learning_type: row.learning_type,
    link_to_standard: row.link_code,
    link_to_standard_proficiency: row.standards_proficiency,
    document_ids: row.document,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM cpd_hours WHERE user_id = ?';
  const countParams: any[] = [userId];
  if (options?.startDate) {
    countQuery += ' AND date >= ?';
    countParams.push(options.startDate);
  }
  if (options?.endDate) {
    countQuery += ' AND date <= ?';
    countParams.push(options.endDate);
  }
  if (options?.activityType) {
    if (options.activityType === 'participatory') {
      countQuery += ' AND CAST(participatory_hours AS UNSIGNED) > 0';
    } else {
      countQuery += ' AND (participatory_hours IS NULL OR participatory_hours = "0")';
    }
  }

  const [countResult] = await pool.execute(countQuery, countParams) as any[];
  const total = countResult[0].total;

  return {
    cpdHours: cpdHours as any[],
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
    fields.push('date = ?');
    values.push(updates.activity_date);
  }
  if (updates.duration_minutes !== undefined) {
    fields.push('duration_minutes = ?');
    values.push(updates.duration_minutes);
    // If updating duration, we might need to update participatory_hours if type is fixed or provided
    if (updates.activity_type === undefined) {
      // Keep existing logic: if it was participatory, update the hours field
      const wasParticipatory = (existing as any).activity_type === 'participatory';
      fields.push('participatory_hours = ?');
      values.push(wasParticipatory ? String(updates.duration_minutes) : '0');
    }
  }
  if (updates.training_name !== undefined) {
    fields.push('topic = ?');
    values.push(updates.training_name);
  }
  if (updates.activity_type !== undefined) {
    fields.push('participatory_hours = ?');
    const mins = updates.duration_minutes || (existing as any).duration_minutes;
    values.push(updates.activity_type === 'participatory' ? String(mins) : '0');
  }
  if (updates.document_ids !== undefined) {
    fields.push('document = ?');
    values.push(updates.document_ids.length > 0 ? JSON.stringify(updates.document_ids) : null);
  }
  if (updates.learning_method !== undefined) {
    fields.push('method = ?');
    values.push(updates.learning_method);
  }
  if (updates.cpd_learning_type !== undefined) {
    fields.push('learning_type = ?');
    values.push(updates.cpd_learning_type);
  }
  if (updates.link_to_standard !== undefined) {
    fields.push('link_code = ?');
    values.push(updates.link_to_standard);
  }
  if (updates.link_to_standard_proficiency !== undefined) {
    fields.push('standards_proficiency = ?');
    values.push(updates.link_to_standard_proficiency);
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
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  if (activityType) {
    if (activityType === 'participatory') {
      query += ' AND CAST(participatory_hours AS UNSIGNED) > 0';
    } else {
      query += ' AND (participatory_hours IS NULL OR participatory_hours = "0")';
    }
  }

  const [results] = await pool.execute(query, params) as any[];
  return Math.round(results[0].total_minutes / 60); // Convert to hours
}
