import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  requestPasswordReset,
  changePassword,
  refreshToken,
  verifyEmailOTP,
  resendOTP,
  resetPasswordWithOTP,
} from '../modules/auth/auth.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

router.post('/register', register);

router.post('/verify-email', verifyEmailOTP);

router.post('/resend-otp', resendOTP);

router.post('/login', login);

router.get('/me', authenticateToken, getCurrentUser);

router.post('/forgot-password', requestPasswordReset);

router.post('/reset-password', resetPasswordWithOTP);

router.post('/change-password', authenticateToken, changePassword);

router.post('/refresh', authenticateToken, refreshToken);

export default router;
