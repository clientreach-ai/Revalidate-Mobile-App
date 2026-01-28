import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  getUserById,
  updateUserProfile,
  deleteUser,
  getRoleRequirements,
  registerUser,
  updateOnboardingStep1,
  updateOnboardingStep2,
  updateOnboardingStep3,
  updateOnboardingStep4,
  getRegistrationProgress,
  getOnboardingData,
} from './user.service';
import {
  UpdateUserProfile,
  OnboardingStep1Role,
  OnboardingStep2Personal,
  OnboardingStep3Professional,
  OnboardingStep4Plan,
} from './user.model';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { generateOTP, storeOTP } from '../auth/otp.service';
import { sendOTPEmail } from '../auth/email.service';

const updateProfileSchema = z.object({
  registration_number: z.string().optional(),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professional_role: z.enum(['doctor', 'nurse', 'pharmacist', 'other', 'other_healthcare']).optional(),
  work_setting: z.string().optional(),
  scope_of_practice: z.string().optional(),
});

function formatUserResponse(user: any, name?: string | null, requirements?: any) {
  return {
    id: user.id,
    name: name || null,
    email: user.email,
    registrationNumber: user.registration_number,
    revalidationDate: user.revalidation_date,
    professionalRole: user.professional_role,
    workSetting: user.work_setting,
    scopeOfPractice: user.scope_of_practice,
    image: user.image,
    subscriptionTier: user.subscription_tier,
    subscriptionStatus: user.subscription_status,
    trialEndsAt: user.trial_ends_at,
    requirements: requirements || getRoleRequirements(user.professional_role),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}


export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await getUserById(req.user.userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get name directly from database
  const { prisma } = await import('../../lib/prisma');
  const userData = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { name: true },
  });

  res.json({
    success: true,
    data: formatUserResponse(user, userData?.name || null),
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateProfileSchema.parse(req.body) as UpdateUserProfile;
  const updated = await updateUserProfile(req.user.userId, validated);

  // Get name directly from database
  const { prisma } = await import('../../lib/prisma');
  const userData = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { name: true },
  });

  res.json({
    success: true,
    data: formatUserResponse(updated, userData?.name || null),
  });
});


export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await deleteUser(req.user.userId);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});


const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});


export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body);

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(validated.password, saltRounds);

  // Create user (unverified)
  const user = await registerUser(validated.email, passwordHash);

  // Generate and store OTP
  const otp = generateOTP();
  await storeOTP(validated.email, otp);

  // Send OTP email (non-blocking - user can request OTP again if this fails)
  const emailResult = await sendOTPEmail(validated.email, otp);

  // Prepare response
  const response: any = {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
    },
  };

  if (emailResult.success) {
    response.message = 'Registration successful. Please check your email for the verification code.';
  } else {
    // Email failed but user is created - they can request OTP again
    response.message = 'Registration successful, but we could not send the verification email. Please use the resend OTP endpoint to receive your code.';
    response.warning = emailResult.error;
  }

  // In development, include OTP in response
  if (process.env.NODE_ENV === 'development') {
    response.data.otp = otp;
    if (emailResult.otp) {
      response.data.devOtp = emailResult.otp;
    }
  }

  res.status(201).json(response);
});


const step1Schema = z.object({
  professional_role: z.string(),
});

export const onboardingStep1 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Fetch allowed roles from database (only active roles)
  const { prisma } = await import('../../lib/prisma');
  const roles = await prisma.role_masters.findMany({
    where: { status: 'one' },
    select: { name: true, status: true, type: true },
  });

  const deriveRoleKey = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('doctor')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('pharmacist')) return 'pharmacist';
    return 'other_healthcare';
  };

  const rolesWithKeys = roles.map(r => ({ ...r, key: deriveRoleKey(r.name) }));
  const availableRoleKeys = Array.from(new Set(rolesWithKeys.map(r => r.key)));
  const availableRoles = rolesWithKeys.map(r => ({ name: r.name, status: r.status, type: r.type, key: r.key }));

  const validated = step1Schema.parse(req.body) as OnboardingStep1Role;

  if (!availableRoleKeys.includes(validated.professional_role)) {
    throw new ApiError(400, 'Invalid professional role');
  }

  // Store the frontend canonical key (e.g. 'doctor' or 'other_healthcare')
  await updateOnboardingStep1(req.user.userId, { professional_role: validated.professional_role });
  const requirements = getRoleRequirements(validated.professional_role);

  res.json({
    success: true,
    message: 'Role selected successfully',
    data: {
      professionalRole: validated.professional_role,
      requirements,
      availableRoles,
    },
  });
});

