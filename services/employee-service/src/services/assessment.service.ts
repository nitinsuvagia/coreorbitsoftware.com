/**
 * Assessment Service
 * Handles all assessment-related business logic for online tests
 */

import { getTenantPrismaBySlug, getMasterPrisma } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateTestDto {
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  duration?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  proctoring?: boolean;
  webcamRequired?: boolean;
  fullscreen?: boolean;
  tabSwitchLimit?: number;
  sections?: CreateSectionDto[];
  questions?: CreateQuestionDto[];
}

export interface UpdateTestDto extends Partial<CreateTestDto> {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface CreateSectionDto {
  name: string;
  description?: string;
  order?: number;
  timeLimit?: number;
  weightage?: number;
  questionIds?: string[]; // IDs of questions to add to this section (for fixed mode)
  // New fields for selection mode
  selectionMode?: 'random' | 'fixed'; // random or fixed question selection
  randomCount?: number; // Number of questions to pick randomly
  category?: string; // Category to pick random questions from
  shuffleQuestions?: boolean; // Shuffle questions within this section
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {}

export interface CreateQuestionDto {
  testId?: string; // Optional for Question Bank
  sectionId?: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'CODING';
  question: string;
  code?: string;
  codeLanguage?: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  category?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  tags?: string[];
  points?: number;
  negativeMarking?: number;
  order?: number;
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {}

export interface CreateInvitationDto {
  testId: string;
  candidateId?: string;
  candidateEmail: string;
  candidateName: string;
  validFrom?: string;
  validUntil: string;
  interviewId?: string;
  sendEmail?: boolean;
}

export interface TestFilters {
  status?: string;
  category?: string;
  difficulty?: string;
  search?: string;
}

export interface InvitationFilters {
  testId?: string;
  candidateId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface QuestionBankFilters {
  type?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  search?: string;
  testId?: string; // Filter by test (null for bank only)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique assessment code for candidate access
 */
function generateAssessmentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AssessmentService {
  // ==========================================================================
  // TESTS
  // ==========================================================================

  /**
   * Get all tests with optional filters
   */
  static async getAllTests(tenantSlug: string, filters?: TestFilters) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters?.difficulty && filters.difficulty !== 'all') {
      where.difficulty = filters.difficulty;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tests = await db.assessmentTest.findMany({
      where,
      include: {
        sections: {
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
        _count: {
          select: {
            sections: true,
            questions: true,
            invitations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include counts
    return tests.map((test: any) => {
      // Count questions from sections (these already have testId set, so don't double count)
      const sectionQuestionsCount = (test.sections || []).reduce(
        (sum: number, section: any) => sum + (section._count?.questions || 0),
        0
      );
      // Only count section questions (questions with testId but no sectionId are direct questions)
      // Since we're using sections, all questions should be in sections
      const totalQuestionsCount = sectionQuestionsCount;
      
      // Strip HTML tags from description for listing
      const plainDescription = test.description
        ? test.description.replace(/<[^>]*>/g, '').trim()
        : '';

      return {
        ...test,
        description: plainDescription,
        sectionsCount: test._count.sections,
        questionsCount: totalQuestionsCount,
        invitationsCount: test._count.invitations,
        sections: undefined, // Don't include full sections in list response
        _count: undefined,
      };
    });
  }

  /**
   * Get a single test by ID
   */
  static async getTestById(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const test = await db.assessmentTest.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        questions: {
          where: { sectionId: null }, // Questions not in any section
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            invitations: true,
          },
        },
      },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    return test;
  }

  /**
   * Create a new test
   */
  static async createTest(tenantSlug: string, data: CreateTestDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const test = await db.assessmentTest.create({
      data: {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        category: data.category,
        difficulty: data.difficulty || 'MEDIUM',
        duration: data.duration || 60,
        passingScore: data.passingScore || 70,
        maxAttempts: data.maxAttempts || 1,
        shuffleQuestions: data.shuffleQuestions || false,
        shuffleOptions: data.shuffleOptions || false,
        showResults: data.showResults !== false,
        proctoring: data.proctoring || false,
        webcamRequired: data.webcamRequired || false,
        fullscreen: data.fullscreen !== false,
        tabSwitchLimit: data.tabSwitchLimit || 3,
        createdBy: userId,
        sections: data.sections ? {
          create: data.sections.map((section, index) => ({
            name: section.name,
            description: section.description,
            order: section.order ?? index,
            timeLimit: section.timeLimit,
            weightage: section.weightage ?? 0,
          })),
        } : undefined,
      },
      include: {
        sections: true,
      },
    });

    // Create questions if provided
    if (data.questions && data.questions.length > 0) {
      await db.assessmentQuestion.createMany({
        data: data.questions.map((q, index) => ({
          testId: test.id,
          sectionId: q.sectionId,
          type: q.type,
          question: q.question,
          code: q.code,
          codeLanguage: q.codeLanguage,
          options: q.options as any,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 1,
          negativeMarking: q.negativeMarking || 0,
          order: q.order ?? index,
        })),
      });
    }

    logger.info({ testId: test.id }, 'Assessment test created');
    return test;
  }

  /**
   * Update a test
   */
  static async updateTest(tenantSlug: string, id: string, data: UpdateTestDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Check if test exists
    const existingTest = await db.assessmentTest.findUnique({
      where: { id },
    });

    if (!existingTest) {
      throw new Error('Test not found');
    }

    const test = await db.assessmentTest.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        passingScore: data.passingScore,
        maxAttempts: data.maxAttempts,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
        showResults: data.showResults,
        proctoring: data.proctoring,
        webcamRequired: data.webcamRequired,
        fullscreen: data.fullscreen,
        tabSwitchLimit: data.tabSwitchLimit,
        status: data.status,
        publishedAt: data.status === 'PUBLISHED' && existingTest.status !== 'PUBLISHED'
          ? new Date()
          : undefined,
      },
    });

    // Handle sections if provided
    if (data.sections && data.sections.length > 0) {
      // Delete existing sections first (this will also delete section questions due to cascade)
      await db.assessmentSection.deleteMany({
        where: { testId: id },
      });

      // Delete all questions associated with this test
      await db.assessmentQuestion.deleteMany({
        where: { testId: id },
      });

      // Create new sections with weightage and link questions
      for (const section of data.sections) {
        const newSection = await db.assessmentSection.create({
          data: {
            testId: id,
            name: section.name,
            description: section.description,
            order: section.order ?? 0,
            timeLimit: section.timeLimit,
            weightage: section.weightage ?? 0,
            selectionMode: section.selectionMode || 'fixed',
            randomCount: section.randomCount ?? 0,
            shuffleQuestions: section.shuffleQuestions ?? false,
            category: section.category || null,
          },
        });

        let questionsToAdd: string[] = [];

        // Handle random selection mode
        if (section.selectionMode === 'random' && section.category && section.randomCount) {
          // Get random questions from the bank matching the category
          const bankQuestions = await db.assessmentQuestion.findMany({
            where: {
              testId: null, // Bank questions only
              category: section.category,
            },
            select: { id: true },
          });

          // Shuffle and pick random questions
          const shuffled = bankQuestions.sort(() => Math.random() - 0.5);
          questionsToAdd = shuffled.slice(0, section.randomCount).map(q => q.id);
        } 
        // Handle fixed selection mode
        else if (section.questionIds && section.questionIds.length > 0) {
          questionsToAdd = section.questionIds;
        }

        // Copy questions to this test/section
        for (let qOrder = 0; qOrder < questionsToAdd.length; qOrder++) {
          const bankQuestionId = questionsToAdd[qOrder];
          
          // Get the bank question
          const bankQuestion = await db.assessmentQuestion.findUnique({
            where: { id: bankQuestionId },
          });

          if (bankQuestion) {
            // Create a copy of the question for this test/section
            await db.assessmentQuestion.create({
              data: {
                testId: id,
                sectionId: newSection.id,
                type: bankQuestion.type,
                question: bankQuestion.question,
                code: bankQuestion.code,
                codeLanguage: bankQuestion.codeLanguage,
                options: bankQuestion.options ?? undefined,
                correctAnswer: bankQuestion.correctAnswer,
                explanation: bankQuestion.explanation,
                category: bankQuestion.category,
                difficulty: bankQuestion.difficulty,
                tags: bankQuestion.tags ?? undefined,
                points: bankQuestion.points,
                negativeMarking: bankQuestion.negativeMarking,
                order: qOrder,
              },
            });
          }
        }
      }
    }

    logger.info({ testId: id }, 'Assessment test updated');
    return test;
  }

  /**
   * Delete a test
   */
  static async deleteTest(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Check if test has any completed invitations
    const completedInvitations = await db.assessmentInvitation.count({
      where: {
        testId: id,
        status: { in: ['COMPLETED', 'STARTED'] },
      },
    });

    if (completedInvitations > 0) {
      throw new Error('Cannot delete test with completed or in-progress assessments');
    }

    await db.assessmentTest.delete({
      where: { id },
    });

    logger.info({ testId: id }, 'Assessment test deleted');
    return { success: true };
  }

  /**
   * Publish a test
   */
  static async publishTest(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Check if test has questions (either direct or in sections)
    const directQuestionCount = await db.assessmentQuestion.count({
      where: { testId: id },
    });

    // Also count questions in sections
    const sectionQuestionCount = await db.assessmentQuestion.count({
      where: {
        section: {
          testId: id,
        },
      },
    });

    const totalQuestionCount = directQuestionCount + sectionQuestionCount;

    if (totalQuestionCount === 0) {
      throw new Error('Cannot publish test without questions');
    }

    const test = await db.assessmentTest.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    logger.info({ testId: id }, 'Assessment test published');
    return test;
  }

  /**
   * Duplicate a test
   */
  static async duplicateTest(tenantSlug: string, id: string, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const originalTest = await db.assessmentTest.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
        questions: {
          where: { sectionId: null },
        },
      },
    });

