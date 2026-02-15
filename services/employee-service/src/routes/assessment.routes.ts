/**
 * Assessment Routes
 * API endpoints for assessment/online test management
 */

import express, { Request, Response } from 'express';
import { AssessmentService } from '../services/assessment.service';
import { AIQuestionGeneratorService } from '../services/ai-question-generator.service';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================================================
// TESTS
// ============================================================================

/**
 * GET /assessments/tests - Get all tests with optional filters
 */
router.get('/tests', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { status, category, difficulty, search } = req.query;
    const tests = await AssessmentService.getAllTests(tenantSlug, {
      status: status as string,
      category: category as string,
      difficulty: difficulty as string,
      search: search as string,
    });

    res.json({ success: true, data: tests });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching assessment tests');
    res.status(500).json({ success: false, error: 'Failed to fetch assessment tests' });
  }
});

/**
 * GET /assessments/tests/published - Get published tests for dropdown selection
 */
router.get('/tests/published', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const tests = await AssessmentService.getPublishedTestsForSelection(tenantSlug);
    res.json({ success: true, data: tests });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching published tests');
    res.status(500).json({ success: false, error: 'Failed to fetch published tests' });
  }
});

/**
 * GET /assessments/tests/:id - Get a single test
 */
router.get('/tests/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const test = await AssessmentService.getTestById(tenantSlug, req.params.id);
    res.json({ success: true, data: test });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching assessment test');
    if (error.message === 'Test not found') {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch assessment test' });
  }
});

/**
 * GET /assessments/tests/:id/analytics - Get test analytics
 */
router.get('/tests/:id/analytics', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const analytics = await AssessmentService.getTestAnalytics(tenantSlug, req.params.id);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching test analytics');
    res.status(500).json({ success: false, error: 'Failed to fetch test analytics' });
  }
});

/**
 * POST /assessments/tests - Create a new test
 */
router.post('/tests', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const test = await AssessmentService.createTest(tenantSlug, req.body, userId);
    res.status(201).json({ success: true, data: test });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating assessment test');
    res.status(500).json({ success: false, error: 'Failed to create assessment test' });
  }
});

/**
 * PUT /assessments/tests/:id - Update a test
 */
router.put('/tests/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const test = await AssessmentService.updateTest(tenantSlug, req.params.id, req.body);
    res.json({ success: true, data: test });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating assessment test');
    if (error.message === 'Test not found') {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to update assessment test' });
  }
});

/**
 * DELETE /assessments/tests/:id - Delete a test
 */
router.delete('/tests/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.deleteTest(tenantSlug, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting assessment test');
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to delete assessment test' });
  }
});

/**
 * POST /assessments/tests/:id/publish - Publish a test
 */
router.post('/tests/:id/publish', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const test = await AssessmentService.publishTest(tenantSlug, req.params.id);
    res.json({ success: true, data: test });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error publishing assessment test');
    if (error.message.includes('Cannot publish')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to publish assessment test' });
  }
});

// ============================================================================
// SECTIONS
// ============================================================================

/**
 * POST /assessments/tests/:testId/sections - Create a section
 */
router.post('/tests/:testId/sections', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const section = await AssessmentService.createSection(tenantSlug, req.params.testId, req.body);
    res.status(201).json({ success: true, data: section });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating section');
    res.status(500).json({ success: false, error: 'Failed to create section' });
  }
});

/**
 * PUT /assessments/sections/:id - Update a section
 */
router.put('/sections/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const section = await AssessmentService.updateSection(tenantSlug, req.params.id, req.body);
    res.json({ success: true, data: section });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating section');
    res.status(500).json({ success: false, error: 'Failed to update section' });
  }
});

/**
 * DELETE /assessments/sections/:id - Delete a section
 */
router.delete('/sections/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.deleteSection(tenantSlug, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting section');
    res.status(500).json({ success: false, error: 'Failed to delete section' });
  }
});