export const getOnboardingRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const { prisma } = await import('../../lib/prisma');
  const roles = await prisma.role_masters.findMany({
    where: { status: 'one' },
    select: { name: true, status: true, type: true },
  });
  const deriveRoleKey = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('doctor')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('pharmacist')) return 'pharmacist';
    return 'other_healthcare';
  };

  const availableRoles = roles.map(r => ({ name: r.name, status: r.status, type: r.type, key: deriveRoleKey(r.name) }));

  res.json({
    success: true,
    data: {
      roles: availableRoles,
    },
  });
});

/**
 * Onboarding Step 2: Personal Details
 * POST /api/v1/users/onboarding/step-2
 */
const step2Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(1, 'Phone number is required'),
});

export const onboardingStep2 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step2Schema.parse(req.body) as OnboardingStep2Personal;
  await updateOnboardingStep2(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Personal details saved successfully',
    data: {
      name: validated.name,
      email: validated.email,
      phone_number: validated.phone_number,
    },
  });
});

/**
 * Onboarding Step 3: Professional Details
 * POST /api/v1/users/onboarding/step-3
 */
const step3Schema = z.object({
  gmc_registration_number: z.string().min(1, 'GMC registration number is required'),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  work_setting: z.string().optional(),
  scope_of_practice: z.string().optional(),
  professional_registrations: z.string().optional(),
  registration_reference_pin: z.string().optional(),
  hourly_rate: z.number().min(0).optional(),
  work_hours_completed_already: z.number().int().min(0).optional(),
  training_hours_completed_already: z.number().int().min(0).optional(),
  earned_current_financial_year: z.number().min(0).optional(),
  brief_description_of_work: z.string().optional(),
  notepad: z.string().optional(),
});

export const onboardingStep3 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step3Schema.parse(req.body) as OnboardingStep3Professional;
  await updateOnboardingStep3(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Professional details saved successfully',
    data: {
      gmc_registration_number: validated.gmc_registration_number,
      revalidation_date: validated.revalidation_date,
      work_setting: validated.work_setting,
      scope_of_practice: validated.scope_of_practice,
      professional_registrations: validated.professional_registrations,
      registration_reference_pin: validated.registration_reference_pin,
      hourly_rate: validated.hourly_rate,
      work_hours_completed_already: validated.work_hours_completed_already,
      training_hours_completed_already: validated.training_hours_completed_already,
      earned_current_financial_year: validated.earned_current_financial_year,
      brief_description_of_work: validated.brief_description_of_work,
      notepad: validated.notepad,
    },
  });
});

/**
 * Onboarding Step 4: Choose Subscription Plan
 * POST /api/v1/users/onboarding/step-4
 */
const step4Schema = z.object({
  subscription_tier: z.enum(['free', 'premium']),
});

export const onboardingStep4 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step4Schema.parse(req.body) as OnboardingStep4Plan;
  const updated = await updateOnboardingStep4(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Subscription plan selected successfully',
    data: {
      subscriptionTier: updated.subscription_tier,
      subscriptionStatus: updated.subscription_status,
      trialEndsAt: updated.trial_ends_at,
    },
  });
});

/**
 * Get Registration Progress
 * GET /api/v1/users/onboarding/progress
 */
export const getOnboardingProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const progress = await getRegistrationProgress(req.user.userId);

  res.json({
    success: true,
    data: progress,
  });
});

/**
 * Get all saved onboarding data
 * GET /api/v1/users/onboarding/data
 */
export const getOnboardingDataEndpoint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const data = await getOnboardingData(req.user.userId);

  res.json({
    success: true,
    data,
  });
});