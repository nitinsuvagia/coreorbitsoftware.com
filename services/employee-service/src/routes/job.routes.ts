/**
 * Job Description Routes
 */

import express, { Request, Response } from 'express';
import { JobService } from '../services/job.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /jobs - Get all job descriptions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { status, department, search } = req.query;
    const jobs = await JobService.getAllJobs(tenantSlug, {
      status: status as string,
      department: department as string,
      search: search as string,
    });

    res.json(jobs);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching jobs');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /jobs/:id - Get single job description
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const job = await JobService.getJobById(tenantSlug, req.params.id);
    res.json(job);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching job');
    if (error.message === 'Job not found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * POST /jobs - Create new job description
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const userId = req.headers['x-user-id'] as string;
    const job = await JobService.createJob(tenantSlug, req.body, userId);
    res.status(201).json(job);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating job');
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * PUT /jobs/:id - Update job description
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const userId = req.headers['x-user-id'] as string;
    const job = await JobService.updateJob(tenantSlug, req.params.id, req.body, userId);
    res.json(job);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating job');
    if (error.message === 'Job not found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * DELETE /jobs/:id - Delete job description
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await JobService.deleteJob(tenantSlug, req.params.id);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting job');
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * PATCH /jobs/:id/statistics - Update job statistics
 */
router.patch('/:id/statistics', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const job = await JobService.updateJobStatistics(tenantSlug, req.params.id, req.body);
    res.json(job);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating job statistics');
    res.status(500).json({ error: 'Failed to update job statistics' });
  }
});

export default router;
