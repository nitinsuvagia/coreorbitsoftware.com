/**
 * API Gateway - Configuration
 */

export interface GatewayConfig {
  // Server
  port: number;
  host: string;
  nodeEnv: string;
  
  // Domain Configuration
  mainDomain: string;
  platformAdminSubdomain?: string;
  allowCustomDomains: boolean;
  
  // JWT
  jwtSecret: string;
  jwtAccessTokenExpiry: string;
  jwtRefreshTokenExpiry: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  redisUrl?: string;
  
  // CORS
  corsOrigins: string[];
  
  // Service URLs
  authServiceUrl: string;
  employeeServiceUrl: string;
  attendanceServiceUrl: string;
  projectServiceUrl: string;
  taskServiceUrl: string;
  clientServiceUrl: string;
  documentServiceUrl: string;
  assetServiceUrl: string;
  hrPayrollServiceUrl: string;
  meetingServiceUrl: string;
  recruitmentServiceUrl: string;
  notificationServiceUrl: string;
  fileServiceUrl: string;
  reportServiceUrl: string;
  billingServiceUrl: string;
  
  // Logging
  logLevel: string;
}

export const config: GatewayConfig = {
  // Server
  port: parseInt(process.env.PORT || process.env.GATEWAY_PORT || '4000'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Domain Configuration
  mainDomain: process.env.MAIN_DOMAIN || 'youroms.com',
  platformAdminSubdomain: process.env.PLATFORM_ADMIN_SUBDOMAIN,
  allowCustomDomains: process.env.ALLOW_CUSTOM_DOMAINS === 'true',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long',
  jwtAccessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
  jwtRefreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  
  // Rate Limiting (increased for development - 10000 requests per minute)
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'),
  redisUrl: process.env.REDIS_URL,
  
  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
  
  // Service URLs
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  employeeServiceUrl: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002',
  attendanceServiceUrl: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3003',
  projectServiceUrl: process.env.PROJECT_SERVICE_URL || 'http://localhost:3004',
  taskServiceUrl: process.env.TASK_SERVICE_URL || 'http://localhost:3005',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
  clientServiceUrl: process.env.CLIENT_SERVICE_URL || 'http://localhost:3006',
  documentServiceUrl: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007',
  assetServiceUrl: process.env.ASSET_SERVICE_URL || 'http://localhost:3007',
  hrPayrollServiceUrl: process.env.HR_PAYROLL_SERVICE_URL || 'http://localhost:3008',
  meetingServiceUrl: process.env.MEETING_SERVICE_URL || 'http://localhost:3009',
  recruitmentServiceUrl: process.env.RECRUITMENT_SERVICE_URL || 'http://localhost:3010',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
  fileServiceUrl: process.env.FILE_SERVICE_URL || 'http://localhost:3007',
  reportServiceUrl: process.env.REPORT_SERVICE_URL || 'http://localhost:3009',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
