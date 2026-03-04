/**
 * Webhook Service - Handle Stripe webhooks
 */

import Stripe from 'stripe';
import { getMasterPrisma } from '@oms/database';
import { publishEvent, getEventBus, SNS_TOPICS } from '@oms/event-bus';
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
    event = await stripeService.constructWebhookEvent(payload, signature);
  } catch (err: any) {
    logger.error({ error: err.message }, 'Webhook signature verification failed');
    return { success: false, message: 'Invalid signature' };
  }
  
  logger.info({ type: event.type, id: event.id }, 'Processing webhook');
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
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
    
    // Also update tenant status to CANCELLED
    await masterPrisma.tenant.update({
      where: { id: sub.tenantId },
      data: {
        status: 'CANCELLED',
      },
    });
    
    await publishEvent('subscription.canceled', {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
    });
    
    // Publish to topic for notification service
    const eventBus = getEventBus('billing-service');
    await eventBus.publishToTopic(SNS_TOPICS.EMPLOYEE_EVENTS, 'billing.subscription-canceled', {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      stripeSubscriptionId: subscription.id,
    }, { tenantId: sub.tenantId, tenantSlug: '' });
  }
  
  logger.info({ stripeSubscriptionId: subscription.id }, 'Subscription deleted from webhook');
}

/**
 * Handle checkout session completed - create subscription when checkout succeeds
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;
  const billingCycle = session.metadata?.billingCycle as 'MONTHLY' | 'YEARLY';
  
  if (!tenantId || !planId) {
    logger.warn({ sessionId: session.id }, 'Checkout session missing tenantId or planId');
    return;
  }
  
  // Get the Stripe subscription ID from the session (handle both expanded and unexpanded)
  const stripeSubscriptionId = typeof session.subscription === 'string' 
    ? session.subscription 
    : (session.subscription as any)?.id;
  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : (session.customer as any)?.id;
  
  // Get plan from database
  const plan = await masterPrisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  
  if (!plan) {
    logger.error({ planId }, 'Plan not found for checkout session');
    return;
  }
  
  // Calculate period dates
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  if (billingCycle === 'YEARLY') {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }
  
  const amount = billingCycle === 'YEARLY' 
    ? Number(plan.yearlyPrice) 
    : Number(plan.monthlyPrice);
  
  // Create or update subscription in our database
  const existingSubscription = await masterPrisma.subscription.findFirst({
    where: { tenantId },
  });
  
  if (existingSubscription) {
    // Update existing subscription
    await masterPrisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: plan.id,
        billingCycle,
        status: 'ACTIVE',
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        amount,
        maxUsers: plan.maxUsers,
        maxStorage: plan.maxStorageGB,
        maxProjects: plan.maxProjects,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new subscription
    await masterPrisma.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        billingCycle,
        status: 'ACTIVE',
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        amount,
        maxUsers: plan.maxUsers,
        maxStorage: plan.maxStorageGB,
        maxProjects: plan.maxProjects,
      },
    });
  }
  
  // Get card details from payment intent
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  
  if (session.payment_intent) {
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent.id;
    
    const cardDetails = await stripeService.getPaymentMethodFromIntent(paymentIntentId);
    if (cardDetails) {
      cardBrand = cardDetails.brand;
      cardLast4 = cardDetails.last4;
    }
  }
  
  // Create invoice for this payment
  const invoice = await masterPrisma.invoice.create({
    data: {
      tenantId,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'PAID',
      subtotal: amount,
      tax: 0,
      discount: 0,
      total: amount,
      amountPaid: amount,
      amountDue: 0,
      currency: 'USD',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      cardBrand,
      cardLast4,
      lineItems: [{
        description: `${plan.name} Plan - ${billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'} Subscription`,
        quantity: 1,
        unitPrice: amount,
        amount,
      }],
    },
  });
  
  // Publish subscription activated event
  await publishEvent('subscription.activated', {
    tenantId,
    planId,
    billingCycle,
    stripeSubscriptionId,
    invoiceId: invoice.id,
  });
  
  // Publish to topic for notification service
  const eventBus = getEventBus('billing-service');
  await eventBus.publishToTopic(SNS_TOPICS.EMPLOYEE_EVENTS, 'billing.subscription-activated', {
    tenantId,
    planName: plan.name,
    planId,
    billingCycle,
    amount: amount / 100,  // Convert to dollars
    currency: 'USD',
    invoiceId: invoice.id,
    stripeSubscriptionId,
  }, { tenantId, tenantSlug: '' });
  
  logger.info({
    sessionId: session.id,
    tenantId,
    planId,
    invoiceId: invoice.id,
    cardLast4,
  }, 'Checkout session completed - subscription created');
}

/**
 * Handle invoice paid - for recurring payments (renewals)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const masterPrisma = getMasterPrisma();
  const stripeSubscriptionId = invoice.subscription as string;
  
  if (!stripeSubscriptionId) {
    logger.debug({ invoiceId: invoice.id }, 'Invoice paid without subscription - likely one-time payment');
    return;
  }
  
  const subscription = await masterPrisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  
  if (!subscription) {
    logger.debug({ stripeSubscriptionId }, 'No local subscription found for Stripe subscription');
    return;
  }
  
  // Renew subscription
  await subscriptionService.renewSubscription(subscription.id);
  
  // Get card details from payment intent
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  
  if (invoice.payment_intent) {
    const paymentIntentId = typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent.id;
    
    const cardDetails = await stripeService.getPaymentMethodFromIntent(paymentIntentId);
    if (cardDetails) {
      cardBrand = cardDetails.brand;
      cardLast4 = cardDetails.last4;
    }
  }
  
  // Create invoice record for the renewal
  const invoiceRecord = await masterPrisma.invoice.create({
    data: {
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'PAID',
      subtotal: Number(invoice.amount_paid) / 100,
      tax: Number(invoice.tax || 0) / 100,
      discount: Number(invoice.total_discount_amounts?.reduce((sum, d) => sum + d.amount, 0) || 0) / 100,
      total: Number(invoice.total) / 100,
      amountPaid: Number(invoice.amount_paid) / 100,
      amountDue: 0,
      currency: invoice.currency?.toUpperCase() || 'USD',
      issueDate: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
      paidAt: new Date(),
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string,
      cardBrand,
      cardLast4,
      lineItems: invoice.lines.data.map(line => ({
        description: line.description || 'Subscription',
        quantity: line.quantity || 1,
        unitPrice: Number(line.amount) / 100,
        amount: Number(line.amount) / 100,
      })),
    },
  });
  
  logger.info({
    stripeInvoiceId: invoice.id,
    invoiceId: invoiceRecord.id,
    tenantId: subscription.tenantId,
    cardLast4,
  }, 'Invoice paid from webhook - renewal recorded');
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
      
      // Publish to topic for notification service
      const eventBus = getEventBus('billing-service');
      await eventBus.publishToTopic(SNS_TOPICS.EMPLOYEE_EVENTS, 'billing.payment-failed', {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'USD',
        failureMessage: invoice.last_finalization_error?.message || 'Payment failed',
      }, { tenantId: subscription.tenantId, tenantSlug: '' });
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
