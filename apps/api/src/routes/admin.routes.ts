import { Router } from 'express';
import {
  getAllUsers,
  getUserDetails,
  getDashboardStats,
  requireAdmin,
} from '../modules/admin/admin.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.get('/stats', getDashboardStats);

export default router;
