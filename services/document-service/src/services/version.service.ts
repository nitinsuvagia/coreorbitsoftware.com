/**
 * Version Service - File versioning operations
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';
import * as storageService from './storage.service';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateVersionInput {
  fileId: string;
  content: Buffer;
  changeNote?: string;
}

export interface FileVersionInfo {
  id: string;
  version: number;
  size: number;
  changeNote?: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
}

// ============================================================================
// VERSION OPERATIONS
// ============================================================================

/**
 * Create a new version of a file
 */
export async function createVersion(
  prisma: PrismaClient,
  input: CreateVersionInput,
  userId: string,
  tenantSlug: string
): Promise<any> {
  const { fileId, content, changeNote } = input;

  // Get the existing file
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.isDeleted) {
    throw new Error('Cannot create version of deleted file');
  }

  // Calculate new version number
  const latestVersion = file.versions[0]?.version || file.currentVersion;
  const newVersion = latestVersion + 1;

  // Check max versions limit
  const versionCount = await prisma.fileVersion.count({
    where: { fileId },
  });

  if (versionCount >= config.file.maxVersions) {
    // Delete oldest version to make room
    const oldestVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: 'asc' },
    });

    if (oldestVersion) {
      await prisma.fileVersion.delete({
        where: { id: oldestVersion.id },
      });

      // Try to delete from storage (don't fail if it doesn't exist)
      try {
        await storageService.deleteFile(oldestVersion.storageKey);
      } catch (error) {
        logger.warn({ error, key: oldestVersion.storageKey }, 'Failed to delete old version from storage');
      }
    }
  }

  // Generate storage key for new version
  const timestamp = Date.now();
  const storageName = `v${newVersion}-${timestamp}-${file.storageName}`;
  const storageKey = storageService.buildKey(
    tenantSlug,
    `versions/${fileId}`,
    storageName
  );

  // Upload new version to S3
  await storageService.uploadFile({
    key: storageKey,
    body: content,
    contentType: file.mimeType,
    metadata: {
      fileId,
      version: String(newVersion),
      uploadedBy: userId,
    },
  });

  // Create version record and update file in transaction
  const [version, updatedFile] = await prisma.$transaction([
    prisma.fileVersion.create({
      data: {
        id: uuidv4(),
        fileId,
        version: newVersion,
        storageName,
        storageKey,
        size: content.length,
        uploadedBy: userId,
        changeNote,
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.file.update({
      where: { id: fileId },
      data: {
        currentVersion: newVersion,
        size: content.length,
        storageKey,
        storageName,
        updatedAt: new Date(),
      },
    }),
  ]);

  logger.info(
    { fileId, version: newVersion, size: content.length },
    'File version created'
  );

  return version;
}

/**
 * Get all versions of a file
 */
export async function getVersions(
  prisma: PrismaClient,
  fileId: string
): Promise<FileVersionInfo[]> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  const versions = await prisma.fileVersion.findMany({
    where: { fileId },
    orderBy: { version: 'desc' },
    include: {
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Also include current version info
  return [
    {
      id: file.id,
      version: file.currentVersion,
      size: file.size,
      changeNote: 'Current version',
      uploadedBy: { id: '', firstName: '', lastName: '' }, // Will be populated below
      createdAt: file.updatedAt,
    },
    ...versions.map((v) => ({
      id: v.id,
      version: v.version,
      size: v.size,
      changeNote: v.changeNote || undefined,
      uploadedBy: v.uploader,
      createdAt: v.createdAt,
    })),
  ];
}

/**
 * Get download URL for a specific version
 */
export async function getVersionDownloadUrl(
  prisma: PrismaClient,
  fileId: string,
  version: number
): Promise<{ url: string; filename: string }> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  // If requesting current version, use file's storage key
  if (version === file.currentVersion) {
    const url = await storageService.getSignedUrl(file.storageKey);
    return { url, filename: file.name };
  }

  // Find specific version
  const fileVersion = await prisma.fileVersion.findUnique({
    where: {
      fileId_version: { fileId, version },
    },
  });

  if (!fileVersion) {
    throw new Error(`Version ${version} not found`);
  }

  const url = await storageService.getSignedUrl(fileVersion.storageKey);
  const ext = file.name.split('.').pop();
  const filename = `${file.name.replace(/\.[^.]+$/, '')}-v${version}.${ext}`;

  return { url, filename };
}

/**
 * Restore a previous version as the current version
 */
export async function restoreVersion(
  prisma: PrismaClient,
  fileId: string,
  version: number,
  userId: string,
  tenantSlug: string
): Promise<any> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (version === file.currentVersion) {
    throw new Error('Already at this version');
  }

  // Find the version to restore
  const fileVersion = await prisma.fileVersion.findUnique({
    where: {
      fileId_version: { fileId, version },
    },
  });

  if (!fileVersion) {
    throw new Error(`Version ${version} not found`);
  }

  // Download the old version content
  const content = await storageService.downloadFile(fileVersion.storageKey);

  // Create new version from the old content
  return createVersion(
    prisma,
    {
      fileId,
      content,
      changeNote: `Restored from version ${version}`,
    },
    userId,
    tenantSlug
  );
}

/**
 * Compare two versions (returns metadata comparison)
 */
export async function compareVersions(
  prisma: PrismaClient,
  fileId: string,
  version1: number,
  version2: number
): Promise<{
  version1: FileVersionInfo;
  version2: FileVersionInfo;
  sizeDiff: number;
  timeDiff: number;
}> {
  const [v1, v2] = await Promise.all([
    prisma.fileVersion.findUnique({
      where: { fileId_version: { fileId, version: version1 } },
      include: { uploader: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.fileVersion.findUnique({
      where: { fileId_version: { fileId, version: version2 } },
      include: { uploader: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }

  return {
    version1: {
      id: v1.id,
      version: v1.version,
      size: v1.size,
      changeNote: v1.changeNote || undefined,
      uploadedBy: v1.uploader,
      createdAt: v1.createdAt,
    },
    version2: {
      id: v2.id,
      version: v2.version,
      size: v2.size,
      changeNote: v2.changeNote || undefined,
      uploadedBy: v2.uploader,
      createdAt: v2.createdAt,
    },
    sizeDiff: v2.size - v1.size,
    timeDiff: v2.createdAt.getTime() - v1.createdAt.getTime(),
  };
}
