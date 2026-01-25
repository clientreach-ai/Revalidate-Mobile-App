import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  register,
} from '../modules/users/user.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';
import { registrationRateLimiter } from '../common/middleware/rate-limiter';

const router = Router();

// Register route doesn't require authentication but has rate limiting
router.post('/register', registrationRateLimiter, register);

// All other routes require authentication
router.use(authenticateToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/profile', deleteAccount);

export default router;
