import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  remove,
  getTotal,
} from '../modules/logs/cpd.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', create);
router.get('/', list);
router.get('/stats/total', getTotal);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
