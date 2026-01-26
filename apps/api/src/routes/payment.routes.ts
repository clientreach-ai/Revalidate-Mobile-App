import { Router } from 'express';
import {
  createPaymentIntentHandler,
  confirmPaymentHandler,
  createCheckoutSessionHandler,
  handleWebhook,
  getPaymentStatus,
} from '../modules/subscription/payment.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// Webhook endpoint - must be before body parsing middleware
// This endpoint should use raw body, so it's handled separately in app.ts
router.post('/webhook', handleWebhook);

// Protected payment endpoints
router.post('/create-intent', authenticateToken, createPaymentIntentHandler);
router.post('/confirm', authenticateToken, confirmPaymentHandler);
router.post('/create-session', authenticateToken, createCheckoutSessionHandler);
router.get('/status/:paymentIntentId', authenticateToken, getPaymentStatus);

export default router;
