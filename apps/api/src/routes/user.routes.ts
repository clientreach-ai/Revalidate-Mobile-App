import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  register,
  onboardingStep1,
  onboardingStep2,
  onboardingStep3,
  onboardingStep4,
  getOnboardingProgress,
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

// Onboarding routes (multi-step registration)
router.get('/onboarding/progress', getOnboardingProgress);
router.post('/onboarding/step-1', onboardingStep1);
router.post('/onboarding/step-2', onboardingStep2);
router.post('/onboarding/step-3', onboardingStep3);
router.post('/onboarding/step-4', onboardingStep4);

export default router;
