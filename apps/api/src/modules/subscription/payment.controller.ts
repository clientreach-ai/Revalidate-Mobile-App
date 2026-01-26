/**
 * Payment Controller
 * Handles payment-related API endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  createPaymentIntent,
  createCheckoutSession,
  confirmPaymentIntent,
  handleSuccessfulPayment,
  handleWebhookEvent,
  stripe,
} from './stripe.service';
import { STRIPE_CONFIG } from '../../config/env';
import { z } from 'zod';
import { logger } from '../../common/logger';

/**
 * Create payment intent for premium subscription
 * POST /api/v1/payment/create-intent
 */
const createIntentSchema = z.object({
  amount: z.number().int().positive().optional(),
  currency: z.string().optional(),
  priceId: z.string().optional(), // For subscription-based payments
});

export const createPaymentIntentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = createIntentSchema.parse(req.body);
  
  // If priceId is provided, create subscription setup instead of one-time payment
  if (validated.priceId || STRIPE_CONFIG.premiumPriceId) {
    const { createSubscriptionSetup } = await import('./stripe.service');
    const setup = await createSubscriptionSetup(
      req.user.userId,
      validated.priceId || STRIPE_CONFIG.premiumPriceId
    );

    res.json({
      success: true,
      data: {
        clientSecret: setup.clientSecret,
        subscriptionId: setup.subscriptionId,
        type: 'subscription',
      },
    });
    return;
  }

  // Fallback to one-time payment intent
  const amount = validated.amount || STRIPE_CONFIG.premiumPriceAmount;
  const currency = validated.currency || STRIPE_CONFIG.currency;

  const paymentIntent = await createPaymentIntent(
    req.user.userId,
    amount,
    currency
  );

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      type: 'one-time',
    },
  });
});

/**
 * Confirm payment intent or subscription
 * POST /api/v1/payment/confirm
 */
const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().optional(),
  subscriptionId: z.string().optional(),
});

export const confirmPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = confirmPaymentSchema.parse(req.body);
  
  // Handle subscription confirmation
  if (validated.subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(validated.subscriptionId);
    
    // Verify the subscription belongs to this user
    if (subscription.metadata?.userId !== req.user.userId) {
      throw new ApiError(403, 'Subscription does not belong to this user');
    }

    // Update user subscription based on subscription status
    const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
    await prisma.users.update({
      where: { id: parseInt(req.user.userId) },
      data: {
        subscription_tier: 'premium',
        subscription_status: status,
      },
    });

    res.json({
      success: true,
      data: {
        status: subscription.status,
        subscriptionId: subscription.id,
        type: 'subscription',
      },
    });
    return;
  }

  // Handle payment intent confirmation (one-time payment)
  if (validated.paymentIntentId) {
    const paymentIntent = await confirmPaymentIntent(validated.paymentIntentId);

    // Verify the payment intent belongs to this user
    if (paymentIntent.metadata?.userId !== req.user.userId) {
      throw new ApiError(403, 'Payment intent does not belong to this user');
    }

    // If payment succeeded, update user subscription
    if (paymentIntent.status === 'succeeded') {
      await handleSuccessfulPayment(paymentIntent.id, req.user.userId);
    }

    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        type: 'one-time',
      },
    });
    return;
  }

  throw new ApiError(400, 'Either paymentIntentId or subscriptionId is required');
});

/**
 * Create checkout session for subscription
 * POST /api/v1/payment/create-session
 */
const createSessionSchema = z.object({
  priceId: z.string().optional(),
});

export const createCheckoutSessionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = createSessionSchema.parse(req.body);
  const session = await createCheckoutSession(req.user.userId, validated.priceId);

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
});

/**
 * Handle Stripe webhook
 * POST /api/v1/payment/webhook
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    throw new ApiError(400, 'Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    throw new ApiError(400, `Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error handling webhook:', error);
    throw new ApiError(500, 'Error processing webhook');
  }
});

/**
 * Get payment status
 * GET /api/v1/payment/status/:paymentIntentId
 */
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const { paymentIntentId } = req.params;

  if (!paymentIntentId) {
    throw new ApiError(400, 'Payment intent ID is required');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // Verify the payment intent belongs to this user
  if (paymentIntent.metadata?.userId !== req.user.userId) {
    throw new ApiError(403, 'Payment intent does not belong to this user');
  }

  res.json({
    success: true,
    data: {
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
    },
  });
});