// ============================================================================
// QUESTIONS
// ============================================================================

/**
 * GET /assessments/questions - Get all questions (Question Bank)
 */
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const filters = {
      type: req.query.type as string | undefined,
      category: req.query.category as string | undefined,
      difficulty: req.query.difficulty as string | undefined,
      search: req.query.search as string | undefined,
      testId: req.query.testId as string | undefined,
    };

    const questions = await AssessmentService.getQuestionBankQuestions(tenantSlug, filters);
    res.json({ success: true, data: questions });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error getting questions');
    res.status(500).json({ success: false, error: 'Failed to get questions' });
  }
});

/**
 * GET /assessments/questions/categories - Get unique categories
 */
router.get('/questions/categories', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const categories = await AssessmentService.getQuestionCategories(tenantSlug);
    res.json({ success: true, data: categories });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error getting categories');
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

/**
 * POST /assessments/questions - Create a question in Question Bank
 */
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    // testId can be null for Question Bank
    const question = await AssessmentService.createQuestion(tenantSlug, null, req.body, userId);
    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating question');
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

/**
 * GET /assessments/questions/:id - Get a question by ID
 */
router.get('/questions/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const question = await AssessmentService.getQuestionById(tenantSlug, req.params.id);
    res.json({ success: true, data: question });
  } catch (error: any) {
    if (error.message === 'Question not found') {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    logger.error({ error: error.message }, 'Error getting question');
    res.status(500).json({ success: false, error: 'Failed to get question' });
  }
});

/**
 * POST /assessments/questions/:id/add-to-test - Add question to a test
 */
router.post('/questions/:id/add-to-test', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { testId, sectionId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: 'testId required' });
    }

    const question = await AssessmentService.addQuestionToTest(tenantSlug, req.params.id, testId, sectionId);
    res.json({ success: true, data: question });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error adding question to test');
    res.status(500).json({ success: false, error: 'Failed to add question to test' });
  }
});

/**
 * POST /assessments/questions/:id/remove-from-test - Remove question from test (back to bank)
 */
router.post('/questions/:id/remove-from-test', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const question = await AssessmentService.removeQuestionFromTest(tenantSlug, req.params.id);
    res.json({ success: true, data: question });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error removing question from test');
    res.status(500).json({ success: false, error: 'Failed to remove question from test' });
  }
});

/**
 * POST /assessments/tests/:testId/questions - Create a question for a test
 */
router.post('/tests/:testId/questions', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const question = await AssessmentService.createQuestion(tenantSlug, req.params.testId, req.body, userId);
    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating question');
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

/**
 * POST /assessments/tests/:testId/questions/bulk - Bulk create questions
 */
router.post('/tests/:testId/questions/bulk', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array required' });
    }

    const result = await AssessmentService.bulkCreateQuestions(tenantSlug, req.params.testId, questions);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error bulk creating questions');
    res.status(500).json({ success: false, error: 'Failed to create questions' });
  }
});

/**
 * PUT /assessments/questions/:id - Update a question
 */
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const question = await AssessmentService.updateQuestion(tenantSlug, req.params.id, req.body);
    res.json({ success: true, data: question });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error updating question');
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
});

/**
 * DELETE /assessments/questions/:id - Delete a question
 */
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.deleteQuestion(tenantSlug, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error deleting question');
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * GET /assessments/invitations - Get all invitations with optional filters
 */
router.get('/invitations', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { testId, candidateId, status, dateFrom, dateTo, search } = req.query;
    const invitations = await AssessmentService.getAllInvitations(tenantSlug, {
      testId: testId as string,
      candidateId: candidateId as string,
      status: status as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      search: search as string,
    });

    res.json({ success: true, data: invitations });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching invitations');
    res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
});

// ============================================================================
// LIVE MONITORING
// ============================================================================

/**
 * GET /assessments/invitations/:id/monitor - Get live monitoring data for an invitation
 * NOTE: This route must be defined BEFORE /invitations/:id to match correctly
 */