    if (!originalTest) {
      throw new Error('Test not found');
    }

    // Create new test
    const newTest = await db.assessmentTest.create({
      data: {
        name: `${originalTest.name} (Copy)`,
        description: originalTest.description,
        instructions: originalTest.instructions,
        category: originalTest.category,
        difficulty: originalTest.difficulty,
        duration: originalTest.duration,
        passingScore: originalTest.passingScore,
        maxAttempts: originalTest.maxAttempts,
        shuffleQuestions: originalTest.shuffleQuestions,
        shuffleOptions: originalTest.shuffleOptions,
        showResults: originalTest.showResults,
        proctoring: originalTest.proctoring,
        webcamRequired: originalTest.webcamRequired,
        fullscreen: originalTest.fullscreen,
        tabSwitchLimit: originalTest.tabSwitchLimit,
        status: 'DRAFT',
        createdBy: userId,
      },
    });

    // Create sections and their questions
    for (const section of originalTest.sections) {
      const newSection = await db.assessmentSection.create({
        data: {
          testId: newTest.id,
          name: section.name,
          description: section.description,
          order: section.order,
          timeLimit: section.timeLimit,
        },
      });

      // Create questions for this section
      if (section.questions.length > 0) {
        await db.assessmentQuestion.createMany({
          data: section.questions.map((q: any) => ({
            testId: newTest.id,
            sectionId: newSection.id,
            type: q.type,
            question: q.question,
            code: q.code,
            codeLanguage: q.codeLanguage,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
            negativeMarking: q.negativeMarking,
            order: q.order,
          })),
        });
      }
    }

    // Create standalone questions (not in any section)
    if (originalTest.questions.length > 0) {
      await db.assessmentQuestion.createMany({
        data: originalTest.questions.map((q: any) => ({
          testId: newTest.id,
          sectionId: null,
          type: q.type,
          question: q.question,
          code: q.code,
          codeLanguage: q.codeLanguage,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points,
          negativeMarking: q.negativeMarking,
          order: q.order,
        })),
      });
    }

    logger.info({ originalTestId: id, newTestId: newTest.id }, 'Assessment test duplicated');
    return newTest;
  }

  // ==========================================================================
  // SECTIONS
  // ==========================================================================

  /**
   * Create a new section in a test
   */
  static async createSection(tenantSlug: string, testId: string, data: CreateSectionDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get max order
    const maxOrder = await db.assessmentSection.aggregate({
      where: { testId },
      _max: { order: true },
    });

    const section = await db.assessmentSection.create({
      data: {
        testId,
        name: data.name,
        description: data.description,
        order: data.order ?? ((maxOrder._max.order ?? -1) + 1),
        timeLimit: data.timeLimit,
      },
    });

    logger.info({ sectionId: section.id, testId }, 'Assessment section created');
    return section;
  }

