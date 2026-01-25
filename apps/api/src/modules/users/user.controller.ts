import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  getUserById,
  updateUserProfile,
  deleteUser,
  getRoleRequirements,
  registerUser,
} from './user.service';
import { UpdateUserProfile } from './user.model';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { generateOTP, storeOTP } from '../auth/otp.service';
import { sendOTPEmail } from '../auth/email.service';

const updateProfileSchema = z.object({
  registration_number: z.string().optional(),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professional_role: z.enum(['doctor', 'nurse', 'pharmacist', 'other']).optional(),
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