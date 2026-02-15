/**
 * Storage Service - AWS S3 with local filesystem fallback for development
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
import * as fs from 'fs';
import * as path from 'path';
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
// STORAGE MODE DETECTION
// ============================================================================

// Check if we should use local filesystem storage
const USE_LOCAL_STORAGE = !process.env.AWS_ACCESS_KEY_ID || 
  process.env.AWS_ACCESS_KEY_ID === 'your-access-key' ||
  process.env.USE_LOCAL_STORAGE === 'true';

// Local storage base path (relative to service root)
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), '..', '..', 'uploads', 'documents');

if (USE_LOCAL_STORAGE) {
  logger.info({ localPath: LOCAL_STORAGE_PATH }, 'Using LOCAL FILESYSTEM storage (AWS credentials not configured)');
} else {
  logger.info({ bucket: config.aws.s3Bucket, region: config.aws.region }, 'Using AWS S3 storage');
}

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
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Get the full local path for a key
 */
function getLocalPath(key: string): string {
  return path.join(LOCAL_STORAGE_PATH, key);
}

/**
 * Ensure directory exists for a file path
 */
async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * Convert Readable stream to Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
 * Upload file to storage (S3 or local filesystem)
 */
export async function uploadFile(input: UploadInput): Promise<{ key: string; etag?: string }> {
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const localPath = getLocalPath(input.key);
    await ensureDirectory(localPath);
    
    // Convert body to buffer if it's a stream
    const buffer = Buffer.isBuffer(input.body) 
      ? input.body 
      : await streamToBuffer(input.body as Readable);
    
    await fs.promises.writeFile(localPath, buffer);
    
    // Write metadata file
    const metadataPath = `${localPath}.meta.json`;
    await fs.promises.writeFile(metadataPath, JSON.stringify({
      contentType: input.contentType,
      metadata: input.metadata,
      uploadedAt: new Date().toISOString(),
    }));
    
    logger.debug({ key: input.key, path: localPath }, 'File uploaded to local storage');
    return { key: input.key, etag: `local-${Date.now()}` };
  }
  
  // Use S3 storage
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
 * Download file from storage (S3 or local filesystem)
 */
export async function downloadFile(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}> {
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const localPath = getLocalPath(key);
    const metadataPath = `${localPath}.meta.json`;
    
    const stat = await fs.promises.stat(localPath);
    const readStream = fs.createReadStream(localPath);
    
    let contentType: string | undefined;
    let metadata: Record<string, string> | undefined;
    
    try {
      const metaContent = await fs.promises.readFile(metadataPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      contentType = meta.contentType;
      metadata = meta.metadata;
    } catch {
      // Metadata file doesn't exist, that's ok
    }
    
    return {
      body: readStream,
      contentType,
      contentLength: stat.size,
      metadata,
    };
  }
  
  // Use S3 storage
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
 * Download file as Buffer (convenience function for processing)
 */
export async function downloadFileAsBuffer(key: string): Promise<Buffer> {
  const { body } = await downloadFile(key);
  return streamToBuffer(body);
}

/**
 * Delete file from storage (S3 or local filesystem)
 */
export async function deleteFile(key: string): Promise<void> {
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const localPath = getLocalPath(key);
    const metadataPath = `${localPath}.meta.json`;
    
    try {
      await fs.promises.unlink(localPath);
      logger.debug({ key, path: localPath }, 'File deleted from local storage');
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    try {
      await fs.promises.unlink(metadataPath);
    } catch {
      // Metadata file doesn't exist, that's ok
    }
    
    return;
  }
  
  // Use S3 storage
  const s3 = getS3Client();
  
  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  
  await s3.send(command);
  
  logger.debug({ key }, 'File deleted from S3');
}

/**
 * Delete multiple files from storage (S3 or local filesystem)
 */
export async function deleteFiles(keys: string[]): Promise<{ deleted: number; errors: number }> {
  if (keys.length === 0) return { deleted: 0, errors: 0 };
  
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    let deleted = 0;
    let errors = 0;
    
    for (const key of keys) {
      try {
        await deleteFile(key);
        deleted++;
      } catch {
        errors++;
      }
    }
    
    logger.info({ deleted, errors }, 'Files deleted from local storage');
    return { deleted, errors };
  }
  
  // Use S3 storage
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
 * Copy file in storage (S3 or local filesystem)
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const sourcePath = getLocalPath(sourceKey);
    const destPath = getLocalPath(destinationKey);
    const sourceMetaPath = `${sourcePath}.meta.json`;
    const destMetaPath = `${destPath}.meta.json`;
    
    await ensureDirectory(destPath);
    await fs.promises.copyFile(sourcePath, destPath);
    
    try {
      await fs.promises.copyFile(sourceMetaPath, destMetaPath);
    } catch {
      // Metadata file doesn't exist, that's ok
    }
    
    logger.debug({ sourceKey, destinationKey }, 'File copied in local storage');
    return;
  }
  
  // Use S3 storage
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
 * Check if file exists in storage (S3 or local filesystem)
 */
