import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { getMySQLPool } from '../../config/database';

/**
 * Return recent notifications for the authenticated user.
 * This endpoint is intentionally tolerant: if the notifications table
 * does not exist or an error occurs, it returns an empty list with 200.
 */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const pool = getMySQLPool();
    const userId = req.user.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const [rows] = await pool.execute(
      'SELECT id, title, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    ) as any;

    const data = Array.isArray(rows)
      ? rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        body: r.message,
        type: r.type,
        createdAt: r.created_at
      }))
      : [];

    return res.json({ success: true, data });
  } catch (err) {
    // Don't propagate internal errors for notifications; return empty array
    console.warn('Error reading notifications:', err);
    return res.json({ success: true, data: [] });
  }
});
