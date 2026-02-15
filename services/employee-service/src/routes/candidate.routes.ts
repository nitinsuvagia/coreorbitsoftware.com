/**
 * Job Candidates Routes
 */

import express, { Request, Response } from 'express';
import { CandidateService } from '../services/candidate.service';
import { OfferService } from '../services/offer.service';
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

/**
 * PATCH /candidates/:candidateId/status - Update candidate status only
 */
router.patch('/:candidateId/status', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { candidateId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const candidate = await CandidateService.updateCandidateStatus(tenantSlug, candidateId, status);
    res.json(candidate);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating candidate status');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to update candidate status' });
  }
});

/**
 * POST /candidates/bulk-delete - Bulk delete candidates
 */
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { candidates } = req.body;
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates array required' });
    }

    const result = await CandidateService.bulkDeleteCandidates(tenantSlug, candidates);
    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error bulk deleting candidates');
    res.status(500).json({ error: 'Failed to bulk delete candidates' });
  }
});

/**
 * POST /jobs/:jobId/candidates/:candidateId/send-offer - Send offer to candidate
 */
router.post('/:candidateId/send-offer', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId, candidateId } = req.params;
    const { salary, currency, joiningDate, designation, department, additionalTerms } = req.body;

    if (!salary || !joiningDate) {
      return res.status(400).json({ error: 'Salary and joining date are required' });
    }

    const result = await OfferService.sendOffer(tenantSlug, {
      candidateId,
      jobId,
      salary,
      currency: currency || 'INR',
      joiningDate: new Date(joiningDate),
      designation,
      department,
      additionalTerms,
    });

    res.json({
      success: true,
      message: 'Offer sent successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error sending offer');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to send offer' });
  }
});

export default router;
