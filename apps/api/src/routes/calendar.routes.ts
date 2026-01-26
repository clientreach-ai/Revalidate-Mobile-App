import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  remove,
} from '../modules/calendar/calendar.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/events', create);
router.get('/events', list);
router.get('/events/:id', getById);
router.put('/events/:id', update);
router.delete('/events/:id', remove);

export default router;
