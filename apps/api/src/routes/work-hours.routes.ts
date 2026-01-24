import { Router } from 'express';
import {
  create,
  list,
  getActive,
  getById,
  update,
  remove,
  getTotal,
} from '../modules/logs/work-hours.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', create);
router.get('/', list);
router.get('/active', getActive);
router.get('/stats/total', getTotal);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
