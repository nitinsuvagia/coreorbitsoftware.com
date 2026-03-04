/**
 * Employee Custom Fields Routes - API endpoints for managing key-value custom fields
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get Prisma client from request
 */
function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request');
  }
  return prisma;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createCustomFieldSchema = z.object({
  fieldKey: z.string().min(1).max(255),
  fieldValue: z.string().optional().nullable(),
  fieldType: z.enum(['text', 'number', 'date', 'boolean']).default('text'),
});

const updateCustomFieldSchema = z.object({
  fieldValue: z.string().optional().nullable(),
  fieldType: z.enum(['text', 'number', 'date', 'boolean']).optional(),
});

const bulkUpdateSchema = z.object({
  fields: z.array(z.object({
    fieldKey: z.string().min(1).max(255),
    fieldValue: z.string().optional().nullable(),
    fieldType: z.enum(['text', 'number', 'date', 'boolean']).default('text'),
  })),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /employees/:employeeId/custom-fields
 * Get all custom fields for an employee
 */
router.get('/:employeeId/custom-fields', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    const customFields = await prisma.employeeCustomField.findMany({
      where: { employeeId },
      orderBy: { fieldKey: 'asc' },
    });

    res.json({
      success: true,
      data: customFields.map(cf => ({
        id: cf.id,
        key: cf.fieldKey,
        value: cf.fieldValue,
        type: cf.fieldType,
        source: cf.source,
        createdAt: cf.createdAt,
        updatedAt: cf.updatedAt,
      })),
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get custom fields');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: (error as Error).message },
    });
  }
});

/**
 * POST /employees/:employeeId/custom-fields
 * Add a new custom field for an employee
 */
router.post('/:employeeId/custom-fields', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const data = createCustomFieldSchema.parse(req.body);

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    // Check if field key already exists
    const existing = await prisma.employeeCustomField.findUnique({
      where: {
        employeeId_fieldKey: {
          employeeId,
          fieldKey: data.fieldKey,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: `Field "${data.fieldKey}" already exists for this employee` },
      });
    }

    const customField = await prisma.employeeCustomField.create({
      data: {
        employeeId,
        fieldKey: data.fieldKey,
        fieldValue: data.fieldValue || null,
        fieldType: data.fieldType,
        source: 'manual',
      },
    });

    logger.info({ employeeId, fieldKey: data.fieldKey }, 'Custom field created');

    res.status(201).json({
      success: true,
      data: {
        id: customField.id,
        key: customField.fieldKey,
        value: customField.fieldValue,
        type: customField.fieldType,
        source: customField.source,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create custom field');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: (error as Error).message },
    });
  }
});

/**
 * PUT /employees/:employeeId/custom-fields/:fieldId
 * Update a custom field
 */
router.put('/:employeeId/custom-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, fieldId } = req.params;
    const data = updateCustomFieldSchema.parse(req.body);

    // Verify custom field exists and belongs to employee
    const existing = await prisma.employeeCustomField.findFirst({
      where: { id: fieldId, employeeId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Custom field not found' },
      });
    }

    const updated = await prisma.employeeCustomField.update({
      where: { id: fieldId },
      data: {
        fieldValue: data.fieldValue !== undefined ? data.fieldValue : existing.fieldValue,
        fieldType: data.fieldType || existing.fieldType,
      },
    });

    logger.info({ employeeId, fieldId }, 'Custom field updated');

    res.json({
      success: true,
      data: {
        id: updated.id,
        key: updated.fieldKey,
        value: updated.fieldValue,
        type: updated.fieldType,
        source: updated.source,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update custom field');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /employees/:employeeId/custom-fields/:fieldId
 * Delete a custom field
 */
router.delete('/:employeeId/custom-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId, fieldId } = req.params;

    // Verify custom field exists and belongs to employee
    const existing = await prisma.employeeCustomField.findFirst({
      where: { id: fieldId, employeeId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Custom field not found' },
      });
    }

    await prisma.employeeCustomField.delete({
      where: { id: fieldId },
    });

    logger.info({ employeeId, fieldId, fieldKey: existing.fieldKey }, 'Custom field deleted');

    res.json({
      success: true,
      message: 'Custom field deleted successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete custom field');
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: (error as Error).message },
    });
  }
});

/**
 * PUT /employees/:employeeId/custom-fields
 * Bulk update/create custom fields (upsert many)
 */
router.put('/:employeeId/custom-fields', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const { employeeId } = req.params;
    const { fields } = bulkUpdateSchema.parse(req.body);

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, deletedAt: null },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    // Upsert each field
    const results = await Promise.all(
      fields.map(field =>
        prisma.employeeCustomField.upsert({
          where: {
            employeeId_fieldKey: {
              employeeId,
              fieldKey: field.fieldKey,
            },
          },
          update: {
            fieldValue: field.fieldValue || null,
            fieldType: field.fieldType,
          },
          create: {
            employeeId,
            fieldKey: field.fieldKey,
            fieldValue: field.fieldValue || null,
            fieldType: field.fieldType,
            source: 'manual',
          },
        })
      )
    );

    logger.info({ employeeId, fieldCount: fields.length }, 'Custom fields bulk updated');

    res.json({
      success: true,
      data: results.map(cf => ({
        id: cf.id,
        key: cf.fieldKey,
        value: cf.fieldValue,
        type: cf.fieldType,
        source: cf.source,
      })),
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to bulk update custom fields');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'BULK_UPDATE_ERROR', message: (error as Error).message },
    });
  }
});

export default router;
