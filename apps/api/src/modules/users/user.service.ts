import { prisma } from '../../lib/prisma';
import { ApiError } from '../../common/middleware/error-handler';
import { 
  User, 
  UpdateUserProfile, 
  ROLE_REQUIREMENTS,
  OnboardingStep1Role,
  OnboardingStep2Personal,
  OnboardingStep3Professional,
  OnboardingStep4Plan,
  RegistrationProgress,
} from './user.model';
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

/**
 * Update onboarding step 1: Role selection
 */
export async function updateOnboardingStep1(userId: string, data: OnboardingStep1Role): Promise<User> {
  // Store professional role in description field as JSON
  const description = JSON.stringify({ professionalRole: data.professional_role });
  
  const updated = await prisma.users.update({
    where: { id: parseInt(userId) },
    data: {
      description,
      updated_at: new Date(),
    },
  });

  return mapUserRow(updated) as User;
}

/**
 * Update onboarding step 2: Personal details
 */
export async function updateOnboardingStep2(userId: string, data: OnboardingStep2Personal): Promise<User> {
  const userIdNum = parseInt(userId);
  
  // Check if email is already taken by another user
  const existingUser = await prisma.users.findFirst({
    where: {
      email: data.email,
      id: { not: userIdNum },
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered to another account');
  }

  const updateData: any = {
    name: data.name,
    email: data.email,
    mobile: data.phone_number,
    updated_at: new Date(),
  };

  const updated = await prisma.users.update({
    where: { id: userIdNum },
    data: updateData,
  });

  return mapUserRow(updated) as User;
}

/**
 * Update onboarding step 3: Professional details
 */
export async function updateOnboardingStep3(userId: string, data: OnboardingStep3Professional): Promise<User> {
  const updateData: any = {
    registration: data.gmc_registration_number,
    due_date: data.revalidation_date,
    updated_at: new Date(),
  };

  // Work setting and scope of practice (stored as Int in DB, but we accept string)
  if (data.work_setting !== undefined) {
    updateData.work_settings = data.work_setting ? parseInt(data.work_setting) || null : null;
  }
  if (data.scope_of_practice !== undefined) {
    updateData.scope_practice = data.scope_of_practice ? parseInt(data.scope_of_practice) || null : null;
  }

  // Numeric fields
  if (data.hourly_rate !== undefined) updateData.hourly_rate = data.hourly_rate;
  if (data.work_hours_completed_already !== undefined) updateData.hours_completed_already = data.work_hours_completed_already;
  if (data.training_hours_completed_already !== undefined) updateData.training_hours_completed_already = data.training_hours_completed_already;
  if (data.earned_current_financial_year !== undefined) updateData.earned = data.earned_current_financial_year;

  // Notepad field
  if (data.notepad !== undefined) updateData.notepad = data.notepad;

  // Store professional registrations, registration reference/pin, and brief description in description JSON
  // Get existing description to preserve other data (like professionalRole from step 1)
  const existingUser = await prisma.users.findUnique({
    where: { id: parseInt(userId) },
    select: { description: true },
  });

  let descriptionData: any = {};
  if (existingUser?.description) {
    try {
      descriptionData = typeof existingUser.description === 'string' 
        ? JSON.parse(existingUser.description) 
        : existingUser.description;
    } catch (e) {
      // If not JSON, start fresh but preserve any existing data if needed
      descriptionData = {};
    }
  }

  // Update description with new professional data
  if (data.professional_registrations !== undefined) {
    descriptionData.professionalRegistrations = data.professional_registrations;
  }
  if (data.registration_reference_pin !== undefined) {
    descriptionData.registrationReferencePin = data.registration_reference_pin;
  }
  if (data.brief_description_of_work !== undefined) {
    descriptionData.briefDescriptionOfWork = data.brief_description_of_work;
  }

  // Store as JSON string (preserves professionalRole from step 1 and adds new fields)
  updateData.description = JSON.stringify(descriptionData);

  const updated = await prisma.users.update({
    where: { id: parseInt(userId) },
    data: updateData,
  });

  return mapUserRow(updated) as User;
}

/**
 * Update onboarding step 4: Subscription plan
 */
export async function updateOnboardingStep4(userId: string, data: OnboardingStep4Plan): Promise<User> {
  const updateData: any = {
    subscription_tier: data.subscription_tier,
    subscription_status: data.subscription_tier === 'premium' ? 'trial' : 'active',
    updated_at: new Date(),
  };

  // Set trial end date if premium (30 days trial)
  if (data.subscription_tier === 'premium') {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    updateData.trial_ends_at = trialEndsAt;
  }

  const updated = await prisma.users.update({
    where: { id: parseInt(userId) },
    data: updateData,
  });

  return mapUserRow(updated) as User;
}

/**
 * Get registration progress
 */
export async function getRegistrationProgress(userId: string): Promise<RegistrationProgress> {
  const user = await prisma.users.findUnique({
    where: { id: parseInt(userId) },
    select: {
      description: true,
      name: true,
      email: true,
      mobile: true,
      registration: true,
      due_date: true,
      subscription_tier: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check step 1: Role selected
  let step1_role = false;
  if (user.description) {
    try {
      const desc = typeof user.description === 'string' ? JSON.parse(user.description) : user.description;
      step1_role = !!desc.professionalRole;
    } catch (e) {
      // Not JSON, check reg_type
    }
  }

  // Check step 2: Personal details (name, email, and phone_number)
  const step2_personal = !!(user.name && user.name.trim() !== '' && user.email && user.mobile);

  // Check step 3: Professional details
  const step3_professional = !!(user.registration && user.due_date);

  // Check step 4: Plan selected
  const step4_plan = !!user.subscription_tier;

  const completed = step1_role && step2_personal && step3_professional && step4_plan;

  // Determine current step
  let currentStep = 0;
  if (completed) {
    currentStep = 0; // All done
  } else if (!step1_role) {
    currentStep = 1;
  } else if (!step2_personal) {
    currentStep = 2;
  } else if (!step3_professional) {
    currentStep = 3;
  } else if (!step4_plan) {
    currentStep = 4;
  }

  return {
    step1_role,
    step2_personal,
    step3_professional,
    step4_plan,
    completed,
    currentStep,
  };
}
