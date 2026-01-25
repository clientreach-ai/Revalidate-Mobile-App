import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getMySQLPool } from '../../config/database';
import { JWT_CONFIG } from '../../config/env';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import { 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse,
  JwtPayload,
  PasswordResetRequest,
  ChangePasswordRequest,
} from './auth.types';
import { z } from 'zod';
import { mapUserRow } from '../../config/database-mapping';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  professionalDetails: z.object({
    registrationNumber: z.string().min(1, 'Registration number is required'),
    revalidationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    professionalRole: z.enum(['doctor', 'nurse', 'pharmacist', 'other']),
    workSetting: z.string().optional(),
    scopeOfPractice: z.string().optional(),
  }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for API requests
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
  });
}

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body) as RegisterRequest;
  const pool = getMySQLPool();

  // Check if user already exists
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [validated.email]
  ) as any[];

  if (existingUsers.length > 0) {
    throw new ApiError(409, 'User already exists. Please login instead.');
  }

  // Hash password
  const passwordHash = await hashPassword(validated.password);

  // Create user in MySQL (using existing table structure)
  // Note: reg_type enum is ('admin','email','mobile','facebook','google','apple')
  // We use 'email' for email/password registrations
  // Professional role info can be stored in description or handled separately
  const [result] = await pool.execute(
    `INSERT INTO users (
      email, password, name, registration, due_date, 
      reg_type, work_settings, scope_practice, 
      subscription_tier, subscription_status, status, user_type,
      description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free', 'active', '1', 'Customer', ?, NOW(), NOW())`,
    [
      validated.email,
      passwordHash,
      validated.email.split('@')[0], // Use email prefix as name
      validated.professionalDetails.registrationNumber,
      validated.professionalDetails.revalidationDate,
      'email', // reg_type: always 'email' for email/password registration
      validated.professionalDetails.workSetting || null,
      validated.professionalDetails.scopeOfPractice || null,
      JSON.stringify({ professionalRole: validated.professionalDetails.professionalRole }), // Store in description as JSON
    ]
  ) as any;

  // Get created user
  const [newUsers] = await pool.execute(
    'SELECT id, email, reg_type, due_date, registration, work_settings, scope_practice FROM users WHERE id = ?',
    [result.insertId]
  ) as any[];

  const userData = newUsers[0];
  const user = mapUserRow(userData);

  // Generate JWT token for API requests
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
  });

  const response: AuthResponse = {
    user: {
      id: user.id.toString(),
      email: user.email,
      professionalRole: user.professional_role,
      revalidationDate: user.revalidation_date,
    },
    token,
  };

  res.status(201).json({
    success: true,
    data: response,
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const validated = loginSchema.parse(req.body) as LoginRequest;
  const pool = getMySQLPool();

  // Get user by email
  const [users] = await pool.execute(
    'SELECT id, email, password, reg_type, due_date, registration, work_settings, scope_practice, status FROM users WHERE email = ?',
    [validated.email]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const userData = users[0];

  // Check if user is active
  if (userData.status === '0') {
    throw new ApiError(403, 'Account is inactive. Please contact support.');
  }

  // Check if user has a password
  if (!userData.password) {
    throw new ApiError(401, 'Account not set up. Please reset your password first.');
  }

  // Verify password
  const isValidPassword = await verifyPassword(validated.password, userData.password);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = mapUserRow(userData);

  // Generate JWT token for API requests
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
  });

  const response: AuthResponse = {
    user: {
      id: user.id.toString(),
      email: user.email,
      professionalRole: user.professional_role,
      revalidationDate: user.revalidation_date,
    },
    token,
  };

  res.json({
    success: true,
    data: response,
  });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const pool = getMySQLPool();
  const [users] = await pool.execute(
    `SELECT id, email, registration, due_date, reg_type, 
     work_settings, scope_practice, subscription_tier, subscription_status, 
     trial_ends_at, created_at, updated_at
     FROM users WHERE id = ?`,
    [req.user.userId]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = users[0];
  const mappedUser = mapUserRow(user);

  res.json({
    success: true,
    data: {
      id: mappedUser.id,
      email: mappedUser.email,
      registrationNumber: mappedUser.registration_number,
      revalidationDate: mappedUser.revalidation_date,
      professionalRole: mappedUser.professional_role,
      workSetting: mappedUser.work_setting,
      scopeOfPractice: mappedUser.scope_of_practice,
      subscriptionTier: mappedUser.subscription_tier,
      subscriptionStatus: mappedUser.subscription_status,
      trialEndsAt: mappedUser.trial_ends_at,
      createdAt: mappedUser.created_at,
      updatedAt: mappedUser.updated_at,
    },
  });
});

/**
 * Request password reset
 * POST /api/v1/auth/password-reset
 * 
 * Note: This generates a reset token and stores it in the database.
 * In production, you would send an email with a reset link.
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as PasswordResetRequest;
  
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const pool = getMySQLPool();

  // Check if user exists
  const [users] = await pool.execute(
    'SELECT id, email FROM users WHERE email = ?',
    [email]
  ) as any[];

  // Don't reveal if user exists (security best practice)
  if (users.length === 0) {
    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token (in production, store this in database with expiry)
  // For now, we'll just return success
  // TODO: Implement proper password reset token storage and email sending
  
  res.json({
    success: true,
    message: 'If an account exists, a password reset link has been sent',
    // Remove in production - only for development
    ...(process.env.NODE_ENV === 'development' && { 
      note: 'Password reset email functionality needs to be implemented' 
    }),
  });
});

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = changePasswordSchema.parse(req.body) as ChangePasswordRequest;
  const pool = getMySQLPool();

  // Get user's current password
  const [users] = await pool.execute(
    'SELECT password FROM users WHERE id = ?',
    [req.user.userId]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const currentPasswordHash = users[0].password;

  if (!currentPasswordHash) {
    throw new ApiError(400, 'User does not have a password set');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(validated.currentPassword, currentPasswordHash);

  if (!isValidPassword) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(validated.newPassword);

  // Update password in database
  await pool.execute(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
    [newPasswordHash, req.user.userId]
  );

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * Refresh token
 * POST /api/v1/auth/refresh
 * 
 * Client sends current JWT token to get a new one
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Generate new JWT token
  const token = generateToken({
    userId: req.user.userId,
    email: req.user.email,
  });

  res.json({
    success: true,
    data: { token },
  });
});
