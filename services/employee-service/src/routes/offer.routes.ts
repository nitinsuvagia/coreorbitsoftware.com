/**
 * Public Offer Routes - No authentication required
 * These routes allow candidates to view and respond to job offers
 */

import express, { Request, Response } from 'express';
import { OfferService } from '../services/offer.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /offer/:token - Get offer details by token
 * Public endpoint - no authentication required
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer token',
      });
    }

    const offer = await OfferService.getOfferByToken(token);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or has been invalidated',
      });
    }

    // Check if expired or already responded
    if ('expired' in offer) {
      return res.status(410).json({
        success: false,
        expired: true,
        error: offer.message,
      });
    }

    if ('alreadyResponded' in offer) {
      return res.status(200).json({
        success: true,
        alreadyResponded: true,
        response: offer.response,
        message: offer.message,
      });
    }

    res.json({
      success: true,
      data: offer,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching offer');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offer details',
    });
  }
});

/**
 * POST /offer/:token/respond - Respond to offer (accept/reject)
 * Public endpoint - no authentication required
 */
router.post('/:token/respond', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { response, signature, termsAccepted } = req.body;

    if (!token || token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer token',
      });
    }

    if (!response || !['ACCEPTED', 'REJECTED'].includes(response)) {
      return res.status(400).json({
        success: false,
        error: 'Response must be either ACCEPTED or REJECTED',
      });
    }

    if (response === 'ACCEPTED') {
      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Signature is required to accept the offer',
        });
      }
      if (!termsAccepted) {
        return res.status(400).json({
          success: false,
          error: 'You must accept the terms and conditions',
        });
      }
    }

    const result = await OfferService.respondToOffer(token, {
      token,
      response,
      signature,
      termsAccepted,
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error responding to offer');

    if (error.message.includes('expired')) {
      return res.status(410).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('already')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process response',
    });
  }
});

/**
 * GET /offer/:token/terms - Get terms and conditions
 * Public endpoint
 */
router.get('/:token/terms', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Verify token is valid
    const offer = await OfferService.getOfferByToken(token);
    if (!offer || 'expired' in offer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired offer',
      });
    }

    // Return standard terms and conditions
    const terms = `
OFFER LETTER TERMS AND CONDITIONS

1. EMPLOYMENT TERMS
This offer of employment is contingent upon successful completion of background verification and reference checks. The company reserves the right to withdraw this offer if any discrepancies are found.

2. COMPENSATION
Your compensation package includes the base salary as mentioned in this offer. Additional benefits, bonuses, and incentives will be as per company policy and will be communicated during your onboarding.

3. PROBATION PERIOD
You will be on probation for a period of 3 months from your date of joining. During this period, either party may terminate the employment with a notice period of 7 days.

4. CONFIDENTIALITY
You agree to maintain strict confidentiality regarding all company proprietary information, trade secrets, and business strategies during and after your employment.

5. NON-COMPETE
During your employment and for a period of 6 months after termination, you agree not to engage in any business that directly competes with the company's core business.

6. INTELLECTUAL PROPERTY
All work products, inventions, and intellectual property created during your employment shall be the sole property of the company.

7. CODE OF CONDUCT
You agree to abide by the company's code of conduct, policies, and procedures as communicated during onboarding and as amended from time to time.

8. AT-WILL EMPLOYMENT
Your employment is at-will, meaning either you or the company may terminate the employment relationship at any time, with or without cause, subject to applicable notice period requirements.

9. DOCUMENTATION
You are required to submit all necessary documents including identity proof, address proof, educational certificates, and previous employment documents within 7 days of joining.

10. ACCEPTANCE
By signing this offer letter, you confirm that you have read, understood, and agree to all the terms and conditions mentioned herein.

This offer is valid until the expiry date mentioned in the offer letter.
    `.trim();

    res.json({
      success: true,
      data: {
        terms,
        lastUpdated: '2026-01-01',
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching terms');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms',
    });
  }
});

export default router;
