import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getFirebaseAuth } from '../../config/firebase';
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
import { DecodedIdToken } from 'firebase-admin/auth';
import { mapUserRow } from '../../config/database-mapping';

// Validation schemas
const registerSchema = z.object({
  firebaseIdToken: z.string().min(1, 'Firebase ID token is required'),
  professionalDetails: z.object({
    registrationNumber: z.string().min(1, 'Registration number is required'),
    revalidationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    professionalRole: z.enum(['doctor', 'nurse', 'pharmacist', 'other']),
    workSetting: z.string().optional(),
    scopeOfPractice: z.string().optional(),
  }),
});

const loginSchema = z.object({
  firebaseIdToken: z.string().min(1, 'Firebase ID token is required'),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Verify Firebase ID token and return decoded token
 */
async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  const firebaseAuth = getFirebaseAuth();
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new ApiError(401, 'Firebase ID token has expired');
    }
    if (error.code === 'auth/argument-error') {
      throw new ApiError(401, 'Invalid Firebase ID token');
    }
    throw new ApiError(401, 'Failed to verify Firebase ID token');
  }
}

/**
 * Get or create MySQL user from Firebase UID
 */
async function getOrCreateMySQLUser(
  firebaseUid: string,
  email: string,
  professionalDetails?: RegisterRequest['professionalDetails']
): Promise<any> {
  const pool = getMySQLPool();

  // Check if user exists in MySQL
  const [existingUsers] = await pool.execute(
    'SELECT id, email, reg_type, due_date, registration, work_settings, scope_practice FROM users WHERE firebase_uid = ?',
    [firebaseUid]
  ) as any[];

  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  // User doesn't exist - create new user
  // If professionalDetails provided, this is registration
  // Otherwise, this is first login (shouldn't happen, but handle gracefully)
  if (!professionalDetails) {
    throw new ApiError(400, 'User not found. Please complete registration first.');
  }

  const [result] = await pool.execute(
    `INSERT INTO users (
      firebase_uid, email, registration, due_date, 
      reg_type, work_settings, scope_practice, 
      subscription_tier, subscription_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'free', 'active', NOW(), NOW())`,
    [
      firebaseUid,
      email,
      professionalDetails.registrationNumber,
      professionalDetails.revalidationDate,
      professionalDetails.professionalRole,
      professionalDetails.workSetting || null,
      professionalDetails.scopeOfPractice || null,
    ]
  ) as any;

  const [newUsers] = await pool.execute(
    'SELECT id, email, reg_type, due_date, registration, work_settings, scope_practice FROM users WHERE id = ?',
    [result.insertId]
  ) as any[];

  const mapped = mapUserRow(newUsers[0]);
  return {
    id: mapped.id,
    email: mapped.email,
    professional_role: mapped.professional_role,
    revalidation_date: mapped.revalidation_date,
  };
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
 * 
 * Flow:
 * 1. Client creates Firebase account (email/password or social)
 * 2. Client gets Firebase ID token
 * 3. Client sends ID token + professional details to this endpoint
 * 4. Backend verifies ID token, creates MySQL user record
 * 5. Backend returns JWT token for API requests
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body) as RegisterRequest;
  const firebaseAuth = getFirebaseAuth();

  // Verify Firebase ID token
  const decodedToken = await verifyFirebaseToken(validated.firebaseIdToken);
  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;

  if (!email) {
    throw new ApiError(400, 'Email not found in Firebase token');
  }

  // Check if user already exists
  const pool = getMySQLPool();
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE firebase_uid = ? OR email = ?',
    [firebaseUid, email]
  ) as any[];

  if (existingUsers.length > 0) {
    throw new ApiError(409, 'User already exists. Please login instead.');
  }

  // Create user in MySQL
  const userData = await getOrCreateMySQLUser(firebaseUid, email, validated.professionalDetails);
  const user = mapUserRow(userData);

  // Generate JWT token for API requests
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
    firebaseUid,
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
 * 
 * Flow:
 * 1. Client authenticates with Firebase (email/password or social)
 * 2. Client gets Firebase ID token
 * 3. Client sends ID token to this endpoint
 * 4. Backend verifies ID token, gets/creates MySQL user
 * 5. Backend returns JWT token for API requests
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const validated = loginSchema.parse(req.body) as LoginRequest;

  // Verify Firebase ID token
  const decodedToken = await verifyFirebaseToken(validated.firebaseIdToken);
  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;

  if (!email) {
    throw new ApiError(400, 'Email not found in Firebase token');
  }

  // Get or create MySQL user (create if first login after Firebase auth)
  const userData = await getOrCreateMySQLUser(firebaseUid, email);
  const user = mapUserRow(userData);

  // Generate JWT token for API requests
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
    firebaseUid,
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
     trial_ends_at, created_at, updated_at, firebase_uid
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
 * Note: Password reset is handled entirely by Firebase.
 * This endpoint can be used to trigger Firebase password reset email.
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as PasswordResetRequest;
  
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const firebaseAuth = getFirebaseAuth();

  try {
    // Generate password reset link
    const resetLink = await firebaseAuth.generatePasswordResetLink(email);
    
    // In production, send email with reset link via your email service
    // For now, we'll just return success
    // TODO: Integrate email service (SendGrid, AWS SES, etc.)
    
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      // Remove in production - only for development
      ...(process.env.NODE_ENV === 'development' && { resetLink }),
    });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Don't reveal if user exists
      res.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent',
      });
      return;
    }
    throw new ApiError(500, 'Failed to send password reset email');
  }
});

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 * 
 * Note: Password changes are handled by Firebase.
 * This endpoint updates the password in Firebase using the user's Firebase UID.
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = changePasswordSchema.parse(req.body) as ChangePasswordRequest;
  const firebaseAuth = getFirebaseAuth();
  const pool = getMySQLPool();

  // Get user's Firebase UID
  const [users] = await pool.execute(
    'SELECT firebase_uid FROM users WHERE id = ?',
    [req.user.userId]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const firebaseUid = users[0].firebase_uid;

  if (!firebaseUid) {
    throw new ApiError(400, 'User does not have a Firebase account linked');
  }

  // Update password in Firebase
  try {
    await firebaseAuth.updateUser(firebaseUid, {
      password: validated.newPassword,
    });
  } catch (error: any) {
    throw new ApiError(500, 'Failed to update password');
  }

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * Refresh token
 * POST /api/v1/auth/refresh
 * 
 * Client sends Firebase ID token to refresh our JWT token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseIdToken } = req.body;

  if (!firebaseIdToken) {
    throw new ApiError(400, 'Firebase ID token is required');
  }

  // Verify Firebase ID token
  const decodedToken = await verifyFirebaseToken(firebaseIdToken);
  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;

  if (!email) {
    throw new ApiError(400, 'Email not found in Firebase token');
  }

  // Get MySQL user
  const pool = getMySQLPool();
  const [users] = await pool.execute(
    'SELECT id, email FROM users WHERE firebase_uid = ?',
    [firebaseUid]
  ) as any[];

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = users[0];

  // Generate new JWT token
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
    firebaseUid,
  });

  res.json({
    success: true,
    data: { token },
  });
});
