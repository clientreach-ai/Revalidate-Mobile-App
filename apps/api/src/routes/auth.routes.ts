import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  requestPasswordReset,
  changePassword,
  refreshToken,
} from '../modules/auth/auth.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

/**
 * Authentication Routes
 * 
 * Flow:
 * 1. Client sends email/password to /register or /login
 * 2. Backend verifies password against MySQL database
 * 3. Backend returns JWT token for subsequent API requests
 */

// Registration: Client sends email, password, and professional details
router.post('/register', register);

// Login: Client sends email and password
router.post('/login', login);

// Get current user (requires JWT token)
router.get('/me', authenticateToken, getCurrentUser);

// Password reset: Request password reset link
router.post('/password-reset', requestPasswordReset);

// Change password: Updates password in MySQL
router.post('/change-password', authenticateToken, changePassword);

// Refresh token: Client sends current JWT token to get new one
router.post('/refresh', authenticateToken, refreshToken);

export default router;
