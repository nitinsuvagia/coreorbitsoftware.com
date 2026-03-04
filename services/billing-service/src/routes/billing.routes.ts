/**
 * Billing Routes - API endpoints for billing operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import * as planService from '../services/plan.service';
import * as subscriptionService from '../services/subscription.service';
import * as invoiceService from '../services/invoice.service';
import * as paymentService from '../services/payment.service';
import * as usageService from '../services/usage.service';
import * as webhookService from '../services/webhook.service';
import * as stripeService from '../services/stripe.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSubscriptionSchema = z.object({
  planId: z.string().min(1), // Accept any plan ID from database
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional(),
  startTrial: z.boolean().optional().default(true),
});

const updateSubscriptionSchema = z.object({
  planId: z.string().min(1).optional(), // Accept any plan ID from database
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

const createPaymentSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive(),
  paymentMethodId: z.string(),
  description: z.string().optional(),
});

const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
  setAsDefault: z.boolean().optional().default(false),
});

const createCheckoutSessionSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function getTenantContext(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }
  
  return { tenantId, tenantSlug, userId };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// PLAN ENDPOINTS
// ============================================================================

// Get all available plans
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    const plans = await planService.getAvailablePlans();
    res.json({ success: true, data: plans });
  })
);

// Get plan by ID
router.get(
  '/plans/:planId',
  asyncHandler(async (req: Request, res: Response) => {
    const plan = planService.getPlanById(req.params.planId as any);
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    res.json({ success: true, data: plan });
  })
);

// Compare plans / calculate savings
router.get(
  '/plans/:planId/savings',
  asyncHandler(async (req: Request, res: Response) => {
    const savings = planService.calculateYearlySavings(req.params.planId as any);
    res.json({ success: true, data: savings });
  })
);

// ============================================================================
// SUBSCRIPTION ENDPOINTS
// ============================================================================

// Get current subscription
router.get(
  '/subscription',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }
    
    res.json({ success: true, data: subscription });
  })
);

// Create subscription
router.post(
  '/subscription',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const input = createSubscriptionSchema.parse(req.body);
    
    const subscription = await subscriptionService.createSubscription({
      tenantId,
      planId: input.planId,
      billingCycle: input.billingCycle,
      paymentMethodId: input.paymentMethodId,
      couponCode: input.couponCode,
      startTrial: input.startTrial,
    });
    
    res.status(201).json({ success: true, data: subscription });
  })
);

// Update subscription
router.patch(
  '/subscription',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const input = updateSubscriptionSchema.parse(req.body);
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }
    
    const updated = await subscriptionService.updateSubscription(subscription.id, input);
    
    res.json({ success: true, data: updated });
  })
);

// Cancel subscription
router.post(
  '/subscription/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const { immediate } = req.body;
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }
    
    if (immediate) {
      await subscriptionService.cancelSubscription(subscription.id);
      res.json({ success: true, message: 'Subscription canceled' });
    } else {
      await subscriptionService.updateSubscription(subscription.id, {
        cancelAtPeriodEnd: true,
      });
      res.json({ success: true, message: 'Subscription will be canceled at period end' });
    }
  })
);

// Resume canceled subscription
router.post(
  '/subscription/resume',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }
    
    const resumed = await subscriptionService.resumeSubscription(subscription.id);
    
    res.json({ success: true, data: resumed });
  })
);

// Force sync Stripe subscription to match our DB state (fixes price mismatches)
router.post(
  '/subscription/force-sync-to-stripe',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const masterPrisma = getMasterPrisma();
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ success: false, error: 'No Stripe subscription found' });
    }
    
    // Get the plan from DB
    const plan = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
    });
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Calculate the correct amount based on billing cycle
    const correctAmount = subscription.billingCycle === 'YEARLY' 
      ? Number(plan.yearlyPrice) 
      : Number(plan.monthlyPrice);
    
    logger.info({
      tenantId,
      subscriptionId: subscription.id,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      planSlug: plan.slug,
      currentAmount: (subscription as any).amount,
      correctAmount,
      billingCycle: subscription.billingCycle,
      dbBillingDate: subscription.currentPeriodEnd,
    }, 'Force syncing subscription to Stripe');
    
    // Update Stripe subscription with correct plan, price, AND billing date from DB
    const stripeResult = await stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      plan.slug,
      subscription.billingCycle as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
      correctAmount,
      subscription.currentPeriodEnd // Pass DB billing date to sync with Stripe
    );
    
    // Update our DB with Stripe's period dates
    // NOTE: Don't update period dates - DB is source of truth, Stripe follows DB
    await masterPrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        amount: correctAmount,
        // Keep DB billing dates as source of truth
        updatedAt: new Date(),
      },
    });
    
    // Fetch updated subscription
    const updated = await subscriptionService.getTenantSubscription(tenantId);
    
    res.json({ 
      success: true, 
      message: `Stripe subscription updated to ${plan.name} at $${correctAmount}`,
      data: updated 
    });
  })
);

// Sync subscription with Stripe (call after returning from portal)
router.post(
  '/subscription/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const masterPrisma = getMasterPrisma();
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ success: false, error: 'No Stripe subscription found' });
    }
    
    // Fetch latest status from Stripe
    const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
    
    // Map Stripe status to our status
    const mapStripeStatus = (status: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' => {
      switch (status) {
        case 'trialing': return 'TRIALING';
        case 'active': return 'ACTIVE';
        case 'past_due': return 'PAST_DUE';
        case 'canceled':
        case 'unpaid': return 'CANCELED';
        case 'incomplete':
        case 'incomplete_expired': return 'UNPAID';
        default: return 'ACTIVE';
      }
    };
    
    const newStatus = mapStripeStatus(stripeSubscription.status);
    const updateData: any = {
      status: newStatus,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      updatedAt: new Date(),
    };
    
    // If subscription is canceled in Stripe, update canceledAt
    if (stripeSubscription.status === 'canceled') {
      updateData.canceledAt = stripeSubscription.canceled_at 
        ? new Date(stripeSubscription.canceled_at * 1000) 
        : new Date();
      
      // Also update tenant status
      await masterPrisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'CANCELLED' },
      });
    }
    
    // Update our database with Stripe's current state
    await masterPrisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
    
    // Fetch updated subscription
    const updated = await subscriptionService.getTenantSubscription(tenantId);
    
    res.json({ success: true, data: updated });
  })
);

// End trial and activate subscription (fixes "Trial ends..." display in Stripe)
router.post(
  '/subscription/end-trial',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const masterPrisma = getMasterPrisma();
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ success: false, error: 'No Stripe subscription found' });
    }
    
    // End trial on Stripe
    const result = await stripeService.endTrialWithCredit(
      subscription.stripeSubscriptionId,
      0 // No credit needed - we track billing date separately
    );
    
    // Update our database status to ACTIVE
    await masterPrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
    
    // Fetch updated subscription
    const updated = await subscriptionService.getTenantSubscription(tenantId);
    
    res.json({ 
      success: true, 
      message: 'Trial ended, subscription is now active',
      stripeStatus: result.status,
      data: updated 
    });
  })
);

// Create Stripe Checkout Session for plan subscription
router.post(
  '/checkout/session',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug } = getTenantContext(req);
    const input = createCheckoutSessionSchema.parse(req.body);
    
    // Get plan details from database
    const masterPrisma = getMasterPrisma();
    const plan = await masterPrisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { id: input.planId },
          { slug: input.planId },
        ],
        isActive: true,
      },
    });
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Get tenant email
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });
    
    // Calculate price in cents
    const priceAmount = input.billingCycle === 'YEARLY'
      ? Math.round(Number(plan.yearlyPrice) * 100)
      : Math.round(Number(plan.monthlyPrice) * 100);
    
    if (priceAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot create checkout for free plans' 
      });
    }
    
    // Create Stripe Checkout Session
    const session = await stripeService.createCheckoutSession({
      tenantId,
      tenantSlug,
      tenantEmail: tenant?.email || `billing@${tenantSlug}.local`,
      planId: plan.id,
      planName: plan.name,
      billingCycle: input.billingCycle,
      priceAmount,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    
    res.json({ success: true, data: session });
  })
);

// Get Checkout Session status (for success page verification)
router.get(
  '/checkout/session/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const session = await stripeService.getCheckoutSession(req.params.sessionId);
    
    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
      },
    });
  })
);

// Complete checkout session - verifies and processes the session if webhook was missed
router.post(
  '/checkout/complete/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const { sessionId } = req.params;
    
    // Get the session from Stripe
    const session = await stripeService.getCheckoutSession(sessionId);
    
    // Verify the session belongs to this tenant
    if (session.metadata?.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Session does not belong to this tenant' });
    }
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        error: `Payment not completed. Status: ${session.payment_status}` 
      });
    }
    
    const masterPrisma = getMasterPrisma();
    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle as 'MONTHLY' | 'YEARLY';
    
    if (!planId) {
      return res.status(400).json({ success: false, error: 'Missing plan information in session' });
    }
    
    // Extract IDs from potentially expanded objects
    const stripeSubscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : (session.subscription as any)?.id;
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as any)?.id;
    
    // Check if already processed (subscription already updated)
    const existingSubscription = await masterPrisma.subscription.findFirst({
      where: { 
        tenantId,
        stripeSubscriptionId,
      },
    });
    
    if (existingSubscription) {
      // Already processed - serialize BigInt/Decimal values
      const serializedSub = JSON.parse(JSON.stringify(existingSubscription, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
      return res.json({ 
        success: true, 
        data: { message: 'Subscription already processed', subscription: serializedSub }
      });
    }
    
    // Get plan details
    const plan = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    
    if (!plan) {
      // Try to find by slug
      const planBySlug = await masterPrisma.subscriptionPlan.findFirst({
        where: { slug: planId },
      });
      
      if (!planBySlug) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
      }
    }
    
    const targetPlan = plan || await masterPrisma.subscriptionPlan.findFirst({ where: { slug: planId } });
    
    if (!targetPlan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
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
      ? Number(targetPlan.yearlyPrice) 
      : Number(targetPlan.monthlyPrice);
    
    // Create or update subscription
    const subscription = await masterPrisma.subscription.findFirst({
      where: { tenantId },
    });
    
    const subscriptionData = {
      planId: targetPlan.id,
      billingCycle,
      status: 'ACTIVE' as const,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
      amount,
      maxUsers: targetPlan.maxUsers,
      maxStorage: targetPlan.maxStorageGB,
      maxProjects: targetPlan.maxProjects,
      updatedAt: new Date(),
    };
    
    if (subscription) {
      await masterPrisma.subscription.update({
        where: { id: subscription.id },
        data: subscriptionData,
      });
    } else {
      await masterPrisma.subscription.create({
        data: {
          tenantId,
          ...subscriptionData,
        },
      });
    }
    
    // Get card details
    let cardBrand: string | null = null;
    let cardLast4: string | null = null;
    
    // Try to get card details from payment intent first
    const stripePaymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : (session.payment_intent as any)?.id || null;
    
    if (stripePaymentIntentId) {
      const cardDetails = await stripeService.getPaymentMethodFromIntent(stripePaymentIntentId);
      if (cardDetails) {
        cardBrand = cardDetails.brand;
        cardLast4 = cardDetails.last4;
      }
    }
    
    // If no card details from payment intent, try subscription
    if (!cardLast4 && stripeSubscriptionId) {
      const cardDetails = await stripeService.getPaymentMethodFromSubscription(stripeSubscriptionId);
      if (cardDetails) {
        cardBrand = cardDetails.brand;
        cardLast4 = cardDetails.last4;
      }
    }
    
    // Check if invoice already exists
    const existingInvoice = await masterPrisma.invoice.findFirst({
      where: { stripeCheckoutSessionId: session.id },
    });
    
    if (!existingInvoice) {
      // Create invoice
      await masterPrisma.invoice.create({
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
          stripePaymentIntentId,
          cardBrand,
          cardLast4,
          lineItems: [
            {
              description: `${targetPlan.name} Plan - ${billingCycle}`,
              quantity: 1,
              unitPrice: amount,
              total: amount,
            },
          ],
        },
      });
    }
    
    // Update tenant status to ACTIVE
    await masterPrisma.tenant.update({
      where: { id: tenantId },
      data: { 
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
    
    res.json({ 
      success: true, 
      data: { 
        message: 'Checkout completed successfully',
        planName: targetPlan.name,
      }
    });
  })
);

// Create Stripe Customer Portal session for managing payment methods
router.post(
  '/portal/session',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tenantSlug } = getTenantContext(req);
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({ success: false, error: 'returnUrl is required' });
    }
    
    // Get tenant's Stripe customer ID from subscription
    const masterPrisma = getMasterPrisma();
    const subscription = await masterPrisma.subscription.findFirst({
      where: { tenantId },
      select: { stripeCustomerId: true },
    });
    
    if (!subscription?.stripeCustomerId) {
      // Create customer if doesn't exist
      const customerId = await stripeService.getOrCreateCustomer(
        tenantId,
        `billing@${tenantSlug}.local`
      );
      
      const portalUrl = await stripeService.createCustomerPortalSession(customerId, returnUrl);
      return res.json({ success: true, data: { url: portalUrl } });
    }
    
    const portalUrl = await stripeService.createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );
    
    res.json({ success: true, data: { url: portalUrl } });
  })
);

// ============================================================================
// INVOICE ENDPOINTS
// ============================================================================

// List invoices
router.get(
  '/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    
    const result = await invoiceService.listTenantInvoices(tenantId, {
      status,
      page,
      pageSize,
    });
    
    // Return in expected format: { success, data: [...], total }
    res.json({ 
      success: true, 
      data: result.invoices, 
      total: result.total,
      page: result.page,
      pageSize: result.pageSize 
    });
  })
);

// Get invoice by ID
router.get(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  })
);

// Get invoice by number
router.get(
  '/invoices/number/:invoiceNumber',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceByNumber(req.params.invoiceNumber);
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  })
);

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

// List payments
router.get(
  '/payments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    
    const result = await paymentService.listTenantPayments(tenantId, {
      status,
      page,
      pageSize,
    });
    
    res.json({ success: true, ...result });
  })
);

// Create payment
router.post(
  '/payments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const input = createPaymentSchema.parse(req.body);
    
    const payment = await paymentService.createPayment({
      tenantId,
      amount: input.amount,
      paymentMethodId: input.paymentMethodId,
      invoiceId: input.invoiceId,
      description: input.description,
    });
    
    res.status(201).json({ success: true, data: payment });
  })
);

// Get payment by ID
router.get(
  '/payments/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, data: payment });
  })
);

// Refund payment
router.post(
  '/payments/:id/refund',
  asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.body;
    
    const payment = await paymentService.refundPayment(req.params.id, amount);
    
    res.json({ success: true, data: payment });
  })
);

// ============================================================================
// PAYMENT METHOD ENDPOINTS
// ============================================================================

// List payment methods
router.get(
  '/payment-methods',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const methods = await paymentService.listPaymentMethods(tenantId);
    
    res.json({ success: true, data: methods });
  })
);

// Add payment method
router.post(
  '/payment-methods',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const input = addPaymentMethodSchema.parse(req.body);
    
    const method = await paymentService.addPaymentMethod(
      tenantId,
      input.paymentMethodId,
      input.setAsDefault
    );
    
    res.status(201).json({ success: true, data: method });
  })
);

// Set default payment method
router.post(
  '/payment-methods/:id/default',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const method = await paymentService.setDefaultPaymentMethod(tenantId, req.params.id);
    
    res.json({ success: true, data: method });
  })
);

// Remove payment method
router.delete(
  '/payment-methods/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await paymentService.removePaymentMethod(req.params.id);
    res.json({ success: true, message: 'Payment method removed' });
  })
);

// Get setup intent for adding new card
router.post(
  '/payment-methods/setup-intent',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    // Get or create Stripe customer
    const customerId = await stripeService.getOrCreateCustomer(
      tenantId,
      `tenant-${tenantId}@billing.internal`
    );
    
    const setupIntent = await stripeService.createSetupIntent(customerId);
    
    res.json({ success: true, data: setupIntent });
  })
);

// ============================================================================
// USAGE ENDPOINTS
// ============================================================================

// Get current usage
router.get(
  '/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const usage = await usageService.getCurrentUsage(tenantId);
    
    res.json({ success: true, data: usage });
  })
);

// Get usage alerts
router.get(
  '/usage/alerts',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    
    const alerts = await usageService.getUsageAlerts(tenantId);
    
    res.json({ success: true, data: alerts });
  })
);

// ============================================================================
// BILLING PORTAL
// ============================================================================

// Create Stripe billing portal session
router.post(
  '/portal',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = getTenantContext(req);
    const { returnUrl } = req.body;
    
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    
    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer found',
      });
    }
    
    const url = await stripeService.createPortalSession(
      subscription.stripeCustomerId,
      returnUrl || 'https://app.example.com/settings/billing'
    );
    
    res.json({ success: true, data: { url } });
  })
);

// ============================================================================
// WEBHOOKS
// ============================================================================

// Stripe webhook handler (raw body required)
router.post(
  '/webhooks/stripe',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    const result = await webhookService.processWebhook(req.body, signature);
    
    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.message });
    }
  })
);

export default router;
