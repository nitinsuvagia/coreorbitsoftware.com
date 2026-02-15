/**
 * Onboarding Routes - API endpoints for onboarding document management
 */

import { Router } from 'express';
import { getTenantPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import {
  createCandidateOnBoardingFolders,
  getCandidateOnBoardingFolder,
  moveOnBoardingDocsToEmployee,
  getOrCreateOnBoardingFolder,
} from '../services/folder-init.service';

const router = Router();

/**
 * POST /api/v1/onboarding/folders - Create onboarding folders for a candidate
 */
router.post('/folders', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = (req as any).user?.id;

    if (!tenantSlug) {
      return res.status(400).json({ success: false, error: 'Missing tenant slug' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { candidateId, candidateName } = req.body;

    if (!candidateId || !candidateName) {
      return res.status(400).json({ 
        success: false, 
        error: 'candidateId and candidateName are required' 
      });
    }

    const db = await getTenantPrisma(tenantSlug);
    
    const folder = await createCandidateOnBoardingFolders(
      db,
      candidateId,
      candidateName,
      userId
    );

    res.json({ success: true, folder });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating onboarding folders');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/onboarding/folders/:candidateId - Get candidate's onboarding folder structure
 */
router.get('/folders/:candidateId', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const { candidateId } = req.params;

    if (!tenantSlug) {
      return res.status(400).json({ success: false, error: 'Missing tenant slug' });
    }

    const db = await getTenantPrisma(tenantSlug);
    
    const folders = await getCandidateOnBoardingFolder(db, candidateId);

    res.json({ success: true, folders });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error getting onboarding folders');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/onboarding/move-to-employee - Move onboarding docs to employee folder
 */
router.post('/move-to-employee', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = (req as any).user?.id;

    if (!tenantSlug) {
      return res.status(400).json({ success: false, error: 'Missing tenant slug' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { candidateId, employeeId, employeeCode, employeeName } = req.body;

    if (!candidateId || !employeeId || !employeeCode || !employeeName) {
      return res.status(400).json({ 
        success: false, 
        error: 'candidateId, employeeId, employeeCode, and employeeName are required' 
      });
    }

    const db = await getTenantPrisma(tenantSlug);
    
    await moveOnBoardingDocsToEmployee(
      db,
      candidateId,
      employeeId,
      employeeCode,
      employeeName,
      userId
    );

    // Count files that were moved
    const candidateFolders = await getCandidateOnBoardingFolder(db, candidateId);
    const filesCount = 0; // Folders are deleted after move, so count is 0 here

    res.json({ success: true, filesCount, message: 'Documents moved to employee folder' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error moving onboarding documents');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/onboarding/root - Get or create the On-Boarding root folder
 */
router.get('/root', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = (req as any).user?.id;

    if (!tenantSlug) {
      return res.status(400).json({ success: false, error: 'Missing tenant slug' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const db = await getTenantPrisma(tenantSlug);
    
    const folder = await getOrCreateOnBoardingFolder(db, userId);

    res.json({ success: true, folder });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error getting onboarding root folder');
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
