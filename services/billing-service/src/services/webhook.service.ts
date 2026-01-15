/**
 * Webhook Service - Handle Stripe webhooks
 */

import Stripe from 'stripe';
import { getMasterPrisma } from '@oms/database';
import { publishEvent } from '@oms/event-bus';
import { logger } from '../utils/logger';
import * as stripeService from './stripe.service';
import * as subscriptionService from './subscription.service';
import * as invoiceService from './invoice.service';
import * as paymentService from './payment.service';

export interface WebhookResult {
  success: boolean;
  message: string;
}

/**
 * Process webhook event
 */
export async function processWebhook(
  payload: Buffer,
  signature: string
): Promise<WebhookResult> {
  let event: Stripe.Event;
  
  try {
    event = stripeService.constructWebhookEvent(payload, signature);
  } catch (err: any) {
    logger.error({ error: err.message }, 'Webhook signature verification failed');
    return { success: false, message: 'Invalid signature' };
  }
  
  logger.info({ type: event.type, id: event.id }, 'Processing webhook');
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
        
      default:
        logger.debug({ type: event.type }, 'Unhandled webhook event type');
    }
    
    return { success: true, message: 'Webhook processed' };
  } catch (error: any) {
    logger.error({ type: event.type, error: error.message }, 'Webhook processing error');
    return { success: false, message: error.message };
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const tenantId = subscription.metadata?.tenantId;
  
  if (!tenantId) {
    logger.warn({ subscriptionId: subscription.id }, 'Subscription webhook missing tenantId');
    return;
  }
  
  // Update subscription record with Stripe details
  await masterPrisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date(),
    },
  });
  
  logger.info({ stripeSubscriptionId: subscription.id, tenantId }, 'Subscription created from webhook');
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  await masterPrisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    },
  });
  
  logger.info({ stripeSubscriptionId: subscription.id, status: subscription.status }, 'Subscription updated from webhook');
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const sub = await masterPrisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  
  if (sub) {
    await masterPrisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    await publishEvent('subscription.canceled', {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
    });
  }
  
  logger.info({ stripeSubscriptionId: subscription.id }, 'Subscription deleted from webhook');
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    const masterPrisma = getMasterPrisma();
    
    const subscription = await masterPrisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    
    if (subscription) {
      // Renew subscription
      await subscriptionService.renewSubscription(subscription.id);
    }
  }
  
  logger.info({ invoiceId: invoice.id }, 'Invoice paid from webhook');
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    const subscription = await masterPrisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    
    if (subscription) {
      await masterPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'PAST_DUE',
          updatedAt: new Date(),
        },
      });
      
      await publishEvent('subscription.payment_failed', {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        invoiceId: invoice.id,
      });
    }
  }
  
  logger.warn({ invoiceId: invoice.id }, 'Invoice payment failed from webhook');
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const paymentId = paymentIntent.metadata?.paymentId;
  
  if (paymentId) {
    await masterPrisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCEEDED',
        stripeChargeId: paymentIntent.latest_charge as string,
        processedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  
  logger.info({ paymentIntentId: paymentIntent.id }, 'Payment succeeded from webhook');
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const paymentId = paymentIntent.metadata?.paymentId;
  
  if (paymentId) {
    await masterPrisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        updatedAt: new Date(),
      },
    });
  }
  
  logger.warn({ paymentIntentId: paymentIntent.id, error: paymentIntent.last_payment_error?.message }, 'Payment failed from webhook');
}

/**
 * Handle trial will end (3 days before)
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const sub = await masterPrisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  
  if (sub) {
    await publishEvent('subscription.trial_ending', {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      trialEnd: new Date((subscription.trial_end || 0) * 1000),
    });
  }
  
  logger.info({ stripeSubscriptionId: subscription.id }, 'Trial will end soon');
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' {
  switch (stripeStatus) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
      return 'UNPAID';
    default:
      return 'ACTIVE';
  }
}
