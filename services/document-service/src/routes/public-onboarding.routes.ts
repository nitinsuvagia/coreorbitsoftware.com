/**
 * Public Onboarding Routes - For candidates uploading documents during onboarding
 * No authentication required - validated via onboarding token
 */

import { Router, Request, Response } from 'express';
import Busboy from 'busboy';
import { getTenantPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import {
  createCandidateOnBoardingFolders,
  getCandidateOnBoardingFolder,
} from '../services/folder-init.service';
import * as fileService from '../services/file.service';
import * as storageService from '../services/storage.service';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

const router = Router();

// Document type to subfolder mapping
const DOC_TYPE_TO_SUBFOLDER: Record<string, string> = {
  // Personal Documents
  'photo': 'Personal Documents',
  'aadharCard': 'Personal Documents',
  'panCard': 'Personal Documents',
  'passport': 'Personal Documents',
  'drivingLicense': 'Personal Documents',
  'voterID': 'Personal Documents',
  'idProof': 'Personal Documents',
  'addressProof': 'Personal Documents',
  // Education
  'ssc': 'Education',
  'hsc': 'Education',
  'graduation': 'Education',
  'postGraduation': 'Education',
  'professionalCertifications': 'Education',
  'educationCertificates': 'Education',
  // Experience
  'experienceLetter': 'Experience',
  'experienceLetters': 'Experience',
  'relievingLetter': 'Experience',
  'payslips': 'Experience',
  // Bank Details
  'bankPassbook': 'Bank Details',
  'bankProof': 'Bank Details',
  'cancelledCheque': 'Bank Details',
  // Offer Letters
  'offerLetter': 'Offer Letters',
  // Other
  'other': 'Other',
};

/**
 * Validate onboarding token and get candidate info
 */
async function validateOnboardingToken(token: string): Promise<{
  valid: boolean;
  candidateId?: string;
  candidateName?: string;
  tenantSlug?: string;
  error?: string;
}> {
  try {
    // Call employee service to validate token
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const response = await fetch(`${employeeServiceUrl}/api/v1/public/onboarding/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      return { valid: false, error: data.error || 'Invalid token' };
    }

    return {
      valid: true,
      candidateId: data.data.candidateId,
      candidateName: data.data.candidateName,
      tenantSlug: data.data.tenantSlug,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error validating onboarding token');
    return { valid: false, error: 'Failed to validate token' };
  }
}

/**
 * POST /api/v1/public/onboarding/:token/upload - Upload document during onboarding
 * Public endpoint - validated via onboarding token
 */
router.post('/:token/upload', async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token || token.length < 32) {
    return res.status(400).json({
      success: false,
      error: 'Invalid onboarding token',
    });
  }

  // Validate token and get candidate info
  const validation = await validateOnboardingToken(token);
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: validation.error || 'Invalid or expired onboarding token',
    });
  }

  const { candidateId, candidateName, tenantSlug } = validation;

  if (!candidateId || !candidateName || !tenantSlug) {
    return res.status(400).json({
      success: false,
      error: 'Missing candidate information',
    });
  }

  try {
    const db = await getTenantPrisma(tenantSlug);

    // Get a system user ID (FK constraint requires valid user)
    const systemUser = await db.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    const anyUser = systemUser || await db.user.findFirst({ select: { id: true } });
    if (!anyUser) {
      return res.status(500).json({
        success: false,
        error: 'No user found in tenant for file ownership',
      });
    }
    const systemUserId = anyUser.id;
    logger.info({ systemUserId }, 'Using system user for onboarding document upload');

    // Ensure candidate folders exist
    const candidateFolder = await createCandidateOnBoardingFolders(
      db,
      candidateId,
      candidateName,
      systemUserId
    );

    // Get all subfolders
    const folders = await getCandidateOnBoardingFolder(db, candidateId);

    // Parse multipart form data
    let documentType: string | null = null;
    let documentSubType: string | null = null;
    let uploadedFile: {
      filename: string;
      mimeType: string;
      buffer: Buffer;
    } | null = null;

    await new Promise<void>((resolve, reject) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB max
          files: 1,
        },
      });

      const chunks: Buffer[] = [];

      busboy.on('field', (name, value) => {
        if (name === 'documentType') documentType = value;
        if (name === 'documentSubType') documentSubType = value;
      });

      busboy.on('file', (name, file, info) => {
        const { filename, mimeType } = info;

        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          uploadedFile = {
            filename,
            mimeType,
            buffer: Buffer.concat(chunks),
          };
        });
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);

      req.pipe(busboy);
    });

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required',
      });
    }

    // Find target subfolder
    const subfolderName = DOC_TYPE_TO_SUBFOLDER[documentType] || 'Other';
    const targetFolder = folders.subfolders.find(f => f.name === subfolderName);

    if (!targetFolder) {
      logger.warn({ documentType, subfolderName, candidateId }, 'Target subfolder not found');
      // Create the subfolder if it doesn't exist
    }

    // Generate storage key
    const fileId = randomUUID();
    const extension = uploadedFile.filename.split('.').pop() || '';
    const storageKey = `${tenantSlug}/onboarding/${candidateId}/${documentType}/${fileId}.${extension}`;

    // Upload to storage
    await storageService.uploadFile({
      key: storageKey,
      body: Buffer.from(uploadedFile.buffer),
      contentType: uploadedFile.mimeType,
      metadata: {
        candidateId,
        documentType,
        originalName: uploadedFile.filename,
      },
    });

    // Get file URL
    const fileUrl = await storageService.getDownloadUrl({
      key: storageKey,
      expiresIn: 86400, // 24 hours for onboarding
    });

    // Determine the target folder - use subfolder if exists, otherwise candidate folder
    const targetFolderId = targetFolder?.id || candidateFolder.id;
    const targetFolderPath = targetFolder?.path || candidateFolder.path;

    // Create file record in database
    const fileRecord = await db.file.create({
      data: {
        id: fileId,
        folderId: targetFolderId,
        name: uploadedFile.filename,
        storageName: `${fileId}.${extension}`,
        storageKey: storageKey,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.buffer.length,
        description: `Onboarding document: ${documentType}`,
        tags: ['onboarding', documentType, candidateId],
        entityType: 'CANDIDATE',
        entityId: candidateId,
        uploadedBy: systemUserId,
        currentVersion: 1,
      },
    });

    logger.info({
      candidateId,
      documentType,
      fileId: fileRecord.id,
      filename: uploadedFile.filename,
      folderId: targetFolderId,
    }, 'Onboarding document uploaded and saved to database');

    res.json({
      success: true,
      data: {
        fileId: fileRecord.id,
        documentType,
        filename: uploadedFile.filename,
        url: fileUrl,
        folderId: targetFolderId,
        path: targetFolderPath,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, candidateId }, 'Error uploading onboarding document');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document',
    });
  }
});

/**
 * GET /api/v1/public/onboarding/:token/files - Get uploaded files for this candidate
 */
router.get('/:token/files', async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token || token.length < 32) {
    return res.status(400).json({
      success: false,
      error: 'Invalid onboarding token',
    });
  }

  // Validate token
  const validation = await validateOnboardingToken(token);
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: validation.error || 'Invalid or expired onboarding token',
    });
  }

  const { candidateId, tenantSlug } = validation;

  if (!candidateId || !tenantSlug) {
    return res.status(400).json({
      success: false,
      error: 'Missing candidate information',
    });
  }

  try {
    const db = await getTenantPrisma(tenantSlug);

    // Get all files for this candidate
    const files = await db.file.findMany({
      where: {
        entityType: 'CANDIDATE',
        entityId: candidateId,
      },
      select: {
        id: true,
        name: true,
        storageName: true,
        mimeType: true,
        size: true,
        storageKey: true,
        description: true,
        tags: true,
        createdAt: true,
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add URLs to files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let url = '';
        try {
          url = await storageService.getDownloadUrl({
            key: file.storageKey,
            expiresIn: 3600,
          });
        } catch {
          // If URL generation fails, return empty
        }
        return {
          ...file,
          url,
        };
      })
    );

    res.json({
      success: true,
      data: filesWithUrls,
    });
  } catch (error: any) {
    logger.error({ error: error.message, candidateId }, 'Error getting onboarding files');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get files',
    });
  }
});

export default router;
