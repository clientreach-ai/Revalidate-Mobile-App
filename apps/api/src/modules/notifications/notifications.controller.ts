import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { getMySQLPool } from '../../config/database';

/**
 * Return recent notifications for the authenticated user.
 * This endpoint is intentionally tolerant: if the notifications table
 * does not exist or an error occurs, it returns an empty list with 200.
 */
export const listNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }

    try {
      const pool = getMySQLPool();
      const userId = req.user.userId;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;

      const [rows] = (await pool.execute(
        `SELECT n.id, n.title, n.message, n.type, n.created_at,
              CASE WHEN nr.read_at IS NULL THEN 0 ELSE 1 END AS is_read
       FROM notifications n
       LEFT JOIN notification_reads nr
         ON nr.notification_id = n.id AND nr.user_id = ?
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ?`,
        [userId, userId, limit]
      )) as any;

      const data = Array.isArray(rows)
        ? rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            body: r.message,
            type: r.type,
            createdAt: r.created_at,
            isRead: Boolean(r.is_read),
          }))
        : [];

      return res.json({ success: true, data });
    } catch (err) {
      // Fallback for older schemas without notification_reads
      console.warn('Error reading notifications:', err);
      try {
        const pool = getMySQLPool();
        const userId = req.user.userId;
        const limit = req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : 10;

        const [rows] = (await pool.execute(
          'SELECT id, title, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
          [userId, limit]
        )) as any;

        const data = Array.isArray(rows)
          ? rows.map((r: any) => ({
              id: r.id,
              title: r.title,
              body: r.message,
              type: r.type,
              createdAt: r.created_at,
              isRead: false,
            }))
          : [];

        return res.json({ success: true, data });
      } catch (fallbackErr) {
        // Don't propagate internal errors for notifications; return empty array
        console.warn('Error reading notifications fallback:', fallbackErr);
        return res.json({ success: true, data: [] });
      }
    }
  }
);

export const markNotificationRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }

    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId || Number.isNaN(notificationId)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid notification id' });
    }

    try {
      const pool = getMySQLPool();
      const userId = req.user.userId;

      await pool.execute(
        `INSERT IGNORE INTO notification_reads (user_id, notification_id, read_at)
       SELECT ?, id, NOW() FROM notifications WHERE id = ? AND user_id = ?`,
        [userId, notificationId, userId]
      );

      return res.json({ success: true });
    } catch (err: any) {
      const code = err?.code || '';
      const message = String(err?.message || '');
      if (
        code === 'ER_NO_SUCH_TABLE' ||
        message.includes('notification_reads')
      ) {
        console.warn('notification_reads table missing; skipping mark read');
        return res.json({ success: true, skipped: true });
      }

      console.warn('Error marking notification read:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to mark notification read' });
    }
  }
);

export const markAllNotificationsRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }

    try {
      const pool = getMySQLPool();
      const userId = req.user.userId;

      await pool.execute(
        `INSERT IGNORE INTO notification_reads (user_id, notification_id, read_at)
       SELECT ?, id, NOW() FROM notifications WHERE user_id = ?`,
        [userId, userId]
      );

      return res.json({ success: true });
    } catch (err: any) {
      const code = err?.code || '';
      const message = String(err?.message || '');
      if (
        code === 'ER_NO_SUCH_TABLE' ||
        message.includes('notification_reads')
      ) {
        console.warn(
          'notification_reads table missing; skipping mark all read'
        );
        return res.json({ success: true, skipped: true });
      }

      console.warn('Error marking all notifications read:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to mark notifications read' });
    }
  }
);