router.get('/invitations/:id/monitor', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const data = await AssessmentService.getLiveMonitorData(tenantSlug, req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching monitor data');
    if (error.message === 'Invitation not found') {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch monitor data' });
  }
});

/**
 * GET /assessments/invitations/:id - Get a single invitation
 */
router.get('/invitations/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const invitation = await AssessmentService.getInvitationById(tenantSlug, req.params.id);
    res.json({ success: true, data: invitation });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching invitation');
    if (error.message === 'Invitation not found') {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch invitation' });
  }
});

/**
 * GET /assessments/invitations/code/:code - Get invitation by assessment code
 */
router.get('/invitations/code/:code', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const invitation = await AssessmentService.getInvitationByCode(tenantSlug, req.params.code);
    res.json({ success: true, data: invitation });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching invitation by code');
    
    // Return structured error for better frontend messaging
    const errorResponse: any = { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
    
    // Add additional details for specific error types
    if (error.code === 'ASSESSMENT_NOT_STARTED') {
      errorResponse.scheduledAt = error.scheduledAt;
      errorResponse.candidateName = error.candidateName;
      errorResponse.testName = error.testName;
    } else if (error.code === 'ASSESSMENT_EXPIRED') {
      errorResponse.expiredAt = error.expiredAt;
    }
    
    if (error.message.includes('Invalid') || error.message.includes('expired') || 
        error.message.includes('cancelled') || error.message.includes('not yet available') ||
        error.message.includes('completed')) {
      return res.status(400).json(errorResponse);
    }
    res.status(500).json({ success: false, error: 'Failed to fetch invitation' });
  }
});

/**
 * POST /assessments/invitations - Create a new invitation
 */
router.post('/invitations', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const invitation = await AssessmentService.createInvitation(tenantSlug, req.body, userId);
    res.status(201).json({ success: true, data: invitation });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error creating invitation');
    if (error.message === 'Test not found' || error.message.includes('must be published')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to create invitation' });
  }
});

/**
 * POST /assessments/invitations/:id/send - Send invitation email
 */
router.post('/invitations/:id/send', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.sendInvitationEmail(tenantSlug, req.params.id);
    res.json({ success: true, data: { sent: true } });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error sending invitation email');
    res.status(500).json({ success: false, error: error.message || 'Failed to send invitation email' });
  }
});

/**
 * POST /assessments/invitations/:id/remind - Send reminder email
 */
router.post('/invitations/:id/remind', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.sendReminderEmail(tenantSlug, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error sending reminder email');
    res.status(500).json({ success: false, error: 'Failed to send reminder email' });
  }
});

/**
 * POST /assessments/invitations/:id/cancel - Cancel an invitation
 */
router.post('/invitations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    await AssessmentService.cancelInvitation(tenantSlug, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error cancelling invitation');
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
  }
});

/**
 * POST /assessments/invitations/:id/regenerate-code - Regenerate assessment code
 */
router.post('/invitations/:id/regenerate-code', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const invitation = await AssessmentService.regenerateCode(tenantSlug, req.params.id);
    res.json({ success: true, data: invitation });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error regenerating code');
    res.status(500).json({ success: false, error: 'Failed to regenerate code' });
  }
});

// ============================================================================
// CANDIDATE ASSESSMENT FLOW (for candidates taking the test)
// ============================================================================

/**
 * POST /assessments/start/:invitationId - Start an assessment
 */
router.post('/start/:invitationId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { browserInfo, ipAddress } = req.body;
    const result = await AssessmentService.startAssessment(
      tenantSlug,
      req.params.invitationId,
      browserInfo,
      ipAddress || req.ip
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error starting assessment');
    res.status(500).json({ success: false, error: 'Failed to start assessment' });
  }
});

/**
 * POST /assessments/results/:resultId/answer - Submit an answer
 */
