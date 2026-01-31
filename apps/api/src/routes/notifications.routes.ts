import { Router } from 'express';
import { authenticateToken } from '../modules/auth/auth.middleware';
import {
  markNotificationRead,
  markAllNotificationsRead,
  listNotifications,
  getUnreadCount,
} from '../modules/notifications/notifications.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id', markNotificationRead);

export default router;