export async function fileExists(key: string): Promise<boolean> {
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    try {
      await fs.promises.access(getLocalPath(key));
      return true;
    } catch {
      return false;
    }
  }
  
  // Use S3 storage
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
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const localPath = getLocalPath(key);
    const metadataPath = `${localPath}.meta.json`;
    
    try {
      const stat = await fs.promises.stat(localPath);
      let contentType: string | undefined;
      let metadata: Record<string, string> | undefined;
      
      try {
        const metaContent = await fs.promises.readFile(metadataPath, 'utf-8');
        const meta = JSON.parse(metaContent);
        contentType = meta.contentType;
        metadata = meta.metadata;
      } catch {
        // Metadata file doesn't exist
      }
      
      return {
        contentType,
        contentLength: stat.size,
        lastModified: stat.mtime,
        metadata,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  // Use S3 storage
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
 * Recursively list files in a local directory
 */
async function listLocalFilesRecursive(
  dir: string,
  prefix: string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const results: { key: string; size: number; lastModified: Date }[] = [];
  
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await listLocalFilesRecursive(fullPath, prefix);
        results.push(...subFiles);
      } else if (!entry.name.endsWith('.meta.json')) {
        const stat = await fs.promises.stat(fullPath);
        // Convert absolute path to key
        const key = fullPath.replace(LOCAL_STORAGE_PATH + path.sep, '').replace(/\\/g, '/');
        results.push({
          key,
          size: stat.size,
          lastModified: stat.mtime,
        });
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  
  return results;
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
  // Use local filesystem storage
  if (USE_LOCAL_STORAGE) {
    const localDir = getLocalPath(prefix);
    const allFiles = await listLocalFilesRecursive(localDir, prefix);
    
    // Simple pagination using continuationToken as start index
    const startIndex = options?.continuationToken ? parseInt(options.continuationToken, 10) : 0;
    const maxKeys = options?.maxKeys || 1000;
    const endIndex = startIndex + maxKeys;
    
    const files = allFiles.slice(startIndex, endIndex);
    const nextToken = endIndex < allFiles.length ? String(endIndex) : undefined;
    
    return { files, nextToken };
  }
  
  // Use S3 storage
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
 * For local storage, returns a direct URL to the file endpoint
 */
export async function getDownloadUrl(input: PresignedUrlInput): Promise<string> {
  // For local storage, return a path that the API can serve
  if (USE_LOCAL_STORAGE) {
    // Return a URL path that the download endpoint can handle
    const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
    const inlineParam = input.contentDisposition?.includes('inline') ? '&inline=true' : '';
    return `${baseUrl}/api/documents/files/download?key=${encodeURIComponent(input.key)}${inlineParam}`;
  }
  
  // Use S3 storage
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
 * For local storage, returns a path to the upload endpoint
 */
export async function getUploadUrl(input: PresignedUrlInput): Promise<string> {
  // For local storage, direct uploads go through the API
  if (USE_LOCAL_STORAGE) {
    const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
    return `${baseUrl}/api/documents/files/upload?key=${encodeURIComponent(input.key)}`;
  }
  
  // Use S3 storage
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

/**
 * Get a signed URL for an existing object
 */
export async function getSignedUrlForKey(key: string, expiresIn?: number): Promise<string> {
  const s3 = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  
  const url = await getSignedUrl(s3, command, {
    expiresIn: expiresIn || config.file.presignedUrlExpirySeconds,
  });
  
  return url;
}