router.post('/results/:resultId/answer', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { questionId, answer, selectedOptions, timeTaken } = req.body;
    const result = await AssessmentService.submitAnswer(
      tenantSlug,
      req.params.resultId,
      questionId,
      { answer, selectedOptions },
      timeTaken
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error submitting answer');
    res.status(500).json({ success: false, error: 'Failed to submit answer' });
  }
});

/**
 * POST /assessments/results/:resultId/complete - Complete an assessment
 */
router.post('/results/:resultId/complete', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const result = await AssessmentService.completeAssessment(tenantSlug, req.params.resultId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error completing assessment');
    res.status(500).json({ success: false, error: 'Failed to complete assessment' });
  }
});

/**
 * POST /assessments/results/:resultId/tab-switch - Record tab switch violation
 */
router.post('/results/:resultId/tab-switch', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const result = await AssessmentService.recordTabSwitch(tenantSlug, req.params.resultId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error recording tab switch');
    res.status(500).json({ success: false, error: 'Failed to record tab switch' });
  }
});

/**
 * GET /assessments/results/:id - Get result by ID
 */
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const result = await AssessmentService.getResultById(tenantSlug, req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching result');
    if (error.message === 'Result not found') {
      return res.status(404).json({ success: false, error: 'Result not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch result' });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /assessments/analytics - Get overall analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { dateFrom, dateTo } = req.query;
    const analytics = await AssessmentService.getOverallAnalytics(
      tenantSlug,
      dateFrom as string,
      dateTo as string
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching analytics');
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /assessments/analytics/extended - Get extended analytics
 */
router.get('/analytics/extended', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { dateFrom, dateTo } = req.query;
    const analytics = await AssessmentService.getExtendedAnalytics(
      tenantSlug,
      dateFrom as string,
      dateTo as string
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching extended analytics');
    res.status(500).json({ success: false, error: 'Failed to fetch extended analytics' });
  }
});

/**
 * GET /assessments/results - Get all results with filters
 */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { testId, status, passed, dateFrom, dateTo, search, includeAnswers } = req.query;
    const results = await AssessmentService.getAllResults(tenantSlug, {
      testId: testId as string,
      status: status as string,
      passed: passed === 'true' ? true : passed === 'false' ? false : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      search: search as string,
      includeAnswers: includeAnswers === 'true',
    });
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching results');
    res.status(500).json({ success: false, error: 'Failed to fetch results' });
  }
});

/**
 * GET /assessments/current - Get current/active assessments
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { testId, status, search } = req.query;
    const invitations = await AssessmentService.getCurrentAssessments(tenantSlug, {
      testId: testId as string,
      status: status as string,
      search: search as string,
    });
    res.json({ success: true, data: invitations });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching current assessments');
    res.status(500).json({ success: false, error: 'Failed to fetch current assessments' });
  }
});

/**
 * GET /assessments/candidates - Get candidates for invite
 */
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { jobId, search, status } = req.query;
    const candidates = await AssessmentService.getCandidatesForInvite(tenantSlug, {
      jobId: jobId as string,
      search: search as string,
      status: status as string,
    });
    res.json({ success: true, data: candidates });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error fetching candidates');
    res.status(500).json({ success: false, error: 'Failed to fetch candidates' });
  }
});

/**
 * POST /assessments/invitations/bulk - Bulk create invitations
 */
router.post('/invitations/bulk', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { testId, candidateIds, validFrom, validUntil, sendEmail } = req.body;
    if (!testId || !candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'testId and candidateIds array required' });
    }

    const invitations = await AssessmentService.bulkCreateInvitations(
      tenantSlug,
      { testId, candidateIds, validFrom, validUntil, sendEmail },
      userId
    );
    res.status(201).json({ success: true, data: invitations });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error bulk creating invitations');
    if (error.message === 'Test not found' || error.message.includes('must be published')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to create invitations' });
  }
});

// ============================================================================
// AI QUESTION GENERATION
// ============================================================================

/**
 * GET /assessments/ai/categories - Get available AI categories
 */
