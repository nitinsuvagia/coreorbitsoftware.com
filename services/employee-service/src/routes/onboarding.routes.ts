/**
 * Onboarding Routes
 * - Public routes for candidates to access onboarding portal
 * - Protected routes for HR to manage onboarding
 */

import express, { Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES - For candidates (no authentication required)
// ============================================================================

/**
 * GET /onboarding/:token - Get onboarding details by token
 * Public endpoint - allows candidate to view onboarding form
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    const onboarding = await OnboardingService.getOnboardingByToken(token);

    if (!onboarding) {
      return res.status(404).json({
        success: false,
        error: 'Onboarding link not found or has been invalidated',
      });
    }

    // Check if expired
    if ('expired' in onboarding) {
      return res.status(410).json({
        success: false,
        expired: true,
        error: onboarding.message,
      });
    }

    // Check if completed
    if ('completed' in onboarding) {
      return res.status(200).json({
        success: true,
        completed: true,
        message: onboarding.message,
      });
    }

    res.json({
      success: true,
      data: onboarding,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching onboarding details');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding details',
    });
  }
});

/**
 * POST /onboarding/:token/authenticate - Authenticate candidate for onboarding
 * Public endpoint - candidate logs in with temp credentials
 */
router.post('/:token/authenticate', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { email, password } = req.body;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await OnboardingService.authenticateOnboarding(token, email, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Onboarding authentication failed');
    res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
});

/**
 * PUT /onboarding/:token/details - Save onboarding details
 * Public endpoint - candidate fills in their details
 */
router.put('/:token/details', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { address, emergencyContact, education, bankDetails, personal } = req.body;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    const result = await OnboardingService.saveOnboardingDetails(token, {
      address,
      emergencyContact,
      education,
      bankDetails,
      personal,
    });

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error saving onboarding details');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to save details',
    });
  }
});

/**
 * POST /onboarding/:token/complete - Complete onboarding
 * Public endpoint - candidate submits onboarding form
 */
router.post('/:token/complete', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    const result = await OnboardingService.completeOnboarding(token);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error completing onboarding');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to complete onboarding',
    });
  }
});

export const publicOnboardingRouter = router;

// ============================================================================
// PROTECTED ROUTES - For HR (authentication required)
// ============================================================================

const protectedRouter = express.Router();

/**
 * GET /api/onboarding/ready - Get candidates ready for onboarding (OFFER_ACCEPTED)
 */
protectedRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    const candidates = await OnboardingService.getCandidatesReadyForOnboarding(tenantSlug);

    res.json({
      success: true,
      data: candidates,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidates ready for onboarding');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates',
    });
  }
});

/**
 * GET /api/onboarding/in-progress - Get candidates currently in onboarding
 */
protectedRouter.get('/in-progress', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    const candidates = await OnboardingService.getCandidatesInOnboarding(tenantSlug);

    res.json({
      success: true,
      data: candidates,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidates in onboarding');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates',
    });
  }
});

/**
 * GET /api/onboarding/ready-to-hire - Get candidates ready to be hired
 */
protectedRouter.get('/ready-to-hire', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    const candidates = await OnboardingService.getCandidatesReadyToHire(tenantSlug);

    res.json({
      success: true,
      data: candidates,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidates ready to hire');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates',
    });
  }
});

/**
 * POST /api/onboarding/start - Start onboarding for a candidate
 * Called by HR after candidate accepts offer
 */
protectedRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const { candidateId } = req.body;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required',
      });
    }

    const result = await OnboardingService.startOnboarding({
      candidateId,
      tenantSlug,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error starting onboarding');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to start onboarding',
    });
  }
});

/**
 * POST /api/onboarding/hire - Mark candidate as hired (creates employee record)
 * Called by HR after candidate joins the office
 */
protectedRouter.post('/hire', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const { candidateId, joiningDate } = req.body;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
    }

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required',
      });
    }

    const result = await OnboardingService.markAsHired({
      candidateId,
      tenantSlug,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error marking candidate as hired');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark as hired',
    });
  }
});

export const protectedOnboardingRouter = protectedRouter;
