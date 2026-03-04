/**
 * Email Template Service
 * Handles loading, caching, and rendering email templates
 * 
 * Priority: Database templates > File system templates
 */

import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { getTenantPrisma } from '@oms/database';

// ============================================================================
// TEMPLATE CACHE
// ============================================================================

// Cache for file-based templates
const fileTemplateCache = new Map<string, Handlebars.TemplateDelegate>();

// Cache for database templates (tenant-aware)
const dbTemplateCache = new Map<string, {
  subject: string;
  htmlContent: string;
  textContent?: string;
  compiledHtml: Handlebars.TemplateDelegate;
  compiledSubject: Handlebars.TemplateDelegate;
  cachedAt: number;
}>();

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

Handlebars.registerHelper('formatDateTime', function(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

Handlebars.registerHelper('currency', function(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
});

Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
  switch (operator) {
    case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default: return options.inverse(this);
  }
});

// ============================================================================
// TEMPLATE LOADING
// ============================================================================

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface TemplateData {
  [key: string]: any;
}

/**
 * Get template path
 */
function getTemplatePath(templateName: string, emailType: 'platform' | 'tenant' = 'tenant'): string {
  const basePath = process.env.TEMPLATE_PATH || join(__dirname, '../../templates');
  return join(basePath, emailType, `${templateName}.hbs`);
}

/**
 * Load and compile template from file system
 */
function loadFileTemplate(templateName: string, emailType: 'platform' | 'tenant' = 'tenant'): Handlebars.TemplateDelegate | null {
  const cacheKey = `${emailType}:${templateName}`;
  
  if (fileTemplateCache.has(cacheKey)) {
    return fileTemplateCache.get(cacheKey)!;
  }
  
  const templatePath = getTemplatePath(templateName, emailType);
  
  if (!existsSync(templatePath)) {
    logger.warn({ templateName, emailType, templatePath }, 'Email template file not found');
    return null;
  }
  
  try {
    const source = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    fileTemplateCache.set(cacheKey, template);
    return template;
  } catch (error) {
    logger.error({ templateName, emailType, error }, 'Failed to compile template file');
    return null;
  }
}

/**
 * Load template from database for a tenant
 */
async function loadDbTemplate(templateName: string, tenantSlug: string): Promise<{
  subject: string;
  htmlContent: string;
  textContent?: string;
  compiledHtml: Handlebars.TemplateDelegate;
  compiledSubject: Handlebars.TemplateDelegate;
} | null> {
  const cacheKey = `${tenantSlug}:${templateName}`;
  
  // Check cache
  const cached = dbTemplateCache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached;
  }
  
  try {
    const prisma = await getTenantPrisma(tenantSlug);
    
    const template = await prisma.emailTemplate.findFirst({
      where: {
        name: templateName,
        isActive: true,
      },
    });
    
    if (!template) {
      return null;
    }
    
    const compiled = {
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || undefined,
      compiledHtml: Handlebars.compile(template.htmlContent),
      compiledSubject: Handlebars.compile(template.subject),
      cachedAt: Date.now(),
    };
    
    dbTemplateCache.set(cacheKey, compiled);
    return compiled;
  } catch (error) {
    logger.error({ templateName, tenantSlug, error }, 'Failed to load template from database');
    return null;
  }
}

/**
 * Render template with data - checks database first, then file system
 */
export async function renderTemplateForTenant(
  templateName: string,
  data: TemplateData,
  tenantSlug: string
): Promise<EmailTemplate | null> {
  // Try database template first
  const dbTemplate = await loadDbTemplate(templateName, tenantSlug);
  
  if (dbTemplate) {
    const templateData: TemplateData = {
      ...data,
      year: new Date().getFullYear(),
      platformUrl: process.env.APP_URL || 'http://localhost:3000',
    };
    
    const subject = dbTemplate.compiledSubject(templateData);
    const body = dbTemplate.compiledHtml(templateData);
    
    // Try to wrap in base template
    const baseDbTemplate = await loadDbTemplate('base', tenantSlug);
    let html: string;
    
    if (baseDbTemplate) {
      html = baseDbTemplate.compiledHtml({ ...templateData, body });
    } else {
      // Fallback to file-based base template
      const baseFileTemplate = loadFileTemplate('base', 'tenant');
      if (baseFileTemplate) {
        html = baseFileTemplate({ ...templateData, body });
      } else {
        html = body;
      }
    }
    
    // Generate text version
    const text = dbTemplate.textContent || html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return { subject, html, text };
  }
  
  // Fallback to file system template
  return renderTemplate(templateName, data, 'tenant');
}

