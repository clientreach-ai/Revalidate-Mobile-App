
import { Router } from 'express';
import * as hospitalsController from '../modules/hospitals/hospitals.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// Hospital routes
router.get('/', authenticateToken, hospitalsController.list);
router.get('/search', authenticateToken, hospitalsController.list);

export default router;
