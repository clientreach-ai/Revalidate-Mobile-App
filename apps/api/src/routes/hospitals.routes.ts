
import { Router } from 'express';
import * as hospitalsController from '../modules/hospitals/hospitals.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// Get all hospitals
router.get('/', authenticateToken, hospitalsController.list);

export default router;
