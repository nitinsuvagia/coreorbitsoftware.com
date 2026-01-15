/**
 * Project Service Configuration
 */

export const config = {
  // Server
  port: parseInt(process.env.PROJECT_SERVICE_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/oms_master',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // AWS
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Time Tracking Settings
  timeTracking: {
    // Minimum time entry duration in minutes
    minEntryMinutes: parseInt(process.env.MIN_TIME_ENTRY_MINUTES || '15', 10),
    
    // Maximum hours per day per employee
    maxHoursPerDay: parseInt(process.env.MAX_HOURS_PER_DAY || '16', 10),
    
    // Auto-approve time entries below this threshold (minutes)
    autoApproveThresholdMinutes: parseInt(process.env.AUTO_APPROVE_THRESHOLD || '480', 10),
    
    // Allow future date entries
    allowFutureDates: process.env.ALLOW_FUTURE_TIME_ENTRIES === 'true',
    
    // Days allowed to edit past entries
    pastEditWindowDays: parseInt(process.env.PAST_EDIT_WINDOW_DAYS || '7', 10),
    
    // Rounding interval for time entries (minutes)
    roundingIntervalMinutes: parseInt(process.env.ROUNDING_INTERVAL || '15', 10),
  },
  
  // Billing Settings
  billing: {
    // Default hourly rate (in cents to avoid floating point issues)
    defaultHourlyRateCents: parseInt(process.env.DEFAULT_HOURLY_RATE_CENTS || '5000', 10),
    
    // Default currency
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    
    // Billable by default
    defaultBillable: process.env.DEFAULT_BILLABLE !== 'false',
  },
  
  // Project Settings
  project: {
    // Default project status
    defaultStatus: process.env.DEFAULT_PROJECT_STATUS || 'planning',
    
    // Maximum team size per project
    maxTeamSize: parseInt(process.env.MAX_TEAM_SIZE || '50', 10),
    
    // Project code prefix
    codePrefix: process.env.PROJECT_CODE_PREFIX || 'PRJ',
    
    // Auto-generate project codes
    autoGenerateCodes: process.env.AUTO_GENERATE_PROJECT_CODES !== 'false',
  },
  
  // Client Settings
  client: {
    // Client code prefix
    codePrefix: process.env.CLIENT_CODE_PREFIX || 'CLT',
    
    // Auto-generate client codes
    autoGenerateCodes: process.env.AUTO_GENERATE_CLIENT_CODES !== 'false',
  },
};
