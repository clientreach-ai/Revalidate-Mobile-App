import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
} from '../modules/users/user.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/profile', deleteAccount);

export default router;
