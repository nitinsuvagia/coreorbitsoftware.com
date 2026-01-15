/**
 * Pricing Plans Routes - CRUD for subscription plans
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMasterPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe (will use env variables)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_xxxx', {
  apiVersion: '2023-10-16',
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Features schema - accepts either object format or array of strings
const featuresObjectSchema = z.object({
  customDomain: z.boolean().default(false),
  ssoEnabled: z.boolean().default(false),
  advancedReports: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  prioritySupport: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
});

// Transform array of strings to features object
const featuresSchema = z.union([
  featuresObjectSchema,
  z.array(z.string()).transform((arr) => ({
    customDomain: arr.some(f => f.toLowerCase().includes('custom domain')),
    ssoEnabled: arr.some(f => f.toLowerCase().includes('sso')),
    advancedReports: arr.some(f => f.toLowerCase().includes('report')),
    apiAccess: arr.some(f => f.toLowerCase().includes('api')),
    prioritySupport: arr.some(f => f.toLowerCase().includes('priority') || f.toLowerCase().includes('support')),
    whiteLabel: arr.some(f => f.toLowerCase().includes('white label')),
  })),
]);

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).transform(s => s.toLowerCase().replace(/\s+/g, '-')).refine(s => /^[a-z0-9-]+$/.test(s), { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  description: z.string().max(500).optional(),
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']),
  monthlyPrice: z.number().min(0),
  yearlyPrice: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  maxUsers: z.number().int().min(-1), // -1 = unlimited
  maxStorage: z.number().int().min(-1), // in GB, -1 = unlimited
  maxProjects: z.number().int().min(-1).optional(),
  maxClients: z.number().int().min(-1).optional(),
  features: featuresSchema,
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

// Update schema - partial and strips unknown fields
const updatePlanSchema = createPlanSchema.partial().passthrough();

// ============================================================================
// ROUTES
// ============================================================================

// Get all plans
router.get('/', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const includeInactive = req.query.includeInactive === 'true';
    
    const plans = await masterPrisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
    
    // Convert BigInt to number for JSON serialization
    const formattedPlans = plans.map((plan: any) => ({
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: Number(plan.yearlyPrice),
      maxStorage: Number(plan.maxStorage),
      maxStorageGB: Math.round(Number(plan.maxStorage) / (1024 * 1024 * 1024)),
    }));
    
    res.json({ success: true, data: formattedPlans });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get plans');
    res.status(500).json({ success: false, error: 'Failed to get plans' });
  }
});

// Get plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    const plan = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: req.params.id },
    });
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    res.json({ 
      success: true, 
      data: {
        ...plan,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: Number(plan.yearlyPrice),
        maxStorage: Number(plan.maxStorage),
        maxStorageGB: Math.round(Number(plan.maxStorage) / (1024 * 1024 * 1024)),
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get plan');
    res.status(500).json({ success: false, error: 'Failed to get plan' });
  }
});

// Create new plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createPlanSchema.parse(req.body);
    const masterPrisma = getMasterPrisma();
    
    // Check if slug already exists
    const existing = await masterPrisma.subscriptionPlan.findUnique({
      where: { slug: parsed.slug },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Plan slug already exists' });
    }
    
    // Create Stripe products and prices if Stripe is configured
    let stripePriceIdMonthly: string | null = null;
    let stripePriceIdYearly: string | null = null;
    
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('xxxx')) {
      try {
        // Create Stripe product
        const product = await stripe.products.create({
          name: parsed.name,
          description: parsed.description || undefined,
          metadata: { planSlug: parsed.slug },
        });
        
        // Create monthly price
        if (parsed.monthlyPrice > 0) {
          const monthlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(parsed.monthlyPrice * 100),
            currency: parsed.currency.toLowerCase(),
            recurring: { interval: 'month' },
          });
          stripePriceIdMonthly = monthlyPrice.id;
        }
        
        // Create yearly price
        if (parsed.yearlyPrice > 0) {
          const yearlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(parsed.yearlyPrice * 100),
            currency: parsed.currency.toLowerCase(),
            recurring: { interval: 'year' },
          });
          stripePriceIdYearly = yearlyPrice.id;
        }
      } catch (stripeError: any) {
        logger.warn({ error: stripeError }, 'Failed to create Stripe products, continuing without');
      }
    }
    
    const plan = await masterPrisma.subscriptionPlan.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
        tier: parsed.tier,
        monthlyPrice: parsed.monthlyPrice,
        yearlyPrice: parsed.yearlyPrice,
        currency: parsed.currency,
        maxUsers: parsed.maxUsers,
        maxStorage: parsed.maxStorage, // Store in GB directly
        maxProjects: parsed.maxProjects,
        maxClients: parsed.maxClients,
        features: parsed.features,
        isActive: parsed.isActive,
        isPublic: parsed.isPublic,
        stripePriceIdMonthly,
        stripePriceIdYearly,
      },
    });
    
    logger.info({ planId: plan.id, adminId: req.headers['x-user-id'] }, 'Plan created');
    
    res.status(201).json({ 
      success: true, 
      data: {
        ...plan,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: Number(plan.yearlyPrice),
        maxStorage: Number(plan.maxStorage),
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error }, 'Failed to create plan');
    res.status(500).json({ success: false, error: 'Failed to create plan' });
  }
});

// Update plan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const parsed = updatePlanSchema.parse(req.body);
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // If slug changed, check for duplicates
    if (parsed.slug && parsed.slug !== existing.slug) {
      const duplicate = await masterPrisma.subscriptionPlan.findUnique({
        where: { slug: parsed.slug },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Plan slug already exists' });
      }
    }
    
    // Prepare update data - only include known fields
    const updateData: any = {};
    
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.slug !== undefined) updateData.slug = parsed.slug;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.tier !== undefined) updateData.tier = parsed.tier;
    if (parsed.monthlyPrice !== undefined) updateData.monthlyPrice = parsed.monthlyPrice;
    if (parsed.yearlyPrice !== undefined) updateData.yearlyPrice = parsed.yearlyPrice;
    if (parsed.currency !== undefined) updateData.currency = parsed.currency;
    if (parsed.maxUsers !== undefined) updateData.maxUsers = parsed.maxUsers;
    if (parsed.maxProjects !== undefined) updateData.maxProjects = parsed.maxProjects;
    if (parsed.maxClients !== undefined) updateData.maxClients = parsed.maxClients;
    if (parsed.features !== undefined) updateData.features = parsed.features;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
    if (parsed.isPublic !== undefined) updateData.isPublic = parsed.isPublic;
    if (parsed.maxStorage !== undefined) updateData.maxStorage = parsed.maxStorage; // Store in GB directly
    
    const plan = await masterPrisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    logger.info({ planId: plan.id, adminId: req.headers['x-user-id'] }, 'Plan updated');
    
    // Convert BigInt and Decimal values to Numbers for JSON serialization
    res.json({ 
      success: true, 
      data: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        tier: plan.tier,
        isActive: plan.isActive,
        isPublic: plan.isPublic,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: Number(plan.yearlyPrice),
        currency: plan.currency,
        maxUsers: plan.maxUsers,
        maxStorage: Number(plan.maxStorage),
        maxProjects: plan.maxProjects,
        maxClients: plan.maxClients,
        features: plan.features,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Failed to update plan');
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

// Delete plan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    // Check if plan has active subscriptions
    const activeSubscriptions = await masterPrisma.subscription.count({
      where: { 
        planId: req.params.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });
    
    if (activeSubscriptions > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete plan with ${activeSubscriptions} active subscription(s). Deactivate the plan instead.` 
      });
    }
    
    await masterPrisma.subscriptionPlan.delete({
      where: { id: req.params.id },
    });
    
    logger.info({ planId: req.params.id, adminId: req.headers['x-user-id'] }, 'Plan deleted');
    
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete plan');
    res.status(500).json({ success: false, error: 'Failed to delete plan' });
  }
});

// Toggle plan active status
router.patch('/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const masterPrisma = getMasterPrisma();
    
    const existing = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    const plan = await masterPrisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    
    logger.info({ 
      planId: plan.id, 
      isActive: plan.isActive,
      adminId: req.headers['x-user-id'] 
    }, 'Plan active status toggled');
    
    res.json({ 
      success: true, 
      data: {
        ...plan,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: Number(plan.yearlyPrice),
        maxStorage: Number(plan.maxStorage),
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to toggle plan status');
    res.status(500).json({ success: false, error: 'Failed to toggle plan status' });
  }
});

// Sync plan with Stripe
router.post('/:id/sync-stripe', async (req: Request, res: Response) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('xxxx')) {
      return res.status(400).json({ success: false, error: 'Stripe not configured' });
    }
    
    const masterPrisma = getMasterPrisma();
    const plan = await masterPrisma.subscriptionPlan.findUnique({
      where: { id: req.params.id },
    });
    
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    // Create or update Stripe product
    let productId: string;
    
    if (plan.stripePriceIdMonthly) {
      // Get existing product
      const price = await stripe.prices.retrieve(plan.stripePriceIdMonthly);
      productId = price.product as string;
      
      // Update product
      await stripe.products.update(productId, {
        name: plan.name,
        description: plan.description || undefined,
      });
    } else {
      // Create new product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || undefined,
        metadata: { planSlug: plan.slug, planId: plan.id },
      });
      productId = product.id;
    }
    
    // Create new prices (Stripe prices are immutable)
    const monthlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(Number(plan.monthlyPrice) * 100),
      currency: plan.currency.toLowerCase(),
      recurring: { interval: 'month' },
    });
    
    const yearlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(Number(plan.yearlyPrice) * 100),
      currency: plan.currency.toLowerCase(),
      recurring: { interval: 'year' },
    });
    
    // Update plan with new price IDs
    const updatedPlan = await masterPrisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data: {
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdYearly: yearlyPrice.id,
      },
    });
    
    logger.info({ planId: plan.id, adminId: req.headers['x-user-id'] }, 'Plan synced with Stripe');
    
    res.json({ 
      success: true, 
      message: 'Plan synced with Stripe',
      data: {
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdYearly: yearlyPrice.id,
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to sync plan with Stripe');
    res.status(500).json({ success: false, error: error.message || 'Failed to sync with Stripe' });
  }
});

export default router;