router.get('/ai/categories', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string || 'default';
    const categories = await AIQuestionGeneratorService.getAvailableCategories(tenantSlug);
    const usingOpenAI = await AIQuestionGeneratorService.isOpenAIConfigured(tenantSlug);
    
    res.json({ 
      success: true, 
      data: categories,
      meta: {
        openaiEnabled: usingOpenAI,
        message: usingOpenAI 
          ? 'Extended categories available with OpenAI' 
          : 'Standard categories (configure OpenAI for more options)'
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error getting AI categories');
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

/**
 * POST /assessments/ai/generate - Generate questions using AI
 */
router.post('/ai/generate', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, count = 5, questionTypes = ['MULTIPLE_CHOICE'] } = req.body;
    const tenantSlug = req.headers['x-tenant-slug'] as string || 'default';
    
    if (!category || !difficulty) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category and difficulty are required' 
      });
    }
    
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
    if (!validDifficulties.includes(difficulty.toUpperCase())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid difficulty. Must be EASY, MEDIUM, HARD, or EXPERT' 
      });
    }

    const validQuestionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'MULTIPLE_SELECT'];
    const filteredTypes = Array.isArray(questionTypes) 
      ? questionTypes.filter((t: string) => validQuestionTypes.includes(t))
      : ['MULTIPLE_CHOICE'];
    
    // Pass tenant ID to enable OpenAI integration when configured
    const questions = await AIQuestionGeneratorService.generateQuestions({
      category,
      difficulty: difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT',
      count: Math.min(Math.max(1, count), 20), // Limit between 1-20
      questionTypes: filteredTypes.length > 0 ? filteredTypes : ['MULTIPLE_CHOICE'],
    }, tenantSlug);
    
    // Check if OpenAI was used
    const usingOpenAI = await AIQuestionGeneratorService.isOpenAIConfigured(tenantSlug);
    
    logger.info({ category, difficulty, count: questions.length, usingOpenAI }, 'AI questions generated');
    res.json({ 
      success: true, 
      data: questions,
      meta: {
        source: usingOpenAI ? 'openai' : 'predefined',
        message: usingOpenAI 
          ? 'Questions generated using OpenAI' 
          : 'Questions from predefined database (configure OpenAI for AI-generated questions)'
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error generating AI questions');
    res.status(500).json({ success: false, error: 'Failed to generate questions' });
  }
});

/**
 * POST /assessments/questions/bulk-import - Bulk import questions with duplicate detection
 */
router.post('/questions/bulk-import', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Tenant slug required' });
    }

    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Questions array is required and must not be empty' 
      });
    }
    
    // Get existing questions to check for duplicates
    const existingQuestions = await AssessmentService.getQuestionBankQuestions(tenantSlug, {});
    const existingTexts = new Set(
      existingQuestions.map((q: any) => q.question.toLowerCase().trim())
    );
    
    // Filter out duplicates
    const newQuestions = questions.filter(
      (q: any) => !existingTexts.has(q.question.toLowerCase().trim())
    );
    const duplicateCount = questions.length - newQuestions.length;
    
    // Import non-duplicate questions
    const importedQuestions = [];
    for (const question of newQuestions) {
      try {
        const created = await AssessmentService.createQuestion(
          tenantSlug, 
          null, // testId = null for Question Bank
          question, 
          userId
        );
        importedQuestions.push(created);
      } catch (err: any) {
        logger.warn({ error: err.message, question: question.question }, 'Failed to import single question');
      }
    }
    
    logger.info({ 
      tenantSlug, 
      total: questions.length, 
      imported: importedQuestions.length, 
      duplicates: duplicateCount 
    }, 'Bulk import completed');
    
    res.status(201).json({ 
      success: true, 
      data: {
        imported: importedQuestions.length,
        duplicates: duplicateCount,
        total: questions.length,
        questions: importedQuestions,
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error bulk importing questions');
    res.status(500).json({ success: false, error: 'Failed to import questions' });
  }
});

export default router;
