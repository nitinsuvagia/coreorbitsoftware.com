/**
 * Email Template Service
 * Handles loading, caching, and rendering email templates
 */

import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

// ============================================================================
// TEMPLATE CACHE
// ============================================================================

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

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
 * Load and compile template
 */
function loadTemplate(templateName: string, emailType: 'platform' | 'tenant' = 'tenant'): Handlebars.TemplateDelegate | null {
  const cacheKey = `${emailType}:${templateName}`;
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }
  
  const templatePath = getTemplatePath(templateName, emailType);
  
  if (!existsSync(templatePath)) {
    logger.warn({ templateName, emailType, templatePath }, 'Email template not found');
    return null;
  }
  
  try {
    const source = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    templateCache.set(cacheKey, template);
    return template;
  } catch (error) {
    logger.error({ templateName, emailType, error }, 'Failed to compile template');
    return null;
  }
}

/**
 * Render template with data
 */
export function renderTemplate(
  templateName: string,
  data: TemplateData,
  emailType: 'platform' | 'tenant' = 'tenant'
): EmailTemplate | null {
  const contentTemplate = loadTemplate(templateName, emailType);
  
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
  const baseTemplate = loadTemplate('base', emailType);
  
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
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
  logger.info('Template cache cleared');
}

/**
 * Preload common templates
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
  ];
  
  for (const templateName of commonTemplates) {
    loadTemplate(templateName, emailType);
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
} as const;

export type EmailTemplateName = typeof EmailTemplates[keyof typeof EmailTemplates];