  /**
   * Update a section
   */
  static async updateSection(tenantSlug: string, id: string, data: UpdateSectionDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const section = await db.assessmentSection.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        order: data.order,
        timeLimit: data.timeLimit,
      },
    });

    logger.info({ sectionId: id }, 'Assessment section updated');
    return section;
  }

  /**
   * Delete a section
   */
  static async deleteSection(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    await db.assessmentSection.delete({
      where: { id },
    });

    logger.info({ sectionId: id }, 'Assessment section deleted');
    return { success: true };
  }

  // ==========================================================================
  // QUESTIONS
  // ==========================================================================

  /**
   * Create a new question (for a test or Question Bank)
   */
  static async createQuestion(tenantSlug: string, testId: string | null, data: CreateQuestionDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get max order if testId is provided
    let nextOrder = 0;
    if (testId) {
      const maxOrder = await db.assessmentQuestion.aggregate({
        where: { testId, sectionId: data.sectionId || null },
        _max: { order: true },
      });
      nextOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const question = await db.assessmentQuestion.create({
      data: {
        testId: testId ?? null,
        sectionId: data.sectionId,
        type: data.type,
        question: data.question,
        code: data.code,
        codeLanguage: data.codeLanguage,
        options: data.options as any,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        category: data.category,
        difficulty: data.difficulty,
        tags: data.tags as any,
        points: data.points || 1,
        negativeMarking: data.negativeMarking || 0,
        order: data.order ?? nextOrder,
        createdBy: userId,
      },
    });

    logger.info({ questionId: question.id, testId }, 'Assessment question created');
    return question;
  }

  /**
   * Update a question
   */
  static async updateQuestion(tenantSlug: string, id: string, data: UpdateQuestionDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const question = await db.assessmentQuestion.update({
      where: { id },
      data: {
        testId: data.testId,
        sectionId: data.sectionId,
        type: data.type,
        question: data.question,
        code: data.code,
        codeLanguage: data.codeLanguage,
        options: data.options as any,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        category: data.category,
        difficulty: data.difficulty,
        tags: data.tags as any,
        points: data.points,
        negativeMarking: data.negativeMarking,
        order: data.order,
      },
    });

    logger.info({ questionId: id }, 'Assessment question updated');
    return question;
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    await db.assessmentQuestion.delete({
      where: { id },
    });

    logger.info({ questionId: id }, 'Assessment question deleted');
    return { success: true };
  }

  /**
   * Get a single question by ID
   */
  static async getQuestionById(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const question = await db.assessmentQuestion.findUnique({
      where: { id },
      include: {
        test: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    return question;
  }

  // ==========================================================================
  // QUESTION BANK
  // ==========================================================================

  /**
   * Get all questions from Question Bank (not assigned to tests) or all questions
   */
  static async getQuestionBankQuestions(tenantSlug: string, filters?: QuestionBankFilters) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    // Filter for Question Bank only (testId is null) or specific test
    if (filters?.testId === 'bank') {
      where.testId = null;
    } else if (filters?.testId) {
      where.testId = filters.testId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters?.search) {
      where.question = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const questions = await db.assessmentQuestion.findMany({
      where,
      include: {
        test: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return questions;
  }

  /**
   * Get unique categories from Question Bank
   */
  static async getQuestionCategories(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const questions = await db.assessmentQuestion.findMany({
      where: {
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    });

    return questions.map((q) => q.category).filter(Boolean) as string[];
  }

  /**
   * Add question from bank to a test
   */
  static async addQuestionToTest(tenantSlug: string, questionId: string, testId: string, sectionId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get max order in target test
    const maxOrder = await db.assessmentQuestion.aggregate({
      where: { testId, sectionId: sectionId || null },
      _max: { order: true },
    });

    const question = await db.assessmentQuestion.update({
      where: { id: questionId },
      data: {
        testId,
        sectionId: sectionId || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    logger.info({ questionId, testId }, 'Question added to test');
    return question;
  }

  /**
   * Remove question from test (move back to bank)
   */
  static async removeQuestionFromTest(tenantSlug: string, questionId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const question = await db.assessmentQuestion.update({
      where: { id: questionId },
      data: {
        testId: null,
        sectionId: null,
      },
    });

    logger.info({ questionId }, 'Question removed from test (moved to bank)');
    return question;
  }

  /**
   * Duplicate a question (useful for creating variations)
   */
  static async duplicateQuestion(tenantSlug: string, questionId: string, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const original = await db.assessmentQuestion.findUnique({
      where: { id: questionId },
    });

    if (!original) {
      throw new Error('Question not found');
    }

    const duplicate = await db.assessmentQuestion.create({
      data: {
        testId: original.testId,
        sectionId: original.sectionId,
        type: original.type,
        question: `${original.question} (Copy)`,
        code: original.code,
        codeLanguage: original.codeLanguage,
        options: original.options as any,
        correctAnswer: original.correctAnswer,
        explanation: original.explanation,
        category: original.category,
        difficulty: original.difficulty,
        tags: original.tags as any,
        points: original.points,
        negativeMarking: original.negativeMarking,
        order: original.order + 1,
        createdBy: userId,
      },
    });

    logger.info({ originalId: questionId, duplicateId: duplicate.id }, 'Question duplicated');
    return duplicate;
  }

  /**
   * Bulk create questions
   */
  static async bulkCreateQuestions(tenantSlug: string, testId: string, questions: CreateQuestionDto[]) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get max order
    const maxOrder = await db.assessmentQuestion.aggregate({
      where: { testId },
      _max: { order: true },
    });

    let order = (maxOrder._max.order ?? -1) + 1;

    await db.assessmentQuestion.createMany({
      data: questions.map((q) => ({
        testId,
        sectionId: q.sectionId,
        type: q.type,
        question: q.question,
        code: q.code,
        codeLanguage: q.codeLanguage,
        options: q.options as any,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
        negativeMarking: q.negativeMarking || 0,
        order: q.order ?? order++,
      })),
    });

    logger.info({ testId, count: questions.length }, 'Assessment questions bulk created');
    return { success: true, count: questions.length };
  }

  // ==========================================================================
  // INVITATIONS
  // ==========================================================================

  /**
   * Get all invitations with optional filters
   */
  static async getAllInvitations(tenantSlug: string, filters?: InvitationFilters) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    if (filters?.testId) {
      where.testId = filters.testId;
    }

    if (filters?.candidateId) {
      where.candidateId = filters.candidateId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.validFrom = {};
      if (filters.dateFrom) {
        where.validFrom.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.validFrom.lte = new Date(filters.dateTo);
      }
    }

    if (filters?.search) {
      where.OR = [
        { candidateName: { contains: filters.search, mode: 'insensitive' } },
        { candidateEmail: { contains: filters.search, mode: 'insensitive' } },
        { assessmentCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const invitations = await db.assessmentInvitation.findMany({
      where,
      include: {
        test: {
          select: {
            id: true,
            name: true,
            duration: true,
            passingScore: true,
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        result: {
          select: {
            id: true,
            score: true,
            passed: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to prefer candidate relation data over denormalized fields
    return invitations.map(inv => ({
      ...inv,
      // Prefer candidate relation data if available
      candidateName: inv.candidate 
        ? `${inv.candidate.firstName} ${inv.candidate.lastName}` 
        : inv.candidateName,
      candidateEmail: inv.candidate?.email || inv.candidateEmail,
    }));
  }

  /**
   * Get a single invitation by ID
   */
  static async getInvitationById(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { id },
      include: {
        test: true,
        candidate: true,
        result: {
          include: {
            answers: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Prefer candidate relation data over denormalized fields
    return {
      ...invitation,
      candidateName: invitation.candidate 
        ? `${invitation.candidate.firstName} ${invitation.candidate.lastName}` 
        : invitation.candidateName,
      candidateEmail: invitation.candidate?.email || invitation.candidateEmail,
    };
  }

  /**
   * Get invitation by assessment code
   */
  static async getInvitationByCode(tenantSlug: string, code: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { assessmentCode: code },
      include: {
        test: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    type: true,
                    question: true,
                    code: true,
                    codeLanguage: true,
                    options: true,
                    points: true,
                    order: true,
                  },
                },
              },
            },
            questions: {
              where: { sectionId: null },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                type: true,
                question: true,
                code: true,
                codeLanguage: true,
                options: true,
                points: true,
                order: true,
              },
            },
          },
        },
        result: true,
      },
    });

    if (!invitation) {
      throw new Error('Invalid assessment code');
    }

    // Check if invitation is valid
    const now = new Date();
    
    // Allow 5 minutes early access before the scheduled time
    const earlyAccessTime = new Date(invitation.validFrom);
    earlyAccessTime.setMinutes(earlyAccessTime.getMinutes() - 5);
    
    if (now < earlyAccessTime) {
      // Return a structured error with assessment details for proper user messaging
      const error: any = new Error('Assessment is not yet available');
      error.code = 'ASSESSMENT_NOT_STARTED';
      error.scheduledAt = invitation.validFrom;
      error.candidateName = invitation.candidateName;
      error.testName = invitation.test?.name;
      throw error;
    }
    if (now > invitation.validUntil) {
      const error: any = new Error('Assessment has expired');
      error.code = 'ASSESSMENT_EXPIRED';
      error.expiredAt = invitation.validUntil;
      throw error;
    }
    if (invitation.status === 'CANCELLED') {
      const error: any = new Error('Assessment has been cancelled');
      error.code = 'ASSESSMENT_CANCELLED';
      throw error;
    }
    if (invitation.status === 'COMPLETED') {
      const error: any = new Error('Assessment has already been completed');
      error.code = 'ASSESSMENT_COMPLETED';
      throw error;
    }

    // Update status to OPENED if it's still PENDING or SENT
    if (invitation.status === 'PENDING' || invitation.status === 'SENT') {
      await db.assessmentInvitation.update({
        where: { id: invitation.id },
        data: { status: 'OPENED' },
      });
      // Update the local object for return
      invitation.status = 'OPENED';
    }

    // Fetch tenant branding from master database
    const masterDb = getMasterPrisma();
    const tenant = await masterDb.tenant.findFirst({
      where: { slug: tenantSlug },
      include: {
        settings: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            logoUrl: true,
            faviconUrl: true,
          },
        },
      },
    });

    return {
      ...invitation,
      tenantBranding: tenant?.settings ? {
        primaryColor: tenant.settings.primaryColor,
        secondaryColor: tenant.settings.secondaryColor,
        logoUrl: tenant.settings.logoUrl,
        faviconUrl: tenant.settings.faviconUrl,
        tenantName: tenant.name,
      } : null,
    };
  }

  /**
   * Create a new invitation
   */
  static async createInvitation(tenantSlug: string, data: CreateInvitationDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Check if test exists and is published
    const test = await db.assessmentTest.findUnique({
      where: { id: data.testId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'PUBLISHED') {
      throw new Error('Test must be published to send invitations');
    }

    // Generate unique assessment code
    let assessmentCode = generateAssessmentCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.assessmentInvitation.findUnique({
        where: { assessmentCode },
      });
      if (!existing) break;
      assessmentCode = generateAssessmentCode();
      attempts++;
    }

    const invitation = await db.assessmentInvitation.create({
      data: {
        testId: data.testId,
        candidateId: data.candidateId,
        interviewId: data.interviewId,
        candidateEmail: data.candidateEmail,
        candidateName: data.candidateName,
        assessmentCode,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validUntil: new Date(data.validUntil),
        status: 'PENDING',
        createdBy: userId,
      },
      include: {
        test: true,
      },
    });

    logger.info({ invitationId: invitation.id, testId: data.testId }, 'Assessment invitation created');
    return invitation;
  }

  /**
   * Send invitation email
   */
  static async sendInvitationEmail(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { id },
      include: { test: true },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // TODO: Integrate with notification service to send email
    // For now, just update the status
    await db.assessmentInvitation.update({
      where: { id },
      data: {
        status: 'SENT',
        emailSentAt: new Date(),
      },
    });

    logger.info({ invitationId: id }, 'Assessment invitation email sent');
    return { success: true };
  }

  /**
   * Send reminder email
   */
  static async sendReminderEmail(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { id },
      include: { test: true },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // TODO: Integrate with notification service to send reminder
    await db.assessmentInvitation.update({
      where: { id },
      data: {
        reminderSentAt: new Date(),
      },
    });

    logger.info({ invitationId: id }, 'Assessment reminder email sent');
    return { success: true };
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status === 'COMPLETED' || invitation.status === 'STARTED') {
      throw new Error('Cannot cancel an in-progress or completed assessment');
    }

    await db.assessmentInvitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    logger.info({ invitationId: id }, 'Assessment invitation cancelled');
    return { success: true };
  }

  /**
   * Regenerate assessment code
   */
  static async regenerateCode(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Generate new unique code
    let assessmentCode = generateAssessmentCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.assessmentInvitation.findUnique({
        where: { assessmentCode },
      });
      if (!existing) break;
      assessmentCode = generateAssessmentCode();
      attempts++;
    }

    const invitation = await db.assessmentInvitation.update({
      where: { id },
      data: { assessmentCode },
    });

    logger.info({ invitationId: id, newCode: assessmentCode }, 'Assessment code regenerated');
    return invitation;
  }

  // ==========================================================================
  // RESULTS
  // ==========================================================================

  /**
   * Start an assessment
   */
  static async startAssessment(tenantSlug: string, invitationId: string, browserInfo?: string, ipAddress?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const invitation = await db.assessmentInvitation.findUnique({
      where: { id: invitationId },
      include: { test: true },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Check if already started
    if (invitation.status === 'STARTED' || invitation.status === 'COMPLETED') {
      const existingResult = await db.assessmentResult.findUnique({
        where: { invitationId },
      });
      return existingResult;
    }

    // Get question count
    const questionCount = await db.assessmentQuestion.count({
      where: { testId: invitation.testId },
    });

    // Get max score
    const maxScore = await db.assessmentQuestion.aggregate({
      where: { testId: invitation.testId },
      _sum: { points: true },
    });

    // Create result
    const result = await db.assessmentResult.create({
      data: {
        invitationId,
        testId: invitation.testId,
        testName: invitation.test.name,
        candidateEmail: invitation.candidateEmail,
        candidateName: invitation.candidateName,
        startedAt: new Date(),
        totalQuestions: questionCount,
        maxScore: maxScore._sum.points || 0,
        obtainedScore: 0,
        status: 'IN_PROGRESS',
        browserInfo,
        ipAddress,
      },
    });

    // Update invitation status
    await db.assessmentInvitation.update({
      where: { id: invitationId },
      data: { status: 'STARTED' },
    });

    logger.info({ resultId: result.id, invitationId }, 'Assessment started');
    return result;
  }

  /**
   * Submit an answer
   */
  static async submitAnswer(
    tenantSlug: string,
    resultId: string,
    questionId: string,
    answer: { answer?: string; selectedOptions?: string[] },
    timeTaken?: number
  ) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get question to check answer
    const question = await db.assessmentQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Check if answer is correct
    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') {
      const options = question.options as any[];
      const correctOptionIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
      
      // Handle both answer formats: selectedOptions array OR answer string
      let selectedIds: string[] = [];
      if (answer.selectedOptions && answer.selectedOptions.length > 0) {
        selectedIds = answer.selectedOptions;
      } else if (answer.answer) {
        // Single answer as string - treat as single selected option
        selectedIds = [answer.answer];
      }
      
      if (question.type === 'MULTIPLE_CHOICE') {
        isCorrect = selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0]);
      } else {
        isCorrect = 
          selectedIds.length === correctOptionIds.length &&
          selectedIds.every((id: string) => correctOptionIds.includes(id));
      }
    } else if (question.type === 'TRUE_FALSE') {
      isCorrect = answer.answer?.toLowerCase() === question.correctAnswer?.toLowerCase();
    } else if (question.type === 'SHORT_ANSWER') {
      isCorrect = answer.answer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
    }
    // For ESSAY, CODING, FILE_UPLOAD - manual grading required

    if (isCorrect) {
      pointsEarned = question.points;
    } else if (answer.answer || (answer.selectedOptions && answer.selectedOptions.length > 0)) {
      // Apply negative marking if answered incorrectly
      pointsEarned = -(question.negativeMarking || 0);
    }

    // Upsert answer
    const assessmentAnswer = await db.assessmentAnswer.upsert({
      where: {
        resultId_questionId: {
          resultId,
          questionId,
        },
      },
      update: {
        answer: answer.answer,
        selectedOptions: answer.selectedOptions as any,
        isCorrect,
        pointsEarned,
        timeTaken,
      },
      create: {
        resultId,
        questionId,
        answer: answer.answer,
        selectedOptions: answer.selectedOptions as any,
        isCorrect,
        pointsEarned,
        timeTaken,
      },
    });

    return assessmentAnswer;
  }

  /**
   * Complete an assessment
   */
  static async completeAssessment(tenantSlug: string, resultId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const result = await db.assessmentResult.findUnique({
      where: { id: resultId },
      include: {
        answers: true,
        invitation: {
          include: { test: true },
        },
      },
    });

    if (!result) {
      throw new Error('Result not found');
    }

    // Calculate scores
    const attempted = result.answers.filter(a => a.answer || a.selectedOptions).length;
    const correct = result.answers.filter(a => a.isCorrect).length;
    const wrong = result.answers.filter(a => !a.isCorrect && (a.answer || a.selectedOptions)).length;
    const skipped = result.totalQuestions - attempted;
    const obtainedScore = result.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const score = result.maxScore > 0 ? (obtainedScore / result.maxScore) * 100 : 0;
    const passed = score >= result.invitation.test.passingScore;

    // Calculate time taken
    const timeTaken = Math.floor((new Date().getTime() - result.startedAt.getTime()) / 1000);

    // Update result
    const updatedResult = await db.assessmentResult.update({
      where: { id: resultId },
      data: {
        completedAt: new Date(),
        timeTaken,
        attempted,
        correct,
        wrong,
        skipped,
        score,
        obtainedScore,
        passed,
        status: 'COMPLETED',
      },
    });

    // Update invitation status
    await db.assessmentInvitation.update({
      where: { id: result.invitationId },
      data: { status: 'COMPLETED' },
    });

    logger.info({ resultId, score, passed }, 'Assessment completed');
    return updatedResult;
  }

  /**
   * Record tab switch violation
   */
  static async recordTabSwitch(tenantSlug: string, resultId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const result = await db.assessmentResult.update({
      where: { id: resultId },
      data: {
        tabSwitchCount: { increment: 1 },
      },
    });

    // Check if exceeded limit
    const invitation = await db.assessmentInvitation.findUnique({
      where: { id: result.invitationId },
      include: { test: true },
    });

    if (invitation && result.tabSwitchCount >= invitation.test.tabSwitchLimit) {
      // Terminate assessment
      await db.assessmentResult.update({
        where: { id: resultId },
        data: { status: 'TERMINATED' },
      });
      
      await db.assessmentInvitation.update({
        where: { id: result.invitationId },
        data: { status: 'COMPLETED' },
      });

      logger.warn({ resultId }, 'Assessment terminated due to tab switch limit');
      return { terminated: true, reason: 'Tab switch limit exceeded' };
    }

    return { terminated: false, tabSwitchCount: result.tabSwitchCount };
  }

  /**
   * Get result by ID (includes test with sections and questions for candidate taking assessment)
   */
  static async getResultById(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const result = await db.assessmentResult.findUnique({
      where: { id },
      include: {
        invitation: {
          include: {
            test: {
              include: {
                sections: {
                  include: {
                    questions: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
            candidate: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!result) {
      throw new Error('Result not found');
    }

    // Transform to include test at top level for easier frontend access
    const test = result.invitation?.test;
    
    // Use stored values if available (from completeAssessment), otherwise calculate
    const totalQuestions = result.totalQuestions || test?.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) || 0;
    const correctAnswers = result.correct ?? 0;
    const incorrectAnswers = result.wrong ?? 0;
    const skippedQuestions = result.skipped ?? (totalQuestions - (correctAnswers + incorrectAnswers));
    
    // Calculate time taken in minutes
    // timeTaken in DB is stored in SECONDS, convert to minutes for display
    let timeTaken = 0;
    if (result.timeTaken) {
      // Convert seconds to minutes
      timeTaken = Math.round(result.timeTaken / 60);
    } else if (result.startedAt && result.completedAt) {
      // Fallback: calculate from timestamps (result is in minutes)
      const diffMs = new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();
      timeTaken = Math.round(diffMs / 60000);
    }
    
    return {
      id: result.id,
      status: result.status,
      score: result.score ?? 0,
      passed: result.passed ?? false,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      skippedQuestions,
      timeTaken,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      tabSwitchCount: result.tabSwitchCount,
      warningsCount: result.warningsCount,
      obtainedScore: result.obtainedScore ?? 0,
      maxScore: result.maxScore ?? 0,
      // Candidate info from invitation
      candidateName: result.invitation?.candidateName,
      candidateEmail: result.invitation?.candidateEmail,
      testName: test?.name,
      // Include answers for HR result detail page
      answers: result.answers?.map(answer => ({
        id: answer.id,
        questionId: answer.questionId,
        answer: answer.answer,
        selectedOptions: answer.selectedOptions,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        timeTaken: answer.timeTaken,
        question: answer.question ? {
          id: answer.question.id,
          question: answer.question.question,
          type: answer.question.type,
          options: answer.question.options,
          correctAnswer: answer.question.correctAnswer,
          points: answer.question.points,
          difficulty: answer.question.difficulty,
        } : null,
      })),
      // Include invitation info
      invitation: result.invitation ? {
        candidateId: result.invitation.candidateId,
        candidateJobId: result.invitation.candidate?.jobId,
        test: test ? {
          id: test.id,
          passingScore: test.passingScore,
          duration: test.duration,
        } : null,
      } : null,
      test: test ? {
        id: test.id,
        name: test.name,
        duration: test.duration,
        shuffleQuestions: test.shuffleQuestions,
        shuffleOptions: test.shuffleOptions,
        showResults: test.showResults,
        showAnswers: test.showAnswers,
        passingScore: test.passingScore,
        sections: test.sections?.map(section => ({
          id: section.id,
          name: section.name,
          questions: section.questions?.map(q => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options,
            points: q.points,
            difficulty: q.difficulty,
            code: q.code,
            codeLanguage: q.codeLanguage,
          })),
        })),
      } : null,
    };
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get test analytics
   */
  static async getTestAnalytics(tenantSlug: string, testId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const results = await db.assessmentResult.findMany({
      where: {
        testId,
        status: 'COMPLETED',
      },
    });

    if (results.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        passRate: 0,
        avgTimeTaken: 0,
      };
    }

    const totalAttempts = results.length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalAttempts;
    const passRate = (results.filter(r => r.passed).length / totalAttempts) * 100;
    const avgTimeTaken = results.reduce((sum, r) => sum + (r.timeTaken || 0), 0) / totalAttempts;

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      avgTimeTaken: Math.round(avgTimeTaken),
    };
  }

  /**
   * Get overall assessment analytics
   */
  static async getOverallAnalytics(tenantSlug: string, dateFrom?: string, dateTo?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {
      status: 'COMPLETED',
    };

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) where.completedAt.lte = new Date(dateTo);
    }

    const results = await db.assessmentResult.findMany({ where });
    const totalTests = await db.assessmentTest.count();
    const publishedTests = await db.assessmentTest.count({ where: { status: 'PUBLISHED' } });
    const pendingInvitations = await db.assessmentInvitation.count({
      where: { status: { in: ['PENDING', 'SENT'] } },
    });

    const totalAssessments = results.length;
    const avgScore = totalAssessments > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / totalAssessments
      : 0;
    const passRate = totalAssessments > 0
      ? (results.filter(r => r.passed).length / totalAssessments) * 100
      : 0;

    return {
      totalTests,
      publishedTests,
      pendingInvitations,
      totalAssessments,
      avgScore: Math.round(avgScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
    };
  }

  /**
   * Get list of published tests for dropdown selection
   */
  static async getPublishedTestsForSelection(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const tests = await db.assessmentTest.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        name: true,
        category: true,
        difficulty: true,
        duration: true,
        passingScore: true,
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return tests.map(test => ({
      id: test.id,
      name: test.name,
      category: test.category,
      difficulty: test.difficulty,
      duration: test.duration,
      passingScore: test.passingScore,
      questionsCount: test._count.questions,
    }));
  }

  /**
   * Get all assessment results with optional filters
   * By default, only returns completed results (not IN_PROGRESS)
   */
  static async getAllResults(tenantSlug: string, filters?: {
    testId?: string;
    status?: string;
    passed?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    includeAnswers?: boolean;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {
      // By default, only show completed results (not IN_PROGRESS)
      status: {
        in: ['COMPLETED', 'TERMINATED', 'TIMED_OUT'],
      },
    };

    if (filters?.testId) {
      where.testId = filters.testId;
    }

    // Override status filter if explicitly provided
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.passed !== undefined) {
      where.passed = filters.passed;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.completedAt = {};
      if (filters.dateFrom) where.completedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.completedAt.lte = new Date(filters.dateTo);
    }

    if (filters?.search) {
      where.OR = [
        { candidateName: { contains: filters.search, mode: 'insensitive' } },
        { candidateEmail: { contains: filters.search, mode: 'insensitive' } },
        { testName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const results = await db.assessmentResult.findMany({
      where,
      include: {
        invitation: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                duration: true,
                passingScore: true,
                category: true,
              },
            },
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                job: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        // Include answers when requested (for analytics/question performance)
        ...(filters?.includeAnswers && {
          answers: {
            select: {
              id: true,
              questionId: true,
              isCorrect: true,
              pointsEarned: true,
            },
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return results;
  }

  /**
   * Get current/active assessments (in progress or scheduled for today/tomorrow)
   * Also includes completed assessments from today
   */
  static async getCurrentAssessments(tenantSlug: string, filters?: {
    testId?: string;
    status?: string;
    search?: string;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    const where: any = {
      OR: [
        // In progress
        { status: 'STARTED' },
        // Completed today (show in current tab)
        {
          status: 'COMPLETED',
          result: {
            completedAt: { gte: startOfToday },
          },
        },
        // Pending/Sent with valid dates within today/tomorrow
        {
          status: { in: ['PENDING', 'SENT', 'OPENED'] },
          validFrom: { lte: endOfTomorrow },
          validUntil: { gte: now },
        },
      ],
    };

    if (filters?.testId) {
      where.testId = filters.testId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.OR = [{ status: filters.status }];
    }

    if (filters?.search) {
      where.AND = {
        OR: [
          { candidateName: { contains: filters.search, mode: 'insensitive' } },
          { candidateEmail: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const invitations = await db.assessmentInvitation.findMany({
      where,
      include: {
        test: {
          select: {
            id: true,
            name: true,
            duration: true,
            passingScore: true,
            category: true,
          },
        },
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        result: true,
      },
      orderBy: [
        { validFrom: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return invitations;
  }

  /**
   * Get candidates available for inviting to assessments
   */
  static async getCandidatesForInvite(tenantSlug: string, filters?: {
    jobId?: string;
    search?: string;
    status?: string;
  }) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {
      status: { in: ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEWED'] },
    };

    if (filters?.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const candidates = await db.jobCandidate.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        assessmentInvitations: {
          select: {
            id: true,
            testId: true,
            status: true,
          },
        },
      },
      orderBy: [
        { appliedAt: 'desc' },
      ],
    });

    return candidates.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      jobId: c.jobId,
      jobTitle: c.job.title,
      department: c.job.department,
      status: c.status,
      appliedAt: c.appliedAt,
      existingInvitations: c.assessmentInvitations,
    }));
  }

  /**
   * Bulk create invitations for multiple candidates
   */
  static async bulkCreateInvitations(
    tenantSlug: string, 
    data: {
      testId: string;
      candidateIds: string[];
      validFrom: string;
      validUntil: string;
      sendEmail?: boolean;
    },
    userId?: string
  ) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get test info
    const test = await db.assessmentTest.findUnique({
      where: { id: data.testId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'PUBLISHED') {
      throw new Error('Test must be published to send invitations');
    }

    // Get candidates
    const candidates = await db.jobCandidate.findMany({
      where: { id: { in: data.candidateIds } },
    });

    const invitations = [];

    for (const candidate of candidates) {
      // Generate unique assessment code
      let assessmentCode = generateAssessmentCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.assessmentInvitation.findUnique({
          where: { assessmentCode },
        });
        if (!existing) break;
        assessmentCode = generateAssessmentCode();
        attempts++;
      }

      const invitation = await db.assessmentInvitation.create({
        data: {
          testId: data.testId,
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          assessmentCode,
          validFrom: new Date(data.validFrom),
          validUntil: new Date(data.validUntil),
          status: 'PENDING',
          createdBy: userId,
        },
        include: {
          test: true,
          candidate: true,
        },
      });

      invitations.push(invitation);
    }

    logger.info({ 
      testId: data.testId, 
      count: invitations.length 
    }, 'Bulk invitations created');

    return invitations;
  }

  /**
   * Get extended analytics with date range support
   */
  static async getExtendedAnalytics(tenantSlug: string, dateFrom?: string, dateTo?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const dateWhere: any = {};
    if (dateFrom || dateTo) {
      dateWhere.completedAt = {};
      if (dateFrom) dateWhere.completedAt.gte = new Date(dateFrom);
      if (dateTo) dateWhere.completedAt.lte = new Date(dateTo);
    }

    // Overall stats
    const totalTests = await db.assessmentTest.count();
    const publishedTests = await db.assessmentTest.count({ where: { status: 'PUBLISHED' } });
    const draftTests = await db.assessmentTest.count({ where: { status: 'DRAFT' } });

    // Invitation stats
    const totalInvitations = await db.assessmentInvitation.count();
    const pendingInvitations = await db.assessmentInvitation.count({ where: { status: 'PENDING' } });
    const sentInvitations = await db.assessmentInvitation.count({ where: { status: 'SENT' } });
    const startedInvitations = await db.assessmentInvitation.count({ where: { status: 'STARTED' } });
    const completedInvitations = await db.assessmentInvitation.count({ where: { status: 'COMPLETED' } });
    const expiredInvitations = await db.assessmentInvitation.count({ where: { status: 'EXPIRED' } });

    // Result stats
    const results = await db.assessmentResult.findMany({
      where: { status: 'COMPLETED', ...dateWhere },
    });

    const totalAssessments = results.length;
    const passedAssessments = results.filter(r => r.passed).length;
    const failedAssessments = results.filter(r => !r.passed).length;
    const avgScore = totalAssessments > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / totalAssessments 
      : 0;
    const avgTimeTaken = totalAssessments > 0
      ? results.reduce((sum, r) => sum + (r.timeTaken || 0), 0) / totalAssessments
      : 0;
    const passRate = totalAssessments > 0 
      ? (passedAssessments / totalAssessments) * 100 
      : 0;

    // Top performing tests
    const testResults = await db.assessmentResult.groupBy({
      by: ['testId'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
      _avg: { score: true },
    });

    const testsWithNames = await Promise.all(
      testResults.slice(0, 5).map(async (tr) => {
        const test = await db.assessmentTest.findUnique({
          where: { id: tr.testId },
          select: { id: true, name: true },
        });
        return {
          testId: tr.testId,
          testName: test?.name || 'Unknown',
          attempts: tr._count.id,
          avgScore: Math.round((tr._avg.score || 0) * 100) / 100,
        };
      })
    );

    // Score distribution
    const scoreRanges = [
      { label: '0-20%', min: 0, max: 20, count: 0 },
      { label: '21-40%', min: 21, max: 40, count: 0 },
      { label: '41-60%', min: 41, max: 60, count: 0 },
      { label: '61-80%', min: 61, max: 80, count: 0 },
      { label: '81-100%', min: 81, max: 100, count: 0 },
    ];

    results.forEach(r => {
      const range = scoreRanges.find(sr => r.score >= sr.min && r.score <= sr.max);
      if (range) range.count++;
    });

    // Question bank stats
    const totalQuestions = await db.assessmentQuestion.count();
    const bankQuestions = await db.assessmentQuestion.count({ where: { testId: null } });

    return {
      tests: {
        total: totalTests,
        published: publishedTests,
        draft: draftTests,
      },
      invitations: {
        total: totalInvitations,
        pending: pendingInvitations,
        sent: sentInvitations,
        started: startedInvitations,
        completed: completedInvitations,
        expired: expiredInvitations,
      },
      results: {
        total: totalAssessments,
        passed: passedAssessments,
        failed: failedAssessments,
        avgScore: Math.round(avgScore * 100) / 100,
        avgTimeTaken: Math.round(avgTimeTaken),
        passRate: Math.round(passRate * 100) / 100,
      },
      topTests: testsWithNames,
      scoreDistribution: scoreRanges,
      questions: {
        total: totalQuestions,
        bank: bankQuestions,
        inTests: totalQuestions - bankQuestions,
      },
    };
  }

  /**
   * Get live monitoring data for an active assessment
   */
  static async getLiveMonitorData(tenantSlug: string, invitationId: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get the invitation with result and test
    const invitation = await db.assessmentInvitation.findUnique({
      where: { id: invitationId },
      include: {
        test: {
          include: {
            sections: {
              include: {
                questions: {
                  select: { id: true, points: true },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        candidate: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Get the active result for this invitation
    const result = await db.assessmentResult.findFirst({
      where: { invitationId },
      include: {
        answers: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!result) {
      return {
        status: invitation.status,
        candidateName: invitation.candidateName,
        candidateEmail: invitation.candidateEmail,
        testName: invitation.test.name,
        duration: invitation.test.duration,
        notStarted: true,
      };
    }

    // Build question list with ordering
    const allQuestions: { id: string; sectionIndex: number; questionIndex: number }[] = [];
    invitation.test.sections.forEach((section, sIndex) => {
      section.questions.forEach((q, qIndex) => {
        allQuestions.push({ id: q.id, sectionIndex: sIndex, questionIndex: qIndex });
      });
    });

    const totalQuestions = allQuestions.length;

    // Calculate answered and skipped
    const answeredQuestionIds = new Set(
      result.answers
        .filter(a => a.answer || (a.selectedOptions && a.selectedOptions.length > 0))
        .map(a => a.questionId)
    );

    const answeredQuestions = answeredQuestionIds.size;

    // Determine current question based on last answered
    const lastAnswer = result.answers[0];
    let currentQuestionIndex = 0;
    if (lastAnswer) {
      const idx = allQuestions.findIndex(q => q.id === lastAnswer.questionId);
      currentQuestionIndex = idx >= 0 ? Math.min(idx + 1, totalQuestions - 1) : 0;
    }

    // Calculate time
    const startedAt = new Date(result.startedAt);
    const elapsedMs = Date.now() - startedAt.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const remainingMinutes = Math.max(0, invitation.test.duration - elapsedMinutes);

    // Last activity from most recent answer or startedAt
    const lastActivity = lastAnswer?.createdAt ? new Date(lastAnswer.createdAt) : startedAt;
    const idleMs = Date.now() - lastActivity.getTime();
    const isActive = idleMs < 120000; // Active if less than 2 minutes idle

    // Build question progress
    const questionProgress = allQuestions.map((q, idx) => {
      const answer = result.answers.find(a => a.questionId === q.id);
      const hasAnswer = answer && (answer.answer || (answer.selectedOptions && answer.selectedOptions.length > 0));
      
      let status: 'answered' | 'skipped' | 'current' | 'not_visited' = 'not_visited';
      if (idx === currentQuestionIndex && result.status === 'IN_PROGRESS') {
        status = 'current';
      } else if (hasAnswer) {
        status = 'answered';
      } else if (answer) {
        status = 'skipped';
      }

      return {
        questionNumber: idx + 1,
        status,
        timeSpent: answer?.timeTaken || 0,
      };
    });

    const skippedQuestions = questionProgress.filter(q => q.status === 'skipped').length;

    return {
      // Status
      status: result.status,
      invitationStatus: invitation.status,
      
      // Candidate info
      candidateName: invitation.candidateName,
      candidateEmail: invitation.candidateEmail,
      position: invitation.candidate?.job?.title || 'Candidate',
      
      // Test info
      testId: invitation.testId,
      testName: invitation.test.name,
      duration: invitation.test.duration,
      resultId: result.id,
      
      // Progress
      currentQuestion: currentQuestionIndex + 1,
      totalQuestions,
      answeredQuestions,
      skippedQuestions,
      
      // Time
      startedAt,
      elapsedTime: elapsedMinutes,
      remainingTime: remainingMinutes,
      
      // Activity
      lastActivity,
      isActive,
      
      // Proctoring
      tabSwitchCount: result.tabSwitchCount || 0,
      warningsCount: result.warningsCount || 0,
      browserInfo: result.browserInfo,
      ipAddress: result.ipAddress,
      tabSwitchLimit: invitation.test.tabSwitchLimit,
      proctoringEnabled: invitation.test.proctoring,
      fullscreenRequired: invitation.test.fullscreen,
      
      // Question progress
      questionProgress,
    };
  }
}
