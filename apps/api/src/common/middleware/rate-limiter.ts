/**
 * Rate limiting middleware
 * Prevents abuse of endpoints like registration and OTP
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error-handler';

// Simple in-memory rate limiter (for production, use Redis)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

/**
 * Rate limiter middleware
 * @param maxRequests Maximum number of requests
 * @param windowMs Time window in milliseconds
 * @param keyGenerator Function to generate unique key for rate limiting (default: uses IP)
 */
export function rateLimiter(
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 minutes default
  keyGenerator?: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator 
      ? keyGenerator(req) 
      : req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    const record = rateLimitStore[key];

    if (!record || record.resetTime < now) {
      // Create new record
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      throw new ApiError(
        429,
        `Too many requests. Please try again after ${Math.ceil(retryAfter / 60)} minutes.`
      );
    }

    // Increment count
    record.count++;
    next();
  };
}

/**
 * Rate limiter specifically for registration endpoint
 * 3 registrations per hour per IP
 */
export const registrationRateLimiter = rateLimiter(3, 60 * 60 * 1000);

/**
 * Rate limiter for OTP requests
 * 5 OTP requests per 15 minutes per IP
 */
export const otpRateLimiter = rateLimiter(5, 15 * 60 * 1000);
