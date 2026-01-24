import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  remove,
} from '../modules/logs/appraisal.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
