/**
 * Document Service Configuration
 */

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3007', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3007',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // AWS S3
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'oms-documents',
    s3Endpoint: process.env.AWS_S3_ENDPOINT, // For local development with MinIO
  },
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // File settings
  file: {
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    maxFilesPerUpload: 10,
    maxVersions: parseInt(process.env.MAX_FILE_VERSIONS || '10', 10), // Max versions per file
    presignedUrlExpirySeconds: 3600, // 1 hour
    
    // Allowed MIME types by category
    allowedTypes: {
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf',
      ],
      images: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ],
      archives: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip',
      ],
      videos: [
        'video/mp4',
        'video/quicktime',      // .mov
        'video/x-msvideo',      // .avi
        'video/x-ms-wmv',       // .wmv
        'video/webm',
        'video/mpeg',
        'video/3gpp',
        'video/x-matroska',     // .mkv
      ],
      audio: [
        'audio/mpeg',           // .mp3
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/x-m4a',          // .m4a
        'audio/webm',
      ],
    },
    
    // Image processing
    thumbnailSizes: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 600, height: 600 },
    },
  },
  
  // Folder settings
  folder: {
    maxDepth: 10,
    maxNameLength: 255,
  },
  
  // Storage paths
  storage: {
    basePath: 'tenants', // tenants/{tenantSlug}/...
    tenantLimitBytes: parseInt(process.env.TENANT_STORAGE_LIMIT_BYTES || String(10 * 1024 * 1024 * 1024), 10), // 10GB default
    folders: {
      documents: 'documents',
      attachments: 'attachments',
      avatars: 'avatars',
      exports: 'exports',
      temp: 'temp',
    },
  },
  
  // Cleanup settings
  cleanup: {
    tempFileMaxAgeDays: 1,
    deletedFileRetentionDays: 30, // Soft delete retention
    orphanedFileMaxAgeDays: 7,
  },
};

export type ThumbnailSize = keyof typeof config.file.thumbnailSizes;
