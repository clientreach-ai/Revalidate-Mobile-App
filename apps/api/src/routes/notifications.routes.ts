import { Router } from 'express';
import { authenticateToken } from '../modules/auth/auth.middleware';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../modules/notifications/notifications.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
