/**
 * Stripe Service - Stripe API integration
 */

import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getMasterPrisma } from '@oms/database';

// Cache for Stripe client and settings
let cachedStripe: Stripe | null = null;
let cachedSettings: { secretKey: string; webhookSecret: string } | null = null;
let settingsCacheTime: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get Stripe settings from database (with caching)
 */
async function getStripeSettings(): Promise<{ secretKey: string; webhookSecret: string }> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSettings && (now - settingsCacheTime) < CACHE_TTL_MS) {
    return cachedSettings;
  }
  
  try {
    const masterPrisma = getMasterPrisma();
    const platformSettings = await masterPrisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    
    const billing = (platformSettings?.billing as any) || {};
    
    // Get from database or fall back to env vars/config
    const secretKey = billing.stripeSecretKey || config.stripe.secretKey;
    const webhookSecret = billing.stripeWebhookSecret || config.stripe.webhookSecret;
    
    if (!secretKey || secretKey === 'sk_test_xxxx') {
      logger.warn('Stripe secret key not configured in platform settings or environment');
    }
    
    cachedSettings = { secretKey, webhookSecret };
    settingsCacheTime = now;
    
    return cachedSettings;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Stripe settings from database');
    // Fall back to config values
    return {
      secretKey: config.stripe.secretKey,
      webhookSecret: config.stripe.webhookSecret,
    };
  }
}

/**
 * Get configured Stripe client (fetches keys from database)
 */
export async function getStripeClient(): Promise<Stripe> {
  const settings = await getStripeSettings();
  
  // Create new client if not cached or if key changed
  if (!cachedStripe || (cachedSettings?.secretKey !== settings.secretKey)) {
    cachedStripe = new Stripe(settings.secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  
  return cachedStripe;
}

/**
 * Get webhook secret from database settings
 */
export async function getWebhookSecret(): Promise<string> {
  const settings = await getStripeSettings();
  return settings.webhookSecret;
}

/**
 * Clear the cached Stripe settings (call when settings are updated)
 */
export function clearStripeCache(): void {
  cachedStripe = null;
  cachedSettings = null;
  settingsCacheTime = 0;
}

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
  const stripe = await getStripeClient();
  
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
  const stripe = await getStripeClient();
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
 * Update Stripe subscription - changes plan without charging prorations
 * Uses the actual amount from database (not config) to ensure consistency
 */
export interface StripeUpdateResult {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  needsTrialEnd?: boolean; // True if trial_end was set and should be ended for 'active' status
}

/**
 * Update Stripe subscription - changes plan and adjusts billing date
 * Uses the actual amount from database (not config) to ensure consistency
 * Uses trial_end to set the billing date, then can be ended immediately for 'active' status
 */
export async function updateSubscription(
  subscriptionId: string,
  planId: string,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  amount: number,
  newBillingDate?: Date
): Promise<StripeUpdateResult> {
  const stripe = await getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Get or create product
  const plan = config.plans[planId as keyof typeof config.plans];
  const planName = plan?.name || planId;
  const productId = await getOrCreateProduct(planId, planName);
  
  // Get or create price with the actual amount from DB
  const priceId = await getOrCreatePriceWithAmount(
    productId,
    planId,
    billingCycle === 'QUARTERLY' ? 'MONTHLY' : billingCycle, // Quarterly uses monthly interval x 3
    Math.round(amount * 100) // Convert to cents
  );
  
  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    // Never create prorations - we handle billing date adjustment ourselves
    proration_behavior: 'none',
  };
  
  // Set trial_end to control the billing date
  // We'll immediately end the trial after to convert status to 'active'
  let needsTrialEnd = false;
  if (newBillingDate) {
    const billingTimestamp = Math.floor(newBillingDate.getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    
    // Only set trial_end if billing date is in the future
    if (billingTimestamp > nowTimestamp) {
      updateParams.trial_end = billingTimestamp;
      needsTrialEnd = true;
    }
  }
  
  let updated = await stripe.subscriptions.update(subscriptionId, updateParams);
  
  // If we set trial_end, the subscription is now 'trialing'
  // We need to keep track of this so caller can decide to end trial or not
  // For better UX, we leave it to the route handler to call end-trial if needed
  
  logger.info({
    subscriptionId,
    planId,
    billingCycle,
    amount,
    newBillingDate: newBillingDate?.toISOString(),
    stripeStatus: updated.status,
    stripeTrialEnd: updated.trial_end ? new Date(updated.trial_end * 1000).toISOString() : null,
    currentPeriodEnd: new Date(updated.current_period_end * 1000).toISOString(),
  }, 'Stripe subscription updated');
  
  return {
    currentPeriodStart: new Date(updated.current_period_start * 1000),
    currentPeriodEnd: updated.trial_end 
      ? new Date(updated.trial_end * 1000) 
      : new Date(updated.current_period_end * 1000),
    needsTrialEnd, // Flag to indicate if trial_end was set
  };
}

/**
 * Cancel Stripe subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = await getStripeClient();
  await stripe.subscriptions.cancel(subscriptionId);
  
  logger.info({ subscriptionId }, 'Stripe subscription canceled');
}

/**
 * Get Stripe subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  logger.info({ subscriptionId, status: subscription.status }, 'Stripe subscription retrieved');
  return subscription;
}

/**
 * Set cancel at period end
 */
export async function setCancelAtPeriodEnd(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
): Promise<void> {
  const stripe = await getStripeClient();
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
  
  logger.info({
    subscriptionId,
    cancelAtPeriodEnd,
  }, 'Stripe subscription cancel_at_period_end updated');
}

/**
 * End trial and convert to active subscription with credit balance
 * This fixes the "Trial ends..." display in Stripe while preserving billing date
 * by adding a credit to the customer account
 */
export async function endTrialWithCredit(
  subscriptionId: string,
  creditAmountCents: number = 0
): Promise<{ status: string; currentPeriodEnd: Date; trialEnd: Date | null }> {
  const stripe = await getStripeClient();
  
  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  if (subscription.status !== 'trialing') {
    logger.info({ subscriptionId, status: subscription.status }, 'Subscription not in trial, no action needed');
    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };
  }
  
  // Add credit to customer if specified (this will be applied to next invoice)
  if (creditAmountCents > 0) {
    await stripe.customers.update(subscription.customer as string, {
      balance: -creditAmountCents, // Negative balance = credit
    });
    logger.info({ 
      customerId: subscription.customer, 
      creditAmountCents 
    }, 'Added credit to customer balance');
  }
  
  // End the trial immediately - subscription will become active
  const updated = await stripe.subscriptions.update(subscriptionId, {
    trial_end: 'now',
  });
  
  logger.info({
    subscriptionId,
    previousTrialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    newStatus: updated.status,
    currentPeriodEnd: new Date(updated.current_period_end * 1000).toISOString(),
  }, 'Trial ended, subscription now active');
  
  return {
    status: updated.status,
    currentPeriodEnd: new Date(updated.current_period_end * 1000),
    trialEnd: null,
  };
}

/**
 * Create payment
 */
export async function createPayment(
  input: CreateStripePaymentInput
): Promise<StripePaymentResult> {
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
  const stripe = await getStripeClient();
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
export async function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = await getStripeClient();
  const webhookSecret = await getWebhookSecret();
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
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
  const stripe = await getStripeClient();
  const coupon = await stripe.coupons.create({
    id: code,
    percent_off: percentOff,
    duration: durationInMonths ? 'repeating' : 'forever',
    duration_in_months: durationInMonths,
  });
  
  return coupon.id;
}

export interface CreateCheckoutSessionInput {
  tenantId: string;
  tenantSlug: string;
  tenantEmail: string;
  planId: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  priceAmount: number; // in cents
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Create Stripe Checkout Session for plan subscription
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const stripe = await getStripeClient();
  const {
    tenantId,
    tenantSlug,
    tenantEmail,
    planId,
    planName,
    billingCycle,
    priceAmount,
    successUrl,
    cancelUrl,
  } = input;

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(tenantId, tenantEmail, tenantSlug);
  
  // Get or create product
  const productId = await getOrCreateProduct(planId, planName);
  
  // Get or create price
  const priceId = await getOrCreatePriceWithAmount(productId, planId, billingCycle, priceAmount);
  
  // Create Checkout Session
  // Handle URL param separator - use & if successUrl already has query params
  const urlSeparator = successUrl.includes('?') ? '&' : '?';
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}${urlSeparator}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      tenantSlug,
      planId,
      billingCycle,
    },
    subscription_data: {
      metadata: {
        tenantId,
        tenantSlug,
        planId,
        billingCycle,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  });

  logger.info({
    sessionId: session.id,
    tenantId,
    planId,
    billingCycle,
  }, 'Stripe Checkout session created');

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Get or create price with specific amount
 */
