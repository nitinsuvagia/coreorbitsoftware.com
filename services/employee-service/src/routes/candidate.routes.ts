/**
 * Job Candidates Routes
 */

import express, { Request, Response } from 'express';
import { CandidateService } from '../services/candidate.service';
import { logger } from '../utils/logger';

const router = express.Router({ mergeParams: true }); // mergeParams to access jobId from parent route

/**
 * GET /candidates - Get all candidates across all jobs
 * GET /jobs/:jobId/candidates - Get all candidates for a specific job
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId } = req.params;
    const { status, search, job } = req.query;
    
    // If jobId is provided (from /jobs/:jobId/candidates), get candidates for that job
    // Otherwise, get all candidates
    if (jobId) {
      const candidates = await CandidateService.getCandidates(tenantSlug, jobId, {
        status: status as string,
        search: search as string,
      });
      return res.json(candidates);
    } else {
      const candidates = await CandidateService.getAllCandidates(tenantSlug, {
        status: status as string,
        search: search as string,
        jobId: job as string,
      });
      return res.json(candidates);
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidates');
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

/**
 * GET /jobs/:jobId/candidates/:candidateId - Get single candidate
 */
router.get('/:candidateId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId, candidateId } = req.params;
    const candidate = await CandidateService.getCandidateById(tenantSlug, jobId, candidateId);
    res.json(candidate);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidate');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

/**
 * POST /jobs/:jobId/candidates - Create new candidate
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId } = req.params;
    const candidate = await CandidateService.createCandidate(tenantSlug, jobId, req.body);
    res.status(201).json(candidate);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating candidate');
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

/**
 * PUT /jobs/:jobId/candidates/:candidateId - Update candidate
 */
router.put('/:candidateId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId, candidateId } = req.params;
    const candidate = await CandidateService.updateCandidate(tenantSlug, jobId, candidateId, req.body);
    res.json(candidate);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating candidate');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

/**
 * DELETE /jobs/:jobId/candidates/:candidateId - Delete candidate
 */
router.delete('/:candidateId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId, candidateId } = req.params;
    await CandidateService.deleteCandidate(tenantSlug, jobId, candidateId);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting candidate');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

export default router;
