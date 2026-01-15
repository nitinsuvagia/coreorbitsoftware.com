/**
 * Report Service Configuration
 */

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3009', 10),
  
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Database
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/oms_master',
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'oms-reports-dev',
    s3Endpoint: process.env.AWS_S3_ENDPOINT, // For MinIO
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  reports: {
    // Report retention
    retentionDays: 30,
    
    // Export settings
    maxRowsExcel: 100000,
    maxRowsPdf: 10000,
    
    // Chart settings
    chartWidth: 800,
    chartHeight: 400,
    
    // Cache TTL
    cacheTtlSeconds: 300, // 5 minutes
    
    // Storage path
    storagePath: 'reports/{tenantSlug}/{year}/{month}',
  },
  
  analytics: {
    // Aggregation periods
    periods: ['day', 'week', 'month', 'quarter', 'year'],
    
    // Dashboard cache
    dashboardCacheTtl: 60, // 1 minute
  },
  
  scheduled: {
    // Daily reports generation time (cron format)
    dailyReportTime: '0 6 * * *', // 6 AM
    
    // Weekly report day (0 = Sunday)
    weeklyReportDay: 1, // Monday
    
    // Monthly report day
    monthlyReportDay: 1, // 1st of month
  },
};
