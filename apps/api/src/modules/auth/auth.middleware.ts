import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/env';
import { JwtPayload } from './auth.types';
import { ApiError } from '../../common/middleware/error-handler';
import { getFirebaseAuth } from '../../config/firebase';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        firebaseUid?: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 * 
 * The JWT token is issued by our backend after verifying Firebase ID token.
 * This middleware verifies our JWT token for subsequent API requests.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new ApiError(401, 'Authentication token required');
    }

    const decoded = jwt.verify(token, JWT_CONFIG.secret) as JwtPayload;
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      firebaseUid: decoded.firebaseUid,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid or expired token');
    }
    throw error;
  }
}

/**
 * Optional authentication - doesn't fail if token is missing
 * Useful for endpoints that work with or without auth
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_CONFIG.secret) as JwtPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        firebaseUid: decoded.firebaseUid,
      };
    }
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Middleware to verify Firebase ID token directly
 * 
 * Use this for endpoints that need to verify Firebase ID token
 * (e.g., initial login/registration, token refresh)
 */
export async function verifyFirebaseIdToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!idToken) {
      throw new ApiError(401, 'Firebase ID token required');
    }

    const firebaseAuth = getFirebaseAuth();

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    
    // Attach Firebase user info to request
    (req as any).firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
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
