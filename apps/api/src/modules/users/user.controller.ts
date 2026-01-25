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

/**
 * Format user response consistently
 */
function formatUserResponse(user: any, requirements?: any) {
  return {
    id: user.id,
    email: user.email,
    registrationNumber: user.registration_number,
    revalidationDate: user.revalidation_date,
    professionalRole: user.professional_role,
    workSetting: user.work_setting,
    scopeOfPractice: user.scope_of_practice,
    subscriptionTier: user.subscription_tier,
    subscriptionStatus: user.subscription_status,
    trialEndsAt: user.trial_ends_at,
    requirements: requirements || getRoleRequirements(user.professional_role),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await getUserById(req.user.userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: formatUserResponse(user),
  });
});

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateProfileSchema.parse(req.body) as UpdateUserProfile;
  const updated = await updateUserProfile(req.user.userId, validated);

  res.json({
    success: true,
    data: formatUserResponse(updated),
  });
});

/**
 * Delete user account
 * DELETE /api/v1/users/profile
 */
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

/**
 * Registration schema - email and password only
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Register a new user
 * POST /api/v1/users/register
 * 
 * Creates a user account with email and password, then sends OTP to email for verification.
 * If email sending fails, user is still created but can request OTP again later.
 */
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

/**
 * Onboarding Step 1: Choose Role
 * POST /api/v1/users/onboarding/step-1
 */
const step1Schema = z.object({
  professional_role: z.enum(['doctor', 'nurse', 'pharmacist', 'other_healthcare']),
});

export const onboardingStep1 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step1Schema.parse(req.body) as OnboardingStep1Role;
  await updateOnboardingStep1(req.user.userId, validated);
  const requirements = getRoleRequirements(validated.professional_role);

  res.json({
    success: true,
    message: 'Role selected successfully',
    data: {
      professionalRole: validated.professional_role,
      requirements,
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