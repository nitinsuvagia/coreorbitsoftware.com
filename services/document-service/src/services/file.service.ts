/**
 * File Service - File management operations
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { lookup as getMimeType } from 'mime-types';
import sharp from 'sharp';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { config, ThumbnailSize } from '../config';
import * as storageService from './storage.service';
import * as thumbnailService from './thumbnail.service';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadFileInput {
  folderId?: string;
  filename: string;
  content: Buffer;
  mimeType: string;
  description?: string;
  tags?: string[];
  entityType?: string;
  entityId?: string;
}

export interface FileFilters {
  folderId?: string;
  entityType?: string;
  entityId?: string;
  mimeType?: string;
  tags?: string[];
  search?: string;
  uploadedBy?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface MoveFileInput {
  fileId: string;
  targetFolderId?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  const randomPart = uuidv4().split('-')[0];
  return `${timestamp}-${randomPart}.${ext}`;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Upload a file
 */
export async function uploadFile(
  prisma: PrismaClient,
  input: UploadFileInput,
  userId: string,
  tenantSlug: string
): Promise<any> {
  const id = uuidv4();
  
  // Validate file size
  if (input.content.length > config.file.maxSizeBytes) {
    throw new Error(`File size exceeds maximum of ${config.file.maxSizeBytes / 1024 / 1024}MB`);
  }
  
  // Validate MIME type
  const allAllowedTypes = [
    ...config.file.allowedTypes.documents,
    ...config.file.allowedTypes.images,
    ...config.file.allowedTypes.archives,
    ...config.file.allowedTypes.videos,
    ...config.file.allowedTypes.audio,
  ];
  
  if (!allAllowedTypes.includes(input.mimeType)) {
    throw new Error(`File type ${input.mimeType} is not allowed`);
  }
  
  // Generate storage key
  const storageName = generateFilename(input.filename);
  const folder = input.entityType
    ? config.storage.folders.attachments
    : config.storage.folders.documents;
  const storageKey = storageService.buildKey(tenantSlug, folder, storageName);
  
  // Upload to S3
  await storageService.uploadFile({
    key: storageKey,
    body: input.content,
    contentType: input.mimeType,
    metadata: {
      originalName: input.filename,
      uploadedBy: userId,
    },
  });
  
  // Generate thumbnails for supported file types (images, PDFs, Office documents)
  let thumbnails: Record<string, string> = {};
  
  if (thumbnailService.canGenerateThumbnail(input.mimeType)) {
    const sizes: ThumbnailSize[] = ['small', 'medium', 'large'];
    const generatedThumbnails = await thumbnailService.generateThumbnails(input.content, input.mimeType);
    
    for (const size of sizes) {
      const thumbnailBuffer = generatedThumbnails[size];
      if (thumbnailBuffer) {
        try {
          const thumbKey = storageService.buildKey(
            tenantSlug,
            `${folder}/thumbnails/${size}`,
            storageName.replace(/\.[^.]+$/, '.jpg')
          );
          
          await storageService.uploadFile({
            key: thumbKey,
            body: thumbnailBuffer,
            contentType: 'image/jpeg',
          });
          
          thumbnails[size] = thumbKey;
        } catch (error) {
          logger.warn({ size, error }, 'Failed to upload thumbnail');
        }
      }
    }
  }
  
  // Save file record
  const file = await prisma.file.create({
    data: {
      id,
      folderId: input.folderId,
      name: input.filename,
      storageName,
      storageKey,
      mimeType: input.mimeType,
      size: input.content.length,
      description: input.description,
      tags: input.tags || [],
      thumbnails,
      entityType: input.entityType,
      entityId: input.entityId,
      uploadedBy: userId,
    },
    include: {
      folder: { select: { id: true, name: true, path: true } },
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  
  logger.info({ fileId: id, name: input.filename, size: input.content.length }, 'File uploaded');
  
  return file;
}

/**
 * Get file by ID
 */
export async function getFileById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  return prisma.file.findUnique({
    where: { id },
    include: {
      folder: { select: { id: true, name: true, path: true } },
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

/**
 * Get file download URL
 */
export async function getFileDownloadUrl(
  prisma: PrismaClient,
  id: string,
  inline?: boolean
): Promise<string> {
  const file = await prisma.file.findUnique({
    where: { id },
    select: { storageKey: true, name: true, mimeType: true },
  });
  
  if (!file) {
    throw new Error('File not found');
  }
  
  const disposition = inline
    ? `inline; filename="${file.name}"`
    : `attachment; filename="${file.name}"`;
  
  return storageService.getDownloadUrl({
    key: file.storageKey,
    contentDisposition: disposition,
  });
}

/**
 * Get thumbnail URL
 */
export async function getThumbnailUrl(
  prisma: PrismaClient,
  id: string,
  size: ThumbnailSize = 'medium'
): Promise<string | null> {
  const file = await prisma.file.findUnique({
    where: { id },
    select: { thumbnails: true },
  });
  
  if (!file) return null;
  
  const thumbnails = file.thumbnails as Record<string, string>;
  const thumbKey = thumbnails[size];
  
  if (!thumbKey) return null;
  
  return storageService.getDownloadUrl({ key: thumbKey });
}

/**
 * Update file metadata
 */
export async function updateFile(
  prisma: PrismaClient,
  id: string,
  input: { name?: string; description?: string; tags?: string[]; folderId?: string }
): Promise<any> {
  const file = await prisma.file.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      tags: input.tags,
      folderId: input.folderId,
      updatedAt: new Date(),
    },
    include: {
      folder: { select: { id: true, name: true, path: true } },
    },
  });
  
  return file;
}

/**
 * Delete file (soft delete)
 */
export async function deleteFile(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  await prisma.file.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
  
  logger.info({ fileId: id }, 'File soft deleted');
}

/**
 * Permanently delete file
 */
export async function permanentlyDeleteFile(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  // Get file with versions
  const file = await prisma.file.findUnique({
    where: { id },
    select: { 
      storageKey: true, 
      thumbnails: true,
      versions: {
        select: { storageKey: true }
      }
    },
  });
  
  if (!file) return;
  
  // Collect all storage keys to delete
  const keysToDelete: string[] = [];
  
  // Main file
  if (file.storageKey) {
    keysToDelete.push(file.storageKey);
  }
  
  // Thumbnails
  const thumbnails = file.thumbnails as Record<string, string> | null;
  if (thumbnails) {
    for (const key of Object.values(thumbnails)) {
      if (key) keysToDelete.push(key);
    }
  }
  
  // File versions
  for (const version of file.versions) {
    if (version.storageKey) {
      keysToDelete.push(version.storageKey);
    }
  }
  
  // Delete all files from storage
  if (keysToDelete.length > 0) {
    const result = await storageService.deleteFiles(keysToDelete);
    logger.debug({ fileId: id, deleted: result.deleted, errors: result.errors }, 'Storage files deleted');
  }
  
  // Delete record (cascades to versions via Prisma)
  await prisma.file.delete({ where: { id } });
  
  logger.info({ fileId: id, filesDeleted: keysToDelete.length }, 'File permanently deleted');
}

/**
 * Restore deleted file
 */
export async function restoreFile(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  return prisma.file.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
}

/**
 * List files
 */
export async function listFiles(
  prisma: PrismaClient,
  filters: FileFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = { isDeleted: false };
  
  if (filters.folderId !== undefined) {
    where.folderId = filters.folderId || null;
  }
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.mimeType) where.mimeType = { startsWith: filters.mimeType };
  if (filters.uploadedBy) where.uploadedBy = filters.uploadedBy;
  
  if (filters.tags?.length) {
    where.tags = { hasSome: filters.tags };
  }
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  
  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        folder: { select: { id: true, name: true } },
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.file.count({ where }),
  ]);
  
  return { data: files, total, page, pageSize };
}

/**
 * Get files for entity
 */
export async function getEntityFiles(
  prisma: PrismaClient,
  entityType: string,
  entityId: string
): Promise<any[]> {
  return prisma.file.findMany({
    where: { entityType, entityId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

/**
 * Copy file
 */
export async function copyFile(
  prisma: PrismaClient,
  id: string,
  targetFolderId: string | null,
  userId: string,
  tenantSlug: string
): Promise<any> {
  const source = await prisma.file.findUnique({ where: { id } });
  
  if (!source) {
    throw new Error('File not found');
  }
  
  const newId = uuidv4();
  const newStorageName = generateFilename(source.name);
  const newStorageKey = source.storageKey.replace(source.storageName, newStorageName);
  
  // Copy in S3
  await storageService.copyFile(source.storageKey, newStorageKey);
  
  // Copy thumbnails
  const newThumbnails: Record<string, string> = {};
  const sourceThumbnails = source.thumbnails as Record<string, string>;
  
  for (const [size, key] of Object.entries(sourceThumbnails)) {
    const newThumbKey = key.replace(source.storageName.replace(/\.[^.]+$/, '.jpg'), newStorageName.replace(/\.[^.]+$/, '.jpg'));
    await storageService.copyFile(key, newThumbKey);
    newThumbnails[size] = newThumbKey;
  }
  
  // Create new file record
  const file = await prisma.file.create({
    data: {
      id: newId,
      folderId: targetFolderId,
      name: source.name,
      storageName: newStorageName,
      storageKey: newStorageKey,
      mimeType: source.mimeType,
      size: source.size,
      description: source.description,
      tags: source.tags as string[],
      thumbnails: newThumbnails,
      uploadedBy: userId,
    },
    include: {
      folder: { select: { id: true, name: true, path: true } },
    },
  });
  
  logger.info({ sourceId: id, newId }, 'File copied');
  
  return file;
}

/**
 * Regenerate thumbnails for an existing file
 * Useful for files that were uploaded before thumbnail support was added
 */
export async function regenerateThumbnails(
  prisma: PrismaClient,
  id: string,
  tenantSlug: string
): Promise<{ success: boolean; thumbnails: Record<string, string> }> {
  const file = await prisma.file.findUnique({
    where: { id },
    select: { 
      id: true, 
      storageKey: true, 
      storageName: true,
      mimeType: true, 
      thumbnails: true,
      name: true
    },
  });
  
  if (!file) {
    throw new Error('File not found');
  }
  
  // Check if thumbnail generation is supported for this file type
  if (!thumbnailService.canGenerateThumbnail(file.mimeType)) {
    return { success: false, thumbnails: {} };
  }
  
  // Download the original file from S3
  const fileBuffer = await storageService.downloadFileAsBuffer(file.storageKey);
  
  if (!fileBuffer) {
    throw new Error('Could not download file from storage');
  }
  
  // Generate thumbnails
  const generatedThumbnails = await thumbnailService.generateThumbnails(fileBuffer, file.mimeType);
  
  if (Object.keys(generatedThumbnails).length === 0) {
    return { success: false, thumbnails: {} };
  }
  
  // Upload thumbnails to S3
  const thumbnails: Record<string, string> = {};
  const folder = file.storageKey.includes('/attachments/') 
    ? config.storage.folders.attachments 
    : config.storage.folders.documents;
  
  const sizes: ThumbnailSize[] = ['small', 'medium', 'large'];
  
  for (const size of sizes) {
    const thumbnailBuffer = generatedThumbnails[size];
    if (thumbnailBuffer) {
      try {
        const thumbKey = storageService.buildKey(
          tenantSlug,
          `${folder}/thumbnails/${size}`,
          file.storageName.replace(/\.[^.]+$/, '.jpg')
        );
        
        await storageService.uploadFile({
          key: thumbKey,
          body: thumbnailBuffer,
          contentType: 'image/jpeg',
        });
        
        thumbnails[size] = thumbKey;
      } catch (error) {
        logger.warn({ size, fileId: id, error }, 'Failed to upload regenerated thumbnail');
      }
    }
  }
  
  // Update file record with new thumbnails
  await prisma.file.update({
    where: { id },
    data: { thumbnails },
  });
  
  logger.info({ fileId: id, thumbnailCount: Object.keys(thumbnails).length }, 'Thumbnails regenerated');
  
  return { success: true, thumbnails };
}

/**
 * Get files that need thumbnail regeneration
 */
export async function getFilesNeedingThumbnails(
  prisma: PrismaClient,
  limit: number = 50
): Promise<any[]> {
  // Get files that support thumbnails but don't have them
  const supportedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  
  return prisma.file.findMany({
    where: {
      isDeleted: false,
      mimeType: { in: supportedTypes },
      OR: [
        { thumbnails: { equals: {} } },
        { thumbnails: { equals: null } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, mimeType: true },
  });
}
