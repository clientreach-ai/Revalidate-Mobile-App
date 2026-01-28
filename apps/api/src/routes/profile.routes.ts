import {  getRole, getRoles } from '../modules/personal/role.controller';
import { getWorkSettingsList } from '../modules/personal/work.controller';
import { Router } from 'express';

// Temporary log to verify this routes file is loaded at server startup
console.log('🔎 profile.routes.ts loaded');

const router = Router();

router.get("/roles", getRoles);
router.get("/role/:id", getRole);
router.get("/work", getWorkSettingsList)
export default router;
