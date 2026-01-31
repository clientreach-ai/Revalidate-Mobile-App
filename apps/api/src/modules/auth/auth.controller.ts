import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { updateUsersWithFallback } from '../../lib/prisma-fallback';
import { JWT_CONFIG } from '../../config/env';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import { logger } from '../../common/logger';
import {
  LoginRequest,
  AuthResponse,
  JwtPayload,
  // PasswordResetRequest, (removed - type not currently used)
  ChangePasswordRequest,
  VerifyOTPRequest,
  ResendOTPRequest,
  ResetPasswordWithOTPRequest,
} from './auth.types';
import { z } from 'zod';
import { mapUserRow } from '../../config/database-mapping';
import { generateOTP, storeOTP, verifyOTP } from './otp.service';
import { sendOTPEmail } from './email.service';
import { getMySQLPool } from '../../config/database';
import { getRegistrationProgress } from '../users/user.service';

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordWithOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.expiresIn,
    } as jwt.SignOptions
  );
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body);

  const existingUser = await prisma.users.findFirst({
    where: { email: validated.email },
    select: { id: true, status: true },
  });

  // If user exists and is already verified, they should login instead
  if (existingUser && existingUser.status === 'one') {
    throw new ApiError(409, 'User already exists. Please login instead.');
  }

  const passwordHash = await hashPassword(validated.password);

  let user;

  if (existingUser && existingUser.status === 'zero') {
    // User exists but is unverified - update password and resend OTP
    // Use fallback updater to avoid Prisma enum parsing issues on returned rows
    // (will perform raw UPDATE if Prisma update fails)
    const updated = await updateUsersWithFallback(existingUser.id, { password: passwordHash, updated_at: new Date() }, true);
    user = updated || { id: existingUser.id, email: validated.email };
  } else {
    // Create new user
    user = await prisma.users.create({
      data: {
        email: validated.email,
        password: passwordHash,
        name: validated.email.split('@')[0],
        reg_type: 'email',
        status: 'zero',
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  const otp = generateOTP();
  await storeOTP(validated.email, otp);

  const emailResult = await sendOTPEmail(validated.email, otp);

  const response: any = {
    success: true,
    data: {
      userId: user.id.toString(),
      email: user.email,
    },
  };

  if (emailResult.success) {
    if (existingUser && existingUser.status === 'zero') {
      response.message = 'Verification code sent. Please check your email to verify your account.';
    } else {
      response.message = 'Registration successful. Please check your email for the verification code.';
    }
  } else {
    response.message = 'Registration successful, but we could not send the verification email. Please use the resend OTP endpoint to receive your code.';
    response.warning = emailResult.error;
  }

  if (process.env.NODE_ENV === 'development') {
    response.data.otp = otp;
    if (emailResult.otp) {
      response.data.devOtp = emailResult.otp;
    }
  }

  res.status(201).json(serializeBigInt(response));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validated = loginSchema.parse(req.body) as LoginRequest;

  // Use raw SQL to avoid Prisma enum validation issues with empty reg_type values
  console.log('LOGIN: Using raw SQL query instead of Prisma');
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    `SELECT id, email, password, reg_type, due_date, registration, 
     work_settings, scope_practice, status, block_user 
     FROM users 
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) 
     LIMIT 1`,
    [validated.email]
  ) as any[];

  if (!users || users.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const userData = users[0];
  // Check block flag first: in this DB `block_user` === '0' means blocked, '1' means active
  if (userData.block_user === '0' || userData.block_user === 0) {
    throw new ApiError(403, 'Account is blocked. Please contact support.');
  }

  // Legacy status field: '0' indicates inactive
  if (userData.status === '0') {
    throw new ApiError(403, 'Account is inactive. Please contact support.');
  }

  if (!userData.password) {
    throw new ApiError(401, 'Account not set up. Please reset your password first.');
  }

  const isValidPassword = await verifyPassword(validated.password, userData.password);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = mapUserRow(userData);

  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
  });

  const mobileProgress = await getRegistrationProgress(user.id.toString());

  const response: AuthResponse = {
    user: {
      id: user.id.toString(),
      email: user.email,
      professionalRole: user.professional_role,
      revalidationDate: user.revalidation_date,
      onboardingCompleted: mobileProgress.completed,
    },
    token,
  };

  res.json(serializeBigInt({
    success: true,
    data: response,
  }));
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Use raw SQL to bypass Prisma enum validation for legacy data
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    `SELECT id, name, email, registration, due_date, reg_type, 
     work_settings, scope_practice, subscription_tier, 
     subscription_status, trial_ends_at, created_at, 
     updated_at, description, image 
     FROM users 
     WHERE id = ? 
     LIMIT 1`,
    [req.user.userId]
  ) as any[];

  if (!users || users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const userData = users[0];
  const mappedUser = mapUserRow(userData);

  res.json(serializeBigInt({
    success: true,
    data: {
      id: mappedUser.id,
      name: userData.name || null,
      email: mappedUser.email,
      registrationNumber: mappedUser.registration_number,
      revalidationDate: mappedUser.revalidation_date,
      professionalRole: mappedUser.professional_role,
      workSetting: mappedUser.work_setting,
      scopeOfPractice: mappedUser.scope_of_practice,
      image: userData.image || null,
      subscriptionTier: mappedUser.subscription_tier,
      subscriptionStatus: mappedUser.subscription_status,
      trialEndsAt: mappedUser.trial_ends_at,
      hourlyRate: mappedUser.hourly_rate,
      createdAt: mappedUser.created_at,
      updatedAt: mappedUser.updated_at,
    },
  }));
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Validate email format using Zod schema
    const validated = passwordResetRequestSchema.parse(req.body);
    const emailInput = validated.email.toLowerCase().trim();

    logger.debug(`Password reset requested for email: ${emailInput}`);

    // Check if user exists and is registered
    // Use case-insensitive search since MySQL email lookups can be case-sensitive
    // Try exact match first (faster)
    let user;
    try {
      user = await prisma.users.findFirst({
        where: { email: emailInput },
        select: { id: true, email: true, status: true },
      });
    } catch (dbError: any) {
      // Log warning but allow fallback to raw SQL (needed for users with invalid enum values like '')
      logger.warn('Prisma user lookup failed, falling back to raw SQL', { error: dbError });
      user = null;
    }

    // If not found with exact match, try case-insensitive using raw SQL
    if (!user) {
      try {
        const emailLower = emailInput.toLowerCase();
        const result = await prisma.$queryRaw<Array<{ id: bigint; email: string; status: string }>>`
          SELECT id, email, status 
          FROM users 
          WHERE LOWER(TRIM(email)) = LOWER(TRIM(${emailLower}))
          LIMIT 1
        `;
        if (result && result.length > 0) {
          user = {
            id: result[0].id,
            email: result[0].email,
            status: result[0].status as any,
          };
        }
      } catch (dbError: any) {
        logger.error('Database error during case-insensitive user lookup', dbError);
        throw new ApiError(500, 'Database connection error. Please try again later.');
      }
    }

    if (!user) {
      logger.debug(`User not found for email: ${emailInput}`);
      throw new ApiError(404, 'Account does not exist with this email address.');
    }

    // Check if user account is active
    // Prisma enum: 'zero' maps to "0", 'one' maps to "1"
    // Also handle string values for compatibility
    const status = String(user.status);
    if (status === 'zero' || status === '0') {
      logger.debug(`User account not verified for email: ${emailInput}`);
      throw new ApiError(403, 'Account is not verified. Please verify your email first.');
    }

    // Generate and store OTP for password reset
    const otp = generateOTP();
    try {
      await storeOTP(emailInput, otp);
      logger.debug(`OTP stored successfully for email: ${emailInput}`);
    } catch (error: any) {
      logger.error('Failed to store OTP', error);
      throw new ApiError(500, 'Failed to generate password reset code. Please try again.');
    }

    // Send OTP email
    const emailResult = await sendOTPEmail(emailInput, otp);

    const response: any = {
      success: true,
      message: 'Password reset code has been sent to your email.',
    };

    if (!emailResult.success) {
      logger.warn(`Failed to send OTP email to ${emailInput}: ${emailResult.error}`);
      response.message = 'We could not send the password reset code. Please try again later.';
      response.warning = emailResult.error;
    } else {
      logger.debug(`OTP email sent successfully to ${emailInput}`);
    }

    // In development, include OTP in response
    if (process.env.NODE_ENV === 'development') {
      response.data = { otp };
      if (emailResult.otp) {
        response.data.devOtp = emailResult.otp;
      }
    }

    res.json(serializeBigInt(response));
  } catch (error: any) {
    // Re-throw ApiError to be handled by error handler
    if (error instanceof ApiError) {
      throw error;
    }
    // Log unexpected errors
    logger.error('Unexpected error in requestPasswordReset', error);
    throw new ApiError(500, 'An unexpected error occurred. Please try again later.');
  }
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = changePasswordSchema.parse(req.body) as ChangePasswordRequest;

  const user = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { password: true },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.password) {
    throw new ApiError(400, 'User does not have a password set');
  }

  const isValidPassword = await verifyPassword(validated.currentPassword, user.password);

  if (!isValidPassword) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  const newPasswordHash = await hashPassword(validated.newPassword);

  await updateUsersWithFallback(parseInt(req.user.userId), { password: newPasswordHash, updated_at: new Date() }, false);

  res.json(serializeBigInt({
    success: true,
    message: 'Password updated successfully',
  }));
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const token = generateToken({
    userId: req.user.userId,
    email: req.user.email,
  });

  res.json(serializeBigInt({
    success: true,
    data: { token },
  }));
});