async function getOrCreatePriceWithAmount(
  productId: string,
  planId: string,
  billingCycle: 'MONTHLY' | 'YEARLY',
  amount: number
): Promise<string> {
  const stripe = await getStripeClient();
  const interval = billingCycle === 'YEARLY' ? 'year' : 'month';
  
  // Search for existing price
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  
  const existing = prices.data.find(
    p => p.unit_amount === amount && 
         p.recurring?.interval === interval &&
         p.metadata?.planId === planId
  );
  
  if (existing) {
    return existing.id;
  }
  
  // Create new price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: 'usd',
    recurring: {
      interval,
    },
    metadata: {
      planId,
      billingCycle,
    },
  });
  
  logger.info({ priceId: price.id, planId, billingCycle, amount }, 'Stripe price created');
  
  return price.id;
}

/**
 * Retrieve Checkout Session details
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'payment_intent', 'customer'],
  });
}

/**
 * Get payment method details from a payment intent
 */
export async function getPaymentMethodFromIntent(paymentIntentId: string): Promise<{
  brand: string | null;
  last4: string | null;
} | null> {
  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });
    
    const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod | null;
    
    if (paymentMethod?.type === 'card' && paymentMethod.card) {
      return {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
      };
    }
    
    return null;
  } catch (error) {
    logger.error({ paymentIntentId, error }, 'Failed to get payment method from intent');
    return null;
  }
}

/**
 * Get payment method details from a subscription
 */
export async function getPaymentMethodFromSubscription(subscriptionId: string): Promise<{
  brand: string | null;
  last4: string | null;
} | null> {
  try {
    const stripe = await getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method'],
    });
    
    const paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod | null;
    
    if (paymentMethod?.type === 'card' && paymentMethod.card) {
      return {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
      };
    }
    
    return null;
  } catch (error) {
    logger.error({ subscriptionId, error }, 'Failed to get payment method from subscription');
    return null;
  }
}

/**
 * Create customer portal session for managing billing
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = await getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session.url;
}
