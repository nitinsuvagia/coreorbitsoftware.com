/**
 * Interview Routes
 * API endpoints for interview management
 */

import express, { Request, Response } from 'express';
import { InterviewService } from '../services/interview.service';
import { getEmployeeByUserId } from '../services/employee.service';
import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /interviews - Get all interviews with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { status, type, jobId, candidateId, interviewerId, dateFrom, dateTo, search } = req.query;

    const interviews = await InterviewService.getAllInterviews(tenantSlug, {
      status: status as string,
      type: type as string,
      jobId: jobId as string,
      candidateId: candidateId as string,
      interviewerId: interviewerId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      search: search as string,
    });

    res.json(interviews);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching interviews');
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

/**
 * GET /interviews/analytics - Get comprehensive interview analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { dateFrom, dateTo } = req.query;
    const analytics = await InterviewService.getAnalytics(tenantSlug, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.json(analytics);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching interview analytics');
    res.status(500).json({ error: 'Failed to fetch interview analytics' });
  }
});

/**
 * GET /interviews/stats - Get interview statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { dateFrom, dateTo } = req.query;
    const stats = await InterviewService.getStats(tenantSlug, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.json(stats);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching interview stats');
    res.status(500).json({ error: 'Failed to fetch interview stats' });
  }
});

/**
 * GET /interviews/today - Get today's interviews
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const interviews = await InterviewService.getTodayInterviews(tenantSlug);
    res.json(interviews);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching today\'s interviews');
    res.status(500).json({ error: 'Failed to fetch today\'s interviews' });
  }
});

/**
 * GET /interviews/candidate/:candidateId - Get interviews for a candidate
 */
router.get('/candidate/:candidateId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const interviews = await InterviewService.getCandidateInterviews(tenantSlug, req.params.candidateId);
    res.json(interviews);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidate interviews');
    res.status(500).json({ error: 'Failed to fetch candidate interviews' });
  }
});

/**
 * GET /interviews/:id - Get a single interview
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const interview = await InterviewService.getInterviewById(tenantSlug, req.params.id);
    res.json(interview);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching interview');
    if (error.message === 'Interview not found') {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

/**
 * POST /interviews - Create a new interview
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const userId = req.headers['x-user-id'] as string;
    const interview = await InterviewService.createInterview(tenantSlug, req.body, userId);

    res.status(201).json(interview);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating interview');
    if (error.message === 'Candidate not found') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

/**
 * PUT /interviews/:id - Update an interview
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const userId = req.headers['x-user-id'] as string;
    const interview = await InterviewService.updateInterview(tenantSlug, req.params.id, req.body, userId);

    res.json(interview);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating interview');
    if (error.message === 'Interview not found') {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

/**
 * POST /interviews/:id/cancel - Cancel an interview
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { reason } = req.body;
    await InterviewService.cancelInterview(tenantSlug, req.params.id, reason);

    res.json({ success: true, message: 'Interview cancelled' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error cancelling interview');
    res.status(500).json({ error: 'Failed to cancel interview' });
  }
});

/**
 * POST /interviews/:id/complete - Mark interview as complete
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const interview = await InterviewService.completeInterview(tenantSlug, req.params.id);
    res.json(interview);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error completing interview');
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});

/**
 * POST /interviews/:id/reschedule - Reschedule an interview
 */
router.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { scheduledAt, duration } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: 'New scheduled date is required' });
    }

    const interview = await InterviewService.rescheduleInterview(tenantSlug, req.params.id, scheduledAt, duration);
    res.json(interview);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error rescheduling interview');
    res.status(500).json({ error: 'Failed to reschedule interview' });
  }
});

/**
 * POST /interviews/:id/feedback - Submit or update feedback
 */
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    // Get interviewer ID from header or body
    let interviewerId = req.headers['x-employee-id'] as string || req.body.interviewerId;
    if (!interviewerId) {
      return res.status(400).json({ error: 'Interviewer ID is required' });
    }

    logger.info({ interviewerId, interviewId: req.params.id }, 'Processing feedback submission');

    // If interviewerId looks like a user ID (starts with 'user-'), look up the employee
    if (interviewerId.startsWith('user-')) {
      try {
        const db = await getTenantPrismaBySlug(tenantSlug);
        const employee = await getEmployeeByUserId(db, interviewerId);
        if (!employee) {
          logger.warn({ userId: interviewerId }, 'No employee found for user ID');
          return res.status(400).json({ error: 'Employee not found for user ID. Please ensure your user account is linked to an employee record.' });
        }
        logger.info({ userId: interviewerId, employeeId: employee.id }, 'Resolved user ID to employee ID');
        interviewerId = employee.id;
      } catch (lookupError: any) {
        logger.error({ error: lookupError.message, userId: interviewerId }, 'Error looking up employee by user ID');
        return res.status(400).json({ error: `Failed to lookup employee: ${lookupError.message}` });
      }
    }

    const feedback = await InterviewService.submitFeedback(tenantSlug, req.params.id, interviewerId, req.body);
    res.json(feedback);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error submitting feedback');
    res.status(500).json({ error: 'Failed to submit feedback', details: error.message });
  }
});

/**
 * DELETE /interviews/:id - Delete an interview
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await InterviewService.deleteInterview(tenantSlug, req.params.id);
    res.json({ success: true, message: 'Interview deleted' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting interview');
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

export default router;
