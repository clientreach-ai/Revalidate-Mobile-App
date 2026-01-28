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
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    // Accept either "Bearer <token>" or just the token string
    let token: string | undefined;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token required');
    }

    // Try verifying with our HMAC secret first. If that fails with an
    // invalid signature and a public key is configured, try RS256 verify
    // (useful when clients send Firebase ID tokens or other RS-signed tokens).
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_CONFIG.secret) as JwtPayload | any;
    } catch (err: any) {
      if (err instanceof jwt.JsonWebTokenError && JWT_CONFIG.publicKey) {
        // Try RS256 public key fallback
        try {
          decoded = jwt.verify(token, JWT_CONFIG.publicKey as string, { algorithms: ['RS256'] }) as any;
        } catch (err2: any) {
          if (err2 instanceof jwt.JsonWebTokenError) {
            const msg = process.env.NODE_ENV === 'development' ? `Invalid or expired token: ${err2.message}` : 'Invalid or expired token';
            throw new ApiError(401, msg);
          }
          throw err2;
        }
      } else if (err instanceof jwt.JsonWebTokenError) {
        const msg = process.env.NODE_ENV === 'development' ? `Invalid or expired token: ${err.message}` : 'Invalid or expired token';
        throw new ApiError(401, msg);
      } else {
        throw err;
      }
    }

    // Normalize payload fields from different token issuers (our backend or Firebase)
    const userId = (decoded && (decoded.userId || decoded.sub || decoded.uid || decoded.user_id)) as string | undefined;
    const email = (decoded && (decoded.email || decoded.emailAddress || decoded.email_address)) as string | undefined;

    if (!userId) {
      throw new ApiError(401, 'Invalid token payload');
    }

    req.user = {
      userId: String(userId),
      email: email || '',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Provide more detail in development to aid debugging
      const msg = process.env.NODE_ENV === 'development' ? `Invalid or expired token: ${error.message}` : 'Invalid or expired token';
      throw new ApiError(401, msg);
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
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

    if (token) {
      try {
        let decoded: any;
        try {
          decoded = jwt.verify(token, JWT_CONFIG.secret) as JwtPayload | any;
        } catch (err: any) {
          if (err instanceof jwt.JsonWebTokenError && JWT_CONFIG.publicKey) {
            decoded = jwt.verify(token, JWT_CONFIG.publicKey as string, { algorithms: ['RS256'] }) as any;
          } else {
            // If optional auth, silently ignore verification failures
            return next();
          }
        }

        const userId = (decoded && (decoded.userId || decoded.sub || decoded.uid || decoded.user_id)) as string | undefined;
        const email = (decoded && (decoded.email || decoded.emailAddress || decoded.email_address)) as string | undefined;

        if (userId) {
          req.user = { userId: String(userId), email: email || '' };
        }
      } catch (e) {
        // Ignore errors for optional auth
      }
    }
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

