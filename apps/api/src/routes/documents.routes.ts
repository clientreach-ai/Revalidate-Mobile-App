import { Router } from 'express';
import {
  uploadDocument,
  list,
  getById,
  update,
  remove,
} from '../modules/documents/documents.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/upload', uploadDocument);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
