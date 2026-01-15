/**
 * Storage Service - S3 operations for reports
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  ...(config.aws.s3Endpoint && {
    endpoint: config.aws.s3Endpoint,
    forcePathStyle: true,
  }),
});

/**
 * Upload file to S3
 */
export async function uploadFile(
  key: string,
  content: Buffer,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
    })
  );
  
  logger.debug({ key, size: content.length }, 'File uploaded to S3');
}

/**
 * Get download URL (presigned)
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    })
  );
  
  logger.debug({ key }, 'File deleted from S3');
}

/**
 * Download file from S3
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    })
  );
  
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  
  return Buffer.concat(chunks);
}
