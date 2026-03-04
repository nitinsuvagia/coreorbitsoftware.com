/**
 * Setup Status Routes
 * - Tracks onboarding/setup completion for tenant admins
 */

import express, { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenant-context';
import { logger } from '../utils/logger';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { getMasterPrisma } from '../utils/database';

const router = express.Router();

/**
 * GET /setup-status
 * Returns the setup completion status for the current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const tenantSlug = tenantReq.tenantSlug || (req.headers['x-tenant-slug'] as string);
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    // Get tenant database connection
    const dbManager = getTenantDbManager();
    const prisma = await dbManager.getClientBySlug(tenantSlug);
    
    // Check various setup items from tenant database
    const [
      departments,
      designations,
      roles,
      employees,
      leaveTypes,
    ] = await Promise.all([
      prisma.department.count(),
      prisma.designation.count(),
      prisma.role.count(),
      prisma.employee.count(),
      prisma.leaveType.count(),
    ]);

    // Check if company has at least one department (indicates basic setup done)
    const companyProfileCompleted = departments > 0;
    
    // Check for email configuration in master DB tenant_settings
    let emailConfigured = false;
    let aiIntegrationEnabled = false;
    try {
      const masterPrisma = getMasterPrisma();
      const tenantSettings = await masterPrisma.$queryRaw<{ 
        email_configured: boolean;
        integration_settings: any;
      }[]>`
        SELECT ts.email_configured, ts.integration_settings 
        FROM tenant_settings ts
        JOIN tenants t ON t.id = ts.tenant_id
        WHERE t.slug = ${tenantSlug}
      `;
      emailConfigured = tenantSettings[0]?.email_configured === true;
      
      // Check AI integration from integration_settings JSON
      const integrationSettings = tenantSettings[0]?.integration_settings;
      if (integrationSettings?.openai?.apiKey && integrationSettings.openai.apiKey.length > 0) {
        aiIntegrationEnabled = true;
      }
    } catch {
      emailConfigured = false;
      aiIntegrationEnabled = false;
    }

    // Check for employee code, regional settings, and working hours configuration
    let employeeCodeConfigured = false;
    let regionalSettingsConfigured = false;
    let workingHoursConfigured = false;
    
    try {
      const masterPrisma = getMasterPrisma();
      const settings = await masterPrisma.$queryRaw<{ 
        employee_code_prefix: string;
        employee_code_include_year: boolean;
        employee_code_separator: string;
        employee_code_total_seq_digits: number;
        timezone: string;
        currency: string;
        date_format: string;
        weekly_working_hours: any;
        created_at: Date;
        updated_at: Date;
      }[]>`
        SELECT 
          ts.employee_code_prefix, 
          ts.employee_code_include_year,
          ts.employee_code_separator,
          ts.employee_code_total_seq_digits,
          ts.timezone, 
          ts.currency, 
          ts.date_format, 
          ts.weekly_working_hours, 
          ts.created_at, 
          ts.updated_at
        FROM tenant_settings ts
        JOIN tenants t ON t.id = ts.tenant_id
        WHERE t.slug = ${tenantSlug}
      `;
      
      const tenantSettings = settings[0];
      
      // Employee code is configured if:
      // 1. Prefix is different from default 'EMP', OR
      // 2. Include year is enabled, OR
      // 3. Separator is set, OR
      // 4. Total seq digits is different from default (5)
      // This allows users to configure without changing the prefix
      employeeCodeConfigured = !!(
        (tenantSettings?.employee_code_prefix && tenantSettings.employee_code_prefix !== 'EMP') ||
        tenantSettings?.employee_code_include_year === true ||
        (tenantSettings?.employee_code_separator && tenantSettings.employee_code_separator.length > 0) ||
        (tenantSettings?.employee_code_total_seq_digits && tenantSettings.employee_code_total_seq_digits !== 5)
      );
      
      // Regional settings configured if user has saved settings (updated_at differs from created_at)
      // This means user has explicitly reviewed/saved settings, even if keeping defaults
      if (tenantSettings?.created_at && tenantSettings?.updated_at) {
        const createdTime = new Date(tenantSettings.created_at).getTime();
        const updatedTime = new Date(tenantSettings.updated_at).getTime();
        // Consider configured if settings were updated at least 1 second after creation
        regionalSettingsConfigured = (updatedTime - createdTime) > 1000;
      }
      
      // Working hours configured if weekly_working_hours is set
      workingHoursConfigured = !!(tenantSettings?.weekly_working_hours);
    } catch {
      employeeCodeConfigured = false;
      regionalSettingsConfigured = false;
      workingHoursConfigured = false;
    }
    
    // Check if setup checklist was dismissed
    let dismissed = false;
    try {
      const masterPrisma = getMasterPrisma();
      const dismissedResult = await masterPrisma.$queryRaw<{ 
        setup_checklist_dismissed: boolean;
      }[]>`
        SELECT ts.setup_checklist_dismissed
        FROM tenant_settings ts
        JOIN tenants t ON t.id = ts.tenant_id
        WHERE t.slug = ${tenantSlug}
      `;
      dismissed = dismissedResult[0]?.setup_checklist_dismissed === true;
    } catch {
      dismissed = false;
    }

    const status = {
      companyProfileCompleted,
      departmentsCreated: departments > 0,
      designationsCreated: designations > 0,
      rolesConfigured: roles > 0,
      employeeCodeConfigured,
      regionalSettingsConfigured,
      workingHoursConfigured,
      leaveTypesConfigured: leaveTypes > 0,
      emailConfigured,
      aiIntegrationEnabled,
      dismissed,
    };

    logger.info({ 
      tenantSlug, 
      status,
      counts: { departments, designations, roles, employees, leaveTypes }
    }, 'Setup status retrieved');

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching setup status');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setup status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /setup-status/dismiss
 * Marks the setup checklist as dismissed for the current tenant
 */
router.post('/dismiss', async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const tenantSlug = tenantReq.tenantSlug || (req.headers['x-tenant-slug'] as string);
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    // Update tenant_settings to mark checklist as dismissed
    const masterPrisma = getMasterPrisma();
    await masterPrisma.$executeRaw`
      UPDATE tenant_settings ts
      SET setup_checklist_dismissed = true,
          setup_checklist_dismissed_at = NOW()
      FROM tenants t
      WHERE t.id = ts.tenant_id AND t.slug = ${tenantSlug}
    `;

    logger.info({ tenantSlug }, 'Setup checklist dismissed');

    res.json({
      success: true,
      message: 'Setup checklist dismissed',
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error dismissing setup checklist');
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss setup checklist',
    });
  }
});

/**
 * POST /setup-status/reset
 * Resets the setup checklist dismissed status (for testing/admin)
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const tenantSlug = tenantReq.tenantSlug || (req.headers['x-tenant-slug'] as string);
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    // Reset the dismissed state in database
    const masterPrisma = getMasterPrisma();
    await masterPrisma.$executeRaw`
      UPDATE tenant_settings ts
      SET setup_checklist_dismissed = false,
          setup_checklist_dismissed_at = NULL
      FROM tenants t
      WHERE t.id = ts.tenant_id AND t.slug = ${tenantSlug}
    `;

    logger.info({ tenantSlug }, 'Setup checklist reset');

    res.json({
      success: true,
      message: 'Setup checklist reset',
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error resetting setup checklist');
    res.status(500).json({
      success: false,
      error: 'Failed to reset setup checklist',
    });
  }
});

export default router;