export const verifyEmailOTP = asyncHandler(async (req: Request, res: Response) => {
  const validated = verifyOTPSchema.parse(req.body) as VerifyOTPRequest;

  // Verify the OTP
  const isValidOTP = await verifyOTP(validated.email, validated.otp);

  if (!isValidOTP) {
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new one.');
  }

  // Find the user
  const user = await prisma.users.findFirst({
    where: { email: validated.email },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update user status from 'zero' to 'one' (activate account)
  await updateUsersWithFallback(user.id, { status: 'one', updated_at: new Date() }, false);

  res.json(serializeBigInt({
    success: true,
    message: 'Email verified successfully. Your account has been activated.',
  }));
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const validated = resendOTPSchema.parse(req.body) as ResendOTPRequest;

  // Check if user exists
  const user = await prisma.users.findFirst({
    where: { email: validated.email },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new ApiError(404, 'User not found. Please register first.');
  }

  // If user is already verified, don't send OTP
  if (user.status === 'one') {
    throw new ApiError(400, 'Email is already verified. You can login directly.');
  }

  // Generate and store new OTP
  const otp = generateOTP();
  await storeOTP(validated.email, otp);

  // Send OTP email
  const emailResult = await sendOTPEmail(validated.email, otp);

  const response: any = {
    success: true,
    message: 'Verification code sent successfully. Please check your email.',
  };

  if (!emailResult.success) {
    response.message = 'We could not send the verification email. Please try again later.';
    response.warning = emailResult.error;
  }

  // In development, include OTP in response
  if (process.env.NODE_ENV === 'development') {
    response.data = { otp };
    if (emailResult.otp) {
      response.data.devOtp = emailResult.otp;
    }
  }

  res.json(serializeBigInt(response));
});

export const resetPasswordWithOTP = asyncHandler(async (req: Request, res: Response) => {
  const validated = resetPasswordWithOTPSchema.parse(req.body) as ResetPasswordWithOTPRequest;

  // Verify the OTP
  const isValidOTP = await verifyOTP(validated.email, validated.otp);

  if (!isValidOTP) {
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new password reset code.');
  }

  // Find the user
  const user = await prisma.users.findFirst({
    where: { email: validated.email },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user account is active
  if (user.status === 'zero') {
    throw new ApiError(403, 'Account is not verified. Please verify your email first.');
  }

  // Hash the new password
  const newPasswordHash = await hashPassword(validated.newPassword);

  // Update user password
  await updateUsersWithFallback(user.id, { password: newPasswordHash, updated_at: new Date() }, false);

  res.json(serializeBigInt({
    success: true,
    message: 'Password has been reset successfully. You can now login with your new password.',
  }));
});
