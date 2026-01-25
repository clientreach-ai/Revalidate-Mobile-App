import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/env';
import { JwtPayload } from './auth.types';
import { ApiError } from '../../common/middleware/error-handler';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
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
      };
    }
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

