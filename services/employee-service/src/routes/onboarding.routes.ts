/**
 * Onboarding Routes
 * - Public routes for candidates to access onboarding portal
 * - Protected routes for HR to manage onboarding
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { OnboardingService } from '../services/onboarding.service';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads', 'onboarding');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'));
    }
  },
});

// ============================================================================
// PUBLIC ROUTES - For candidates (no authentication required)
// ============================================================================

/**
 * GET /onboarding/files/:filename - Serve uploaded onboarding files
 * Public endpoint - allows viewing uploaded documents
 */
router.get('/files/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required',
      });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error serving onboarding file');
    res.status(500).json({
      success: false,
      error: 'Failed to serve file',
    });
  }
});

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
    const { address, emergencyContact, education, bankDetails, personal, documents } = req.body;

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
      documents,
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
 * POST /onboarding/:token/save - Save onboarding progress
 * Public endpoint - candidate saves progress (alias for PUT /details)
 */
router.post('/:token/save', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { data } = req.body;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Form data is required',
      });
    }

    const result = await OnboardingService.saveOnboardingDetails(token, {
      address: data.address,
      emergencyContact: data.emergencyContact,
      education: data.education,
      bankDetails: data.bankDetails,
      personal: data.personal,
      documents: data.documents,
    });

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error saving onboarding progress');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to save progress',
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
    
    // Extract declaration data - frontend sends it as `declaration` object
    // which contains both the consent flags and signature
    const { declaration, declarations: legacyDeclarations, signature: legacySignature } = req.body;
    
    // Support both formats:
    // 1. New format: { declaration: { backgroundCheckConsent, signature, ... } }
    // 2. Legacy format: { declarations: {...}, signature: "..." }
    let finalDeclarations: Record<string, boolean> | undefined;
    let finalSignature: string | undefined;
    
    if (declaration) {
      // New format - extract from declaration object
      const { signature, ...consentFlags } = declaration;
      finalDeclarations = consentFlags;
      finalSignature = signature;
    } else {
      // Legacy format
      finalDeclarations = legacyDeclarations;
      finalSignature = legacySignature;
    }

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    const result = await OnboardingService.completeOnboarding(token, { 
      declarations: finalDeclarations, 
      signature: finalSignature 
    });

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

/**
 * POST /onboarding/:token/upload - Upload document for onboarding
 * Public endpoint - candidate uploads documents
 */
router.post('/:token/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid onboarding token',
      });
    }

    const result = await OnboardingService.uploadDocument(token, req);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error uploading onboarding document');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload document',
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
 * POST /api/onboarding/resend - Resend onboarding email with new credentials
 * Called by HR when candidate didn't receive or lost the email
 */
protectedRouter.post('/resend', async (req: Request, res: Response) => {
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

    const result = await OnboardingService.resendOnboardingEmail({
      candidateId,
      tenantSlug,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error resending onboarding email');
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to resend onboarding email',
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