/**
 * Render template from file system with data (backward compatibility)
 */
export function renderTemplate(
  templateName: string,
  data: TemplateData,
  emailType: 'platform' | 'tenant' = 'tenant'
): EmailTemplate | null {
  const contentTemplate = loadFileTemplate(templateName, emailType);
  
  if (!contentTemplate) {
    return null;
  }
  
  // Add common data with explicit types
  const templateData: TemplateData = {
    ...data,
    year: new Date().getFullYear(),
    platformUrl: process.env.APP_URL || 'http://localhost:3000',
    headerTitle: data.headerTitle || 'Office Management System',
    subject: data.subject || 'Notification from OMS',
  };
  
  // Render content
  const body = contentTemplate(templateData);
  
  // Load base template if it exists
  const baseTemplate = loadFileTemplate('base', emailType);
  
  let html: string;
  if (baseTemplate) {
    html = baseTemplate({
      ...templateData,
      body,
    });
  } else {
    html = body;
  }
  
  // Generate text version (strip HTML)
  const text = html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    subject: templateData.subject as string,
    html,
    text,
  };
}

/**
 * Render template from raw content (used for preview and test emails)
 */
export function renderTemplateFromDb(
  subject: string,
  htmlContent: string,
  data: TemplateData
): EmailTemplate {
  const compiledSubject = Handlebars.compile(subject);
  const compiledHtml = Handlebars.compile(htmlContent);
  
  const templateData: TemplateData = {
    ...data,
    year: new Date().getFullYear(),
    platformUrl: process.env.APP_URL || 'http://localhost:3000',
  };
  
  const renderedSubject = compiledSubject(templateData);
  const html = compiledHtml(templateData);
  
  // Generate text version (strip HTML)
  const text = html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    subject: renderedSubject,
    html,
    text,
  };
}

/**
 * Clear template cache (for specific tenant or all)
 */
export function clearTemplateCache(tenantSlug?: string): void {
  if (tenantSlug) {
    // Clear only tenant-specific db cache
    for (const key of dbTemplateCache.keys()) {
      if (key.startsWith(`${tenantSlug}:`)) {
        dbTemplateCache.delete(key);
      }
    }
    logger.info({ tenantSlug }, 'Tenant template cache cleared');
  } else {
    // Clear all caches
    fileTemplateCache.clear();
    dbTemplateCache.clear();
    logger.info('All template caches cleared');
  }
}

/**
 * Preload common templates from file system
 */
export function preloadTemplates(emailType: 'platform' | 'tenant' = 'platform'): void {
  const commonTemplates = [
    'base',
    'welcome',
    'password-reset',
    'role-changed',
    'account-suspended',
    'account-activated',
    'custom-message',
    'tenant-registration',
  ];
  
  for (const templateName of commonTemplates) {
    loadFileTemplate(templateName, emailType);
  }
  
  logger.info({ emailType, count: commonTemplates.length }, 'Templates preloaded');
}

// ============================================================================
// PREDEFINED TEMPLATES
// ============================================================================

export const EmailTemplates = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  ROLE_CHANGED: 'role-changed',
  ACCOUNT_SUSPENDED: 'account-suspended',
  ACCOUNT_ACTIVATED: 'account-activated',
  CUSTOM_MESSAGE: 'custom-message',
  TENANT_REGISTRATION: 'tenant-registration',
} as const;

export type EmailTemplateName = typeof EmailTemplates[keyof typeof EmailTemplates];
