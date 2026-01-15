/**
 * Stripe Service - Stripe API integration
 */

import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize Stripe client
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

export interface CreateStripeSubscriptionInput {
  tenantId: string;
  planId: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  paymentMethodId: string;
  trialDays?: number;
  couponCode?: string;
}

export interface StripeSubscriptionResult {
  subscriptionId: string;
  customerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  status: string;
}

export interface CreateStripePaymentInput {
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentResult {
  paymentIntentId: string;
  chargeId?: string;
  status: 'succeeded' | 'failed' | 'pending';
  error?: string;
}

export interface StripePaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
}

/**
 * Create or get Stripe customer
 */
export async function getOrCreateCustomer(
  tenantId: string,
  email: string,
  name?: string
): Promise<string> {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      tenantId,
    },
  });
  
  logger.info({
    customerId: customer.id,
    tenantId,
  }, 'Stripe customer created');
  
  return customer.id;
}

/**
 * Create Stripe subscription
 */
export async function createSubscription(
  input: CreateStripeSubscriptionInput
): Promise<StripeSubscriptionResult> {
  const { tenantId, planId, billingCycle, paymentMethodId, trialDays, couponCode } = input;
  
  // Get or create customer
  const customerId = await getOrCreateCustomer(tenantId, `tenant-${tenantId}@billing.internal`);
  
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
  
  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  
  // Create price or use existing
  const priceId = await getOrCreatePrice(planId, billingCycle);
  
  // Create subscription
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      tenantId,
      planId,
    },
  };
  
  if (trialDays && trialDays > 0) {
    subscriptionParams.trial_period_days = trialDays;
  }
  
  if (couponCode) {
    subscriptionParams.coupon = couponCode;
  }
  
  const subscription = await stripe.subscriptions.create(subscriptionParams);
  
  logger.info({
    subscriptionId: subscription.id,
    customerId,
    tenantId,
  }, 'Stripe subscription created');
  
  return {
    subscriptionId: subscription.id,
    customerId,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    status: subscription.status,
  };
}

/**
 * Update Stripe subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  planId: string,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = await getOrCreatePrice(planId, billingCycle);
  
  await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: config.billing.prorateOnPlanChange ? 'create_prorations' : 'none',
  });
  
  logger.info({
    subscriptionId,
    planId,
    billingCycle,
  }, 'Stripe subscription updated');
}

/**
 * Cancel Stripe subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.cancel(subscriptionId);
  
  logger.info({ subscriptionId }, 'Stripe subscription canceled');
}

/**
 * Set cancel at period end
 */
export async function setCancelAtPeriodEnd(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
  
  logger.info({
    subscriptionId,
    cancelAtPeriodEnd,
  }, 'Stripe subscription cancel_at_period_end updated');
}

/**
 * Create payment
 */
export async function createPayment(
  input: CreateStripePaymentInput
): Promise<StripePaymentResult> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      payment_method: input.paymentMethodId,
      customer: input.customerId,
      description: input.description,
      metadata: input.metadata,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });
    
    if (paymentIntent.status === 'succeeded') {
      return {
        paymentIntentId: paymentIntent.id,
        chargeId: paymentIntent.latest_charge as string | undefined,
        status: 'succeeded',
      };
    } else if (paymentIntent.status === 'requires_action') {
      return {
        paymentIntentId: paymentIntent.id,
        status: 'pending',
        error: 'Additional authentication required',
      };
    } else {
      return {
        paymentIntentId: paymentIntent.id,
        status: 'failed',
        error: `Payment status: ${paymentIntent.status}`,
      };
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Stripe payment failed');
    
    return {
      paymentIntentId: '',
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Refund payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number
): Promise<void> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };
  
  if (amount) {
    refundParams.amount = amount;
  }
  
  await stripe.refunds.create(refundParams);
  
  logger.info({ paymentIntentId, amount }, 'Stripe refund created');
}

/**
 * Get payment method details
 */
export async function getPaymentMethod(paymentMethodId: string): Promise<StripePaymentMethod> {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  
  return {
    id: pm.id,
    type: pm.type === 'card' ? 'card' : 'bank_account',
    card: pm.card ? {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    } : undefined,
    bankAccount: pm.us_bank_account ? {
      bankName: pm.us_bank_account.bank_name || 'Unknown',
      last4: pm.us_bank_account.last4 || '',
    } : undefined,
  };
}

/**
 * Detach payment method
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
  
  logger.info({ paymentMethodId }, 'Stripe payment method detached');
}

/**
 * Create setup intent for adding payment method
 */
export async function createSetupIntent(customerId: string): Promise<{
  clientSecret: string;
  setupIntentId: string;
}> {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
  
  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Create Stripe portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session.url;
}

/**
 * Get or create price for plan
 */
async function getOrCreatePrice(
  planId: string,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
): Promise<string> {
  const plan = config.plans[planId as keyof typeof config.plans];
  
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  
  const amount = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
  const interval = billingCycle === 'YEARLY' ? 'year' : 'month';
  const lookupKey = `${planId}_${interval}`;
  
  // Check for existing price
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  
  if (prices.data.length > 0) {
    return prices.data[0].id;
  }
  
  // Create product if needed
  const productId = await getOrCreateProduct(planId, plan.name);
  
  // Create price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: config.billing.defaultCurrency,
    recurring: {
      interval,
    },
    lookup_key: lookupKey,
  });
  
  logger.info({
    priceId: price.id,
    planId,
    billingCycle,
  }, 'Stripe price created');
  
  return price.id;
}

/**
 * Get or create product
 */
async function getOrCreateProduct(planId: string, planName: string): Promise<string> {
  const products = await stripe.products.list({
    limit: 100,
  });
  
  const existing = products.data.find(p => p.metadata?.planId === planId);
  
  if (existing) {
    return existing.id;
  }
  
  const product = await stripe.products.create({
    name: `Office Management System - ${planName}`,
    metadata: {
      planId,
    },
  });
  
  logger.info({ productId: product.id, planId }, 'Stripe product created');
  
  return product.id;
}

/**
 * Construct webhook event
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

/**
 * Create coupon
 */
export async function createCoupon(
  code: string,
  percentOff: number,
  durationInMonths?: number
): Promise<string> {
  const coupon = await stripe.coupons.create({
    id: code,
    percent_off: percentOff,
    duration: durationInMonths ? 'repeating' : 'forever',
    duration_in_months: durationInMonths,
  });
  
  return coupon.id;
}
