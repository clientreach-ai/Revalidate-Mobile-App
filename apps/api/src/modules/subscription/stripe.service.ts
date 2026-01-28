/**
 * Stripe Payment Service
 * Handles Stripe payment operations
 */

import Stripe from 'stripe';
import { STRIPE_CONFIG } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { logger } from '../../common/logger';

// Validate Stripe configuration
if (!STRIPE_CONFIG.secretKey) {
  logger.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe payment features will not work.');
}

// Initialize Stripe
const stripe = STRIPE_CONFIG.secretKey 
  ? new Stripe(STRIPE_CONFIG.secretKey, {
      // Some Stripe types are pinned to known apiVersion string unions; cast to any
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null as any; // Type assertion for development - will fail at runtime if used without key

/**
 * Create a payment intent for premium subscription
 */
export async function createPaymentIntent(
  userId: string,
  amount: number,
  currency: string = 'usd'
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    // Get user email for receipt
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: { email: true },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: currency,
      metadata: {
        userId: userId,
        subscriptionTier: 'premium',
      },
      receipt_email: user?.email,
      description: 'Premium Subscription - Revalidation Tracker',
    });

    logger.info(`Payment intent created for user ${userId}: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error: any) {
    logger.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      return paymentIntent;
    }

    // If not succeeded, try to confirm it
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);
    return confirmed;
  } catch (error: any) {
    logger.error('Error confirming payment intent:', error);
    throw new Error(`Failed to confirm payment: ${error.message}`);
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  priceId?: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    // Get user email
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: { email: true },
    });

    const finalPriceId = priceId || STRIPE_CONFIG.premiumPriceId;
    
    if (!finalPriceId) {
      throw new Error('Stripe price ID is required. Set STRIPE_PREMIUM_PRICE_ID environment variable or pass priceId parameter.');
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user?.email,
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        subscriptionTier: 'premium',
      },
      success_url: `${process.env.APP_URL || 'https://revalidate-api.fly.dev'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://revalidate-api.fly.dev'}/payment/cancel`,
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logger.info(`Checkout session created for user ${userId}: ${session.id}`);
    return session;
  } catch (error: any) {
    logger.error('Error creating checkout session:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
}

/**
 * Create a subscription setup intent for mobile app
 * This allows the mobile app to collect payment method and create subscription
 */
export async function createSubscriptionSetup(
  userId: string,
  priceId?: string
): Promise<{ clientSecret: string; subscriptionId?: string }> {
  try {
    // Get or create Stripe customer
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      select: { email: true },
    });

    const finalPriceId = priceId || STRIPE_CONFIG.premiumPriceId;
    
    if (!finalPriceId) {
      throw new Error('Stripe price ID is required. Set STRIPE_PREMIUM_PRICE_ID environment variable or pass priceId parameter.');
    }
    
    if (!stripe) {
      throw new Error('Stripe is not initialized. Set STRIPE_SECRET_KEY environment variable.');
    }

    // Create or retrieve customer
    let customer: Stripe.Customer;
    const existingCustomers = await stripe.customers.list({
      email: user?.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user?.email,
        metadata: {
          userId: userId,
        },
      });
    }

    // Create subscription with trial period if needed
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: finalPriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent?.client_secret) {
      throw new Error('Failed to create payment intent for subscription');
    }

    logger.info(`Subscription setup created for user ${userId}: ${subscription.id}`);
    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  } catch (error: any) {
    logger.error('Error creating subscription setup:', error);
    throw new Error(`Failed to create subscription setup: ${error.message}`);
  }
}

/**
 * Handle successful payment - update user subscription
 */
export async function handleSuccessfulPayment(
  paymentIntentId: string,
  userId: string
): Promise<void> {
  try {
    // Update user subscription to premium
    await prisma.users.update({
      where: { id: parseInt(userId) },
      data: {
        subscription_tier: 'premium',
        subscription_status: 'active',
      },
    });

    logger.info(`User ${userId} subscription upgraded to premium after payment ${paymentIntentId}`);
  } catch (error: any) {
    logger.error('Error updating subscription after payment:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

/**
 * Handle webhook event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = paymentIntent.metadata?.userId;
        if (userId) {
          await handleSuccessfulPayment(paymentIntent.id, userId);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionUserId = session.metadata?.userId;
        if (sessionUserId) {
          await prisma.users.update({
            where: { id: parseInt(sessionUserId) },
            data: {
              subscription_tier: 'premium',
              subscription_status: 'active',
            },
          });
          logger.info(`User ${sessionUserId} subscription activated via checkout session`);
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        const subUserId = subscription.metadata?.userId;
        if (subUserId) {
          const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
          await prisma.users.update({
            where: { id: parseInt(subUserId) },
            data: {
              subscription_tier: 'premium',
              subscription_status: status as any,
            },
          });
          logger.info(`User ${subUserId} subscription ${subscription.status} - subscription ${subscription.id}`);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const deletedUserId = deletedSubscription.metadata?.userId;
        if (deletedUserId) {
          await prisma.users.update({
            where: { id: parseInt(deletedUserId) },
            data: {
              subscription_tier: 'free',
              subscription_status: 'cancelled' as any,
            },
          });
          logger.info(`User ${deletedUserId} subscription cancelled - subscription ${deletedSubscription.id}`);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const invoiceUserId = sub.metadata?.userId;
          if (invoiceUserId) {
            await prisma.users.update({
              where: { id: parseInt(invoiceUserId) },
              data: {
                subscription_tier: 'premium',
                subscription_status: 'active' as any,
              },
            });
            logger.info(`User ${invoiceUserId} subscription payment succeeded`);
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription) {
          const failedSub = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
          const failedUserId = failedSub.metadata?.userId;
          if (failedUserId) {
            await prisma.users.update({
              where: { id: parseInt(failedUserId) },
              data: {
                subscription_status: 'expired' as any,
              },
            });
            logger.info(`User ${failedUserId} subscription payment failed`);
          }
        }
        break;

      default:
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error: any) {
    logger.error('Error handling webhook event:', error);
    throw error;
  }
}

export { stripe };
