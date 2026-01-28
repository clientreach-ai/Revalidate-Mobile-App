import { Router } from 'express';
import { exportPortfolio, getExportPreview } from '../modules/export/export.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All export routes require authentication
router.use(authenticateToken);

// Get export preview (counts for each section)
router.get('/preview', getExportPreview);

// Export portfolio as PDF
router.post('/portfolio', exportPortfolio);

export default router;
