/**
 * Client Routes - API endpoints for client management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import {
  createClient,
  getClientById,
  updateClient,
  listClients,
  deactivateClient,
  addClientContact,
  updateClientContact,
  removeClientContact,
  createClientContract,
  getClientContracts,
  updateClientContract,
  getClientStats,
} from '../services/client.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
}).optional();

const createClientSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20).optional(),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  address: addressSchema,
  billingAddress: addressSchema,
  taxId: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  address: addressSchema,
  billingAddress: addressSchema,
  taxId: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
});

const createContactSchema = z.object({
  clientId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

const createContractSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(2).max(200),
  contractNumber: z.string().max(50).optional(),
  type: z.enum(['fixed_price', 'time_and_material', 'retainer', 'milestone']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valueCents: z.number().min(0),
  currency: z.string().length(3).optional(),
  hourlyRateCents: z.number().min(0).optional(),
  monthlyRetainerCents: z.number().min(0).optional(),
  terms: z.string().max(5000).optional(),
  attachmentUrl: z.string().url().optional(),
});

const listClientsSchema = z.object({
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// CLIENT ROUTES
// ============================================================================

/**
 * POST /clients
 */
router.post(
  '/',
  validateBody(createClientSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const userId = (req as any).userId;
      
      const client = await createClient(prisma, req.body, userId);
      
      res.status(201).json({
        message: 'Client created successfully',
        data: client,
      });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Create client failed');
      if ((error as Error).message.includes('already exists')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /clients
 */
router.get(
  '/',
  validateQuery(listClientsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      
      const result = await listClients(prisma, req.query as any);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /clients/:id
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const client = await getClientById(prisma, id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /clients/:id
 */
router.put(
  '/:id',
  validateBody(updateClientSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const client = await updateClient(prisma, id, req.body, userId);
      
      res.json({
        message: 'Client updated successfully',
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /clients/:id (deactivate)
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      await deactivateClient(prisma, id, userId);
      
      res.json({ message: 'Client deactivated successfully' });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Deactivate client failed');
      if ((error as Error).message.includes('Cannot deactivate')) {
        return res.status(400).json({ error: (error as Error).message });
      }
      next(error);
    }
  }
);

/**
 * GET /clients/:id/stats
 */
router.get(
  '/:id/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const stats = await getClientStats(prisma, id);
      
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CLIENT CONTACT ROUTES
// ============================================================================

/**
 * POST /clients/:id/contacts
 */
router.post(
  '/:id/contacts',
  validateBody(createContactSchema.omit({ clientId: true })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const contact = await addClientContact(
        prisma, 
        { ...req.body, clientId: id }, 
        userId
      );
      
      res.status(201).json({
        message: 'Contact added successfully',
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /clients/:clientId/contacts/:contactId
 */
router.put(
  '/:clientId/contacts/:contactId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { contactId } = req.params;
      const userId = (req as any).userId;
      
      const contact = await updateClientContact(prisma, contactId, req.body, userId);
      
      res.json({
        message: 'Contact updated successfully',
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /clients/:clientId/contacts/:contactId
 */
router.delete(
  '/:clientId/contacts/:contactId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { contactId } = req.params;
      const userId = (req as any).userId;
      
      await removeClientContact(prisma, contactId, userId);
      
      res.json({ message: 'Contact removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CLIENT CONTRACT ROUTES
// ============================================================================

/**
 * POST /clients/:id/contracts
 */
router.post(
  '/:id/contracts',
  validateBody(createContractSchema.omit({ clientId: true })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const contract = await createClientContract(
        prisma, 
        { ...req.body, clientId: id }, 
        userId
      );
      
      res.status(201).json({
        message: 'Contract created successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /clients/:id/contracts
 */
router.get(
  '/:id/contracts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { id } = req.params;
      
      const contracts = await getClientContracts(prisma, id);
      
      res.json({ data: contracts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /clients/:clientId/contracts/:contractId
 */
router.put(
  '/:clientId/contracts/:contractId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prisma = await getTenantPrisma();
      const { contractId } = req.params;
      const userId = (req as any).userId;
      
      const contract = await updateClientContract(prisma, contractId, req.body, userId);
      
      res.json({
        message: 'Contract updated successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
