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
  planId: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional(),
  startTrial: z.boolean().optional().default(true),
});

const updateSubscriptionSchema = z.object({
  planId: z.enum(['starter', 'professional', 'enterprise']).optional(),
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
    
    res.json({ success: true, ...result });
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
