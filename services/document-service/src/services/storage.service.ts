/**
 * S3 Storage Service - AWS S3 operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadInput {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface PresignedUrlInput {
  key: string;
  expiresIn?: number;
  contentType?: string;
  contentDisposition?: string;
}

// ============================================================================
// S3 CLIENT
// ============================================================================

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      ...(config.aws.s3Endpoint && {
        endpoint: config.aws.s3Endpoint,
        forcePathStyle: true, // Required for MinIO
      }),
    });
  }
  return s3Client;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Build S3 key for tenant
 */
export function buildKey(
  tenantSlug: string,
  folder: string,
  filename: string
): string {
  return `${config.storage.basePath}/${tenantSlug}/${folder}/${filename}`;
}

/**
 * Upload file to S3
 */
export async function uploadFile(input: UploadInput): Promise<{ key: string; etag?: string }> {
  const s3 = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    Metadata: input.metadata,
    ACL: input.acl || 'private',
  });
  
  const result = await s3.send(command);
  
  logger.debug({ key: input.key, etag: result.ETag }, 'File uploaded to S3');
  
  return { key: input.key, etag: result.ETag };
}

/**
 * Download file from S3
 */
export async function downloadFile(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}> {
  const s3 = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  
  const result = await s3.send(command);
  
  return {
    body: result.Body as Readable,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    metadata: result.Metadata,
  };
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const s3 = getS3Client();
  
  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  
  await s3.send(command);
  
  logger.debug({ key }, 'File deleted from S3');
}

/**
 * Delete multiple files from S3
 */
export async function deleteFiles(keys: string[]): Promise<{ deleted: number; errors: number }> {
  if (keys.length === 0) return { deleted: 0, errors: 0 };
  
  const s3 = getS3Client();
  
  // S3 allows max 1000 objects per delete request
  const batches = [];
  for (let i = 0; i < keys.length; i += 1000) {
    batches.push(keys.slice(i, i + 1000));
  }
  
  let deleted = 0;
  let errors = 0;
  
  for (const batch of batches) {
    const command = new DeleteObjectsCommand({
      Bucket: config.aws.s3Bucket,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: true,
      },
    });
    
    const result = await s3.send(command);
    deleted += batch.length - (result.Errors?.length || 0);
    errors += result.Errors?.length || 0;
  }
  
  logger.info({ deleted, errors }, 'Files deleted from S3');
  
  return { deleted, errors };
}

/**
 * Copy file in S3
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  const s3 = getS3Client();
  
  const command = new CopyObjectCommand({
    Bucket: config.aws.s3Bucket,
    CopySource: `${config.aws.s3Bucket}/${sourceKey}`,
    Key: destinationKey,
  });
  
  await s3.send(command);
  
  logger.debug({ sourceKey, destinationKey }, 'File copied in S3');
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  const s3 = getS3Client();
  
  try {
    const command = new HeadObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });
    
    await s3.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  metadata?: Record<string, string>;
} | null> {
  const s3 = getS3Client();
  
  try {
    const command = new HeadObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });
    
    const result = await s3.send(command);
    
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      metadata: result.Metadata,
    };
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return null;
    }
    throw error;
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  prefix: string,
  options?: { maxKeys?: number; continuationToken?: string }
): Promise<{
  files: { key: string; size: number; lastModified?: Date }[];
  nextToken?: string;
}> {
  const s3 = getS3Client();
  
  const command = new ListObjectsV2Command({
    Bucket: config.aws.s3Bucket,
    Prefix: prefix,
    MaxKeys: options?.maxKeys || 1000,
    ContinuationToken: options?.continuationToken,
  });
  
  const result = await s3.send(command);
  
  return {
    files: (result.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size || 0,
      lastModified: obj.LastModified,
    })),
    nextToken: result.NextContinuationToken,
  };
}

// ============================================================================
// PRESIGNED URLS
// ============================================================================

/**
 * Generate presigned URL for download
 */
export async function getDownloadUrl(input: PresignedUrlInput): Promise<string> {
  const s3 = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: input.key,
    ResponseContentDisposition: input.contentDisposition,
  });
  
  const url = await getSignedUrl(s3, command, {
    expiresIn: input.expiresIn || config.file.presignedUrlExpirySeconds,
  });
  
  return url;
}

/**
 * Generate presigned URL for upload
 */
export async function getUploadUrl(input: PresignedUrlInput): Promise<string> {
  const s3 = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  
  const url = await getSignedUrl(s3, command, {
    expiresIn: input.expiresIn || config.file.presignedUrlExpirySeconds,
  });
  
  return url;
}

/**
 * Get storage usage for a tenant
 */
export async function getTenantStorageUsage(tenantSlug: string): Promise<{
  totalBytes: number;
  fileCount: number;
}> {
  const prefix = `${config.storage.basePath}/${tenantSlug}/`;
  
  let totalBytes = 0;
  let fileCount = 0;
  let continuationToken: string | undefined;
  
  do {
    const result = await listFiles(prefix, { continuationToken });
    
    for (const file of result.files) {
      totalBytes += file.size;
      fileCount++;
    }
    
    continuationToken = result.nextToken;
  } while (continuationToken);
  
  return { totalBytes, fileCount };
}
