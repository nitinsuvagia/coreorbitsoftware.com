/**
 * Task Service Configuration
 */

export const config = {
  // Server
  port: parseInt(process.env.TASK_SERVICE_PORT || '3005', 10),
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
  
  // Task Settings
  task: {
    // Maximum subtasks per task
    maxSubtasksPerTask: parseInt(process.env.MAX_SUBTASKS_PER_TASK || '50', 10),
    
    // Maximum attachments per task
    maxAttachmentsPerTask: parseInt(process.env.MAX_ATTACHMENTS_PER_TASK || '20', 10),
    
    // Maximum assignees per task
    maxAssigneesPerTask: parseInt(process.env.MAX_ASSIGNEES_PER_TASK || '10', 10),
    
    // Default priority
    defaultPriority: process.env.DEFAULT_TASK_PRIORITY || 'medium',
    
    // Auto-close parent when all subtasks complete
    autoCloseParent: process.env.AUTO_CLOSE_PARENT_TASK !== 'false',
    
    // Enable task dependencies
    enableDependencies: process.env.ENABLE_TASK_DEPENDENCIES !== 'false',
    
    // Task statuses
    statuses: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
    
    // Task priorities
    priorities: ['lowest', 'low', 'medium', 'high', 'highest'],
  },
  
  // Activity Settings
  activity: {
    // Keep activity logs for N days
    retentionDays: parseInt(process.env.ACTIVITY_RETENTION_DAYS || '365', 10),
    
    // Maximum activities to return in a single query
    maxActivitiesPerQuery: parseInt(process.env.MAX_ACTIVITIES_PER_QUERY || '100', 10),
  },
  
  // Comment Settings
  comment: {
    // Maximum comment length
    maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH || '5000', 10),
    
    // Allow editing comments after N minutes (0 = always allow)
    editWindowMinutes: parseInt(process.env.COMMENT_EDIT_WINDOW || '0', 10),
    
    // Maximum mentions per comment
    maxMentionsPerComment: parseInt(process.env.MAX_MENTIONS_PER_COMMENT || '20', 10),
  },
};
