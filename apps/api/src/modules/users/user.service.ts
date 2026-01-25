import { prisma } from '../../lib/prisma';
import { ApiError } from '../../common/middleware/error-handler';
import { User, UpdateUserProfile, ROLE_REQUIREMENTS } from './user.model';
import { mapUserRow, mapUserToDb } from '../../config/database-mapping';

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const user = await prisma.users.findUnique({
    where: { id: parseInt(userId) },
  });

  if (!user) {
    return null;
  }

  return mapUserRow(user) as User;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.users.findFirst({
    where: { email },
  });

  if (!user) {
    return null;
  }

  return mapUserRow(user) as User;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserProfile
): Promise<User> {
  // Map updates to database column names
  const dbUpdates = mapUserToDb(updates);
  
  // Build update object
  const updateData: any = {};

  if (dbUpdates.registration !== undefined) {
    updateData.registration = dbUpdates.registration;
  }
  if (dbUpdates.due_date !== undefined) {
    updateData.due_date = dbUpdates.due_date;
  }
  if (dbUpdates.reg_type !== undefined) {
    updateData.reg_type = dbUpdates.reg_type;
  }
  if (dbUpdates.work_settings !== undefined) {
    updateData.work_settings = dbUpdates.work_settings || null;
  }
  if (dbUpdates.scope_practice !== undefined) {
    updateData.scope_practice = dbUpdates.scope_practice || null;
  }
  if (dbUpdates.subscription_tier !== undefined) {
    updateData.subscription_tier = dbUpdates.subscription_tier;
  }
  if (dbUpdates.subscription_status !== undefined) {
    updateData.subscription_status = dbUpdates.subscription_status;
  }
  if (dbUpdates.trial_ends_at !== undefined) {
    updateData.trial_ends_at = dbUpdates.trial_ends_at;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  updateData.updated_at = new Date();

  const updated = await prisma.users.update({
    where: { id: parseInt(userId) },
    data: updateData,
  });

  return mapUserRow(updated) as User;
}

/**
 * Delete user account
 * Handles cascading deletes for all related user data
 */
export async function deleteUser(userId: string): Promise<void> {
  const userIdNum = parseInt(userId);
  
  // Get user email first to clean up OTPs
  const user = await prisma.users.findUnique({
    where: { id: userIdNum },
    select: { email: true },
  });
  
  // Use Prisma transaction to delete all user data atomically
  await prisma.$transaction(async (tx) => {
    // Delete user's data from all related tables
    await tx.work_hours.deleteMany({ where: { user_id: userIdNum } });
    await tx.working_hours.deleteMany({ where: { user_id: userIdNum } });
    await tx.cpd_hours.deleteMany({ where: { user_id: userIdNum } });
    await tx.feedback_log.deleteMany({ where: { user_id: userIdNum } });
    await tx.user_feedback_logs.deleteMany({ where: { user_id: userIdNum } });
    await tx.reflective_accounts.deleteMany({ where: { user_id: userIdNum } });
    await tx.reflective_account_forms.deleteMany({ where: { user_id: userIdNum } });
    await tx.appraisal_records.deleteMany({ where: { user_id: userIdNum } });
    await tx.user_calendars.deleteMany({ where: { user_id: userIdNum } });
    await tx.user_calendars_old.deleteMany({ where: { user_id: userIdNum } });
    await tx.personal_documents.deleteMany({ where: { user_id: userIdNum } });
    await tx.user_documents.deleteMany({ where: { user_id: userIdNum } });
    await tx.addressbooks.deleteMany({ where: { user_id: userIdNum } });
    await tx.attendances.deleteMany({ where: { user_id: userIdNum } });
    await tx.discussions.deleteMany({ where: { user_id: userIdNum } });
    await tx.earnings.deleteMany({ where: { user_id: userIdNum } });
    await tx.logs.deleteMany({ where: { user_id: userIdNum } });
    await tx.notifications.deleteMany({ where: { user_id: userIdNum } });
    
    // Clean up OTPs if user email exists
    if (user?.email) {
      await tx.email_otps.deleteMany({ where: { email: user.email } });
    }
    
    // Finally delete the user
    await tx.users.delete({ where: { id: userIdNum } });
  });
}

/**
 * Get role-specific requirements
 * Handles undefined/null roles gracefully
 */
export function getRoleRequirements(role?: string | null) {
  if (!role) {
    return ROLE_REQUIREMENTS.other;
  }
  return ROLE_REQUIREMENTS[role as keyof typeof ROLE_REQUIREMENTS] || ROLE_REQUIREMENTS.other;
}

/**
 * Register a new user (creates unverified user)
 */
export async function registerUser(email: string, passwordHash: string): Promise<{ id: number; email: string }> {
  // Check if user already exists
  const existingUser = await prisma.users.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, 'User already exists. Please login instead.');
  }

  // Create user (unverified, status = '0' means inactive/unverified)
  const user = await prisma.users.create({
    data: {
      email,
      password: passwordHash,
      name: email.split('@')[0],
      reg_type: 'email',
    },
  });

  return {
    id: user.id,
    email: user.email,
  };
}
