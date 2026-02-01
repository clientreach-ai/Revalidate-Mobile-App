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
import { updateUsersWithFallback } from '../../lib/prisma-fallback';
import Stripe from 'stripe';
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
    const status = subscription.status === 'trialing'
      ? 'trial'
      : subscription.status === 'active'
        ? 'active'
        : subscription.status === 'canceled'
          ? 'cancelled'
          : 'expired';
    await updateUsersWithFallback(
      parseInt(req.user.userId),
      { subscription_tier: 'premium', subscription_status: status as any },
      false
    );

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

/**
 * Get user's payment method details
 * GET /api/v1/payment/methods
 */
export const getPaymentDetails = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Get user details
  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new ApiError(404, 'User not found');
  }

  // Find Stripe customer by email
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return res.json({
      success: true,
      data: null, // No customer found
    });
  }

  const customer = customers.data[0];

  // List payment methods
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customer.id,
    type: 'card',
  });

  if (paymentMethods.data.length === 0) {
    return res.json({
      success: true,
      data: null, // No payment methods
    });
  }

  // Return the most recently added card (or default)
  const defaultMethod = paymentMethods.data[0]; // Stripe lists newest first usually? Actually API says "The payment methods are returned in reverse chronological order" if created param used, but default list validation is needed.
  // Actually list returns sorted by creation date usually.

  res.json({
    success: true,
    data: {
      id: defaultMethod.id,
      brand: defaultMethod.card?.brand,
      last4: defaultMethod.card?.last4,
      expMonth: defaultMethod.card?.exp_month,
      expYear: defaultMethod.card?.exp_year,
    },
  });
});

/**
 * Create Stripe customer portal session
 * POST /api/v1/payment/portal
 */
export const createCustomerPortalSessionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!stripe) {
    throw new ApiError(500, 'Stripe is not initialized');
  }

  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || process.env.API_BASE_URL || '';
  if (!returnUrl) {
    throw new ApiError(500, 'Stripe portal return URL is not configured');
  }

  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new ApiError(404, 'User not found');
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return res.json({
      success: true,
      data: null,
      message: 'No customer found',
    });
  }

  const customer = customers.data[0];
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  res.json({
    success: true,
    data: {
      url: session.url,
    },
  });
});

/**
 * Cancel subscription
 * POST /api/v1/payment/cancel-subscription
 */
export const cancelSubscriptionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!stripe) {
    throw new ApiError(500, 'Stripe is not initialized');
  }

  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { email: true },
  });

  if (!user?.email) {
    throw new ApiError(404, 'User not found');
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    await updateUsersWithFallback(parseInt(req.user.userId), { subscription_tier: 'free', subscription_status: 'cancelled' as any }, false);
    return res.json({
      success: true,
      data: {
        cancelled: false,
        message: 'No active subscription found',
      },
    });
  }

  const customer = customers.data[0];
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'all',
    limit: 10,
  });

  const activeSubscription = subscriptions.data.find(s =>
    s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'
  );

  if (!activeSubscription) {
    await updateUsersWithFallback(parseInt(req.user.userId), { subscription_tier: 'free', subscription_status: 'cancelled' as any }, false);
    return res.json({
      success: true,
      data: {
        cancelled: false,
        message: 'No active subscription found',
      },
    });
  }

  const cancelled = await stripe.subscriptions.cancel(activeSubscription.id);
  await updateUsersWithFallback(parseInt(req.user.userId), { subscription_tier: 'free', subscription_status: 'cancelled' as any }, false);

  res.json({
    success: true,
    data: {
      cancelled: true,
      subscriptionId: cancelled.id,
      status: cancelled.status,
    },
  });
});
