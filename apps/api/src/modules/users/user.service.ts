import { getMySQLPool } from '../../config/database';
import { ApiError } from '../../common/middleware/error-handler';
import { User, UpdateUserProfile, ROLE_REQUIREMENTS } from './user.model';
import { mapUserRow, mapUserToDb } from '../../config/database-mapping';

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  ) as any[];

  if (users.length === 0) {
    return null;
  }

  return users[0] as User;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [email]
  ) as any[];

  if (users.length === 0) {
    return null;
  }

  return users[0] as User;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserProfile
): Promise<User> {
  const pool = getMySQLPool();

  // Map updates to database column names
  const dbUpdates = mapUserToDb(updates);
  
  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  if (dbUpdates.registration !== undefined) {
    fields.push('registration = ?');
    values.push(dbUpdates.registration);
  }
  if (dbUpdates.due_date !== undefined) {
    fields.push('due_date = ?');
    values.push(dbUpdates.due_date);
  }
  if (dbUpdates.reg_type !== undefined) {
    fields.push('reg_type = ?');
    values.push(dbUpdates.reg_type);
  }
  if (dbUpdates.work_settings !== undefined) {
    fields.push('work_settings = ?');
    values.push(dbUpdates.work_settings || null);
  }
  if (dbUpdates.scope_practice !== undefined) {
    fields.push('scope_practice = ?');
    values.push(dbUpdates.scope_practice || null);
  }
  if (dbUpdates.subscription_tier !== undefined) {
    fields.push('subscription_tier = ?');
    values.push(dbUpdates.subscription_tier);
  }
  if (dbUpdates.subscription_status !== undefined) {
    fields.push('subscription_status = ?');
    values.push(dbUpdates.subscription_status);
  }
  if (dbUpdates.trial_ends_at !== undefined) {
    fields.push('trial_ends_at = ?');
    values.push(dbUpdates.trial_ends_at);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  fields.push('updated_at = NOW()');
  values.push(userId);

  await pool.execute(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await getUserById(userId);
  if (!updated) {
    throw new ApiError(404, 'User not found after update');
  }

  return updated;
}

/**
 * Delete user account
 */
export async function deleteUser(userId: string): Promise<void> {
  const pool = getMySQLPool();

  // Start transaction to delete all user data
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Delete user's data from all tables
    await connection.execute('DELETE FROM work_hours WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM cpd_hours WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM feedback_log WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM reflective_accounts WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM appraisal_records WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM calendar_events WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM documents WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get role-specific requirements
 */
export function getRoleRequirements(role: string) {
  return ROLE_REQUIREMENTS[role as keyof typeof ROLE_REQUIREMENTS] || ROLE_REQUIREMENTS.other;
}
