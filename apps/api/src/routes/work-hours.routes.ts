import { Router } from 'express';
import {
  create,
  list,
  getActive,
  getById,
  update,
  remove,
  pause,
  resume,
  restart,
  getTotal,
} from '../modules/logs/work-hours.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', create);
router.get('/', list);
router.get('/active', getActive);
router.post('/active/pause', pause);
router.post('/active/resume', resume);
router.post('/active/restart', restart);
router.get('/stats/total', getTotal);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
