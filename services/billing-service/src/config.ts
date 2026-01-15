/**
 * Billing Service Configuration
 */

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.BILLING_SERVICE_PORT || process.env.PORT || '3006', 10),
  
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Database
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master',
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_xxxx',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_xxxx',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_xxxx',
  },
  
  billing: {
    // Invoice settings
    invoiceDueDays: 30,
    invoicePrefix: 'INV-',
    
    // Payment settings
    paymentRetryAttempts: 3,
    paymentRetryIntervalDays: [3, 5, 7], // Days between retry attempts
    
    // Grace period after failed payment
    gracePeriodDays: 7,
    
    // Subscription settings
    trialDays: 14,
    prorateOnPlanChange: true,
    
    // Currency
    defaultCurrency: 'usd',
    
    // Tax settings
    collectTax: true,
    defaultTaxRate: 0.0, // Can be overridden per tenant
  },
  
  plans: {
    // Predefined subscription plans
    starter: {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: {
        maxEmployees: 10,
        maxProjects: 5,
        maxStorage: 5 * 1024 * 1024 * 1024, // 5 GB
        customDomain: false,
        ssoEnabled: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 79,
      yearlyPrice: 790,
      features: {
        maxEmployees: 50,
        maxProjects: 25,
        maxStorage: 25 * 1024 * 1024 * 1024, // 25 GB
        customDomain: true,
        ssoEnabled: false,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: false,
      },
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: {
        maxEmployees: -1, // Unlimited
        maxProjects: -1, // Unlimited
        maxStorage: 100 * 1024 * 1024 * 1024, // 100 GB
        customDomain: true,
        ssoEnabled: true,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: true,
      },
    },
  },
  
  usageMetrics: {
    // Usage-based billing metrics
    additionalEmployee: {
      id: 'additional_employee',
      name: 'Additional Employee',
      unitPrice: 5,
      unit: 'employee',
    },
    additionalStorage: {
      id: 'additional_storage',
      name: 'Additional Storage',
      unitPrice: 0.1,
      unit: 'gb',
    },
    apiCalls: {
      id: 'api_calls',
      name: 'API Calls',
      unitPrice: 0.001,
      unit: 'call',
      freeQuota: 10000,
    },
  },
};

export type PlanId = keyof typeof config.plans;
export type UsageMetricId = keyof typeof config.usageMetrics;
