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
 * 1. Client authenticates with Firebase (email/password or social login)
 * 2. Client receives Firebase ID token
 * 3. Client sends Firebase ID token to /register or /login
 * 4. Backend verifies Firebase ID token and links to MySQL user
 * 5. Backend returns JWT token for subsequent API requests
 */

// Registration: Client sends Firebase ID token + professional details
router.post('/register', register);

// Login: Client sends Firebase ID token
router.post('/login', login);

// Get current user (requires JWT token)
router.get('/me', authenticateToken, getCurrentUser);

// Password reset: Triggered via Firebase (this is optional - Firebase handles it)
router.post('/password-reset', requestPasswordReset);

// Change password: Updates password in Firebase
router.post('/change-password', authenticateToken, changePassword);

// Refresh token: Client sends Firebase ID token to get new JWT token
router.post('/refresh', refreshToken);

export default router;
