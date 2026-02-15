/**
 * Assessment API Client
 * Handles all assessment-related API calls for online tests
 */

import { get, post, put, del, publicGet, publicPost } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type AssessmentDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type AssessmentTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AssessmentQuestionType = 
  | 'MULTIPLE_CHOICE' 
  | 'MULTIPLE_SELECT' 
  | 'TRUE_FALSE' 
  | 'SHORT_ANSWER' 
  | 'ESSAY' 
  | 'CODING';
export type AssessmentInvitationStatus = 
  | 'PENDING' 
  | 'SENT' 
  | 'OPENED' 
  | 'STARTED' 
  | 'COMPLETED' 
  | 'EXPIRED' 
  | 'CANCELLED';
export type AssessmentResultStatus = 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'TERMINATED' 
  | 'TIMED_OUT';

export interface AssessmentTest {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  difficulty: AssessmentDifficulty;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  proctoring: boolean;
  webcamRequired: boolean;
  fullscreen: boolean;
  preventCopyPaste?: boolean;
  preventTabSwitch?: boolean;
  tabSwitchLimit: number;
  status: AssessmentTestStatus;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
  questionsCount?: number;
  invitationsCount?: number;
  sections?: AssessmentSection[];
  questions?: AssessmentQuestion[];
}

export interface AssessmentSection {
  id: string;
  testId: string;
  name: string;
  category?: string;
  description?: string;
  order: number;
  timeLimit?: number;
  weightage?: number;
  selectionMode?: string;
  randomCount?: number;
  shuffleQuestions?: boolean;
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface AssessmentQuestion {
  id: string;
  testId: string;
  sectionId?: string;
  type: AssessmentQuestionType;
  question: string;
  code?: string;
  codeLanguage?: string;
  options?: AssessmentQuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  negativeMarking: number;
  order: number;
  difficulty?: AssessmentDifficulty;
}

// Question Bank question with additional fields
export interface BankQuestion {
  id: string;
  testId?: string | null;
  sectionId?: string | null;
  type: AssessmentQuestionType;
  question: string;
  code?: string;
  codeLanguage?: string;
  options?: AssessmentQuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  category?: string;
  difficulty?: AssessmentDifficulty;
  tags?: string[];
  points: number;
  negativeMarking: number;
  order: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  test?: {
    id: string;
    name: string;
  } | null;
}

export interface AssessmentInvitation {
  id: string;
  testId: string;
  candidateId?: string;
  interviewId?: string;
  candidateEmail: string;
  candidateName: string;
  assessmentCode: string;
  validFrom: string;
  validUntil: string;
  status: AssessmentInvitationStatus;
  emailSentAt?: string;
  reminderSentAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  test?: {
    id: string;
    name: string;
    duration: number;
    passingScore: number;
  };
  tenantBranding?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    tenantName?: string;
  } | null;
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    job?: {
      id: string;
      title: string;
    };
  };
  result?: {
    id: string;
    score: number;
    passed: boolean;
    status: AssessmentResultStatus;
  };
}

export interface AssessmentResult {
  id: string;
  invitationId: string;
  testId: string;
  testName: string;
  candidateEmail: string;
  candidateName: string;
  startedAt: string;
  completedAt?: string;
  timeTaken?: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
  obtainedScore: number;
  passed: boolean;
  tabSwitchCount: number;
  warningsCount: number;
  browserInfo?: string;
  ipAddress?: string;
  status: AssessmentResultStatus;
  answers?: AssessmentAnswer[];
  test?: AssessmentTest;
}

export interface AssessmentAnswer {
  id: string;
  resultId: string;
  questionId: string;
  answer?: string;
  selectedOptions?: string[];
  isCorrect?: boolean;
  pointsEarned: number;
  timeTaken?: number;
  question?: AssessmentQuestion;
}

export interface QuestionProgress {
  questionNumber: number;
  status: 'answered' | 'skipped' | 'current' | 'not_visited';
  timeSpent: number;
}

export interface LiveMonitorData {
  // Status
  status?: AssessmentResultStatus;
  invitationStatus?: AssessmentInvitationStatus;
  notStarted?: boolean;
  
  // Candidate info
  candidateName: string;
  candidateEmail: string;
  position?: string;
  
  // Test info
  testId?: string;
  testName: string;
  duration: number;
  resultId?: string;
  
  // Progress
  currentQuestion?: number;
  totalQuestions?: number;
  answeredQuestions?: number;
  skippedQuestions?: number;
  
  // Time
  startedAt?: string;
  elapsedTime?: number;
  remainingTime?: number;
  
  // Activity
  lastActivity?: string;
  isActive?: boolean;
  
  // Proctoring
  tabSwitchCount?: number;
  warningsCount?: number;
  browserInfo?: string;
  ipAddress?: string;
  tabSwitchLimit?: number;
  proctoringEnabled?: boolean;
  fullscreenRequired?: boolean;
  
  // Question progress
  questionProgress?: QuestionProgress[];
}

export interface TestForSelection {
  id: string;
  name: string;
  category?: string;
  difficulty: AssessmentDifficulty;
  duration: number;
  passingScore: number;
  questionsCount: number;
}

export interface TestAnalytics {
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  avgTimeTaken: number;
}

export interface OverallAnalytics {
  totalTests: number;
  publishedTests: number;
  pendingInvitations: number;
  totalAssessments: number;
  avgScore: number;
  passRate: number;
}

// Extended Analytics
export interface ExtendedAnalytics {
  tests: {
    total: number;
    published: number;
    draft: number;
  };
  invitations: {
    total: number;
    pending: number;
    sent: number;
    started: number;
    completed: number;
    expired: number;
  };
  results: {
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
    avgTimeTaken: number;
    passRate: number;
  };
  topTests: {
    testId: string;
    testName: string;
    attempts: number;
    avgScore: number;
  }[];
  scoreDistribution: {
    label: string;
    min: number;
    max: number;
    count: number;
  }[];
  questions: {
    total: number;
    bank: number;
    inTests: number;
  };
}

// Candidate for Invite
export interface CandidateForInvite {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobId: string;
  jobTitle: string;
  department?: string;
  status: string;
  appliedAt: string;
  existingInvitations: {
    id: string;
    testId: string;
    status: string;
  }[];
}

// Current Assessment (active/scheduled)
export interface CurrentAssessment {
  id: string;
  testId: string;
  candidateId?: string;
  candidateEmail: string;
  candidateName: string;
  assessmentCode: string;
  validFrom: string;
  validUntil: string;
  status: AssessmentInvitationStatus;
  emailSentAt?: string;
  createdAt: string;
  test: {
    id: string;
    name: string;
    duration: number;
    passingScore: number;
    category?: string;
  };
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    job?: {
      id: string;
      title: string;
    };
  };
  result?: AssessmentResult;
}

// Bulk Invitation Request
export interface BulkInvitationDto {
  testId: string;
  candidateIds: string[];
  validFrom: string;
  validUntil: string;
  sendEmail?: boolean;
}

// Result Filters
export interface ResultFilters {
  testId?: string;
  status?: string;
  passed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeAnswers?: boolean;
}

// AI Generated Question
export interface AIGeneratedQuestion {
  type: AssessmentQuestionType;
  question: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  category: string;
  difficulty: AssessmentDifficulty;
  points: number;
  tags?: string[];
}

// Bulk Import Result
export interface BulkImportResult {
  imported: number;
  duplicates: number;
  total: number;
  questions: AssessmentQuestion[];
}

// ============================================================================
// FILTER TYPES
// ============================================================================

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

// ============================================================================
// CREATE/UPDATE DTOs
// ============================================================================

export interface CreateTestDto {
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  difficulty?: AssessmentDifficulty;
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
  status?: AssessmentTestStatus;
}

export interface CreateSectionDto {
  name: string;
  description?: string;
  order?: number;
  timeLimit?: number;
  weightage?: number;
  questionIds?: string[]; // IDs of questions to add to this section (for fixed mode)
  // Selection mode fields
  selectionMode?: 'random' | 'fixed'; // random or fixed question selection
  randomCount?: number; // Number of questions to pick randomly
  category?: string; // Category to pick random questions from
  shuffleQuestions?: boolean; // Shuffle questions within this section
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {}

export interface CreateQuestionDto {
  testId?: string; // Optional for Question Bank
  sectionId?: string;
  type: AssessmentQuestionType;
  question: string;
  code?: string;
  codeLanguage?: string;
  options?: AssessmentQuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  category?: string;
  difficulty?: AssessmentDifficulty;
  tags?: string[];
  points?: number;
  negativeMarking?: number;
  order?: number;
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {}

export interface QuestionBankFilters {
  type?: string;
  category?: string;
  difficulty?: string;
  search?: string;
  testId?: string;
}

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

// ============================================================================
// LABELS
// ============================================================================

export const difficultyLabels: Record<AssessmentDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  EXPERT: 'Expert',
};

export const testStatusLabels: Record<AssessmentTestStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const questionTypeLabels: Record<AssessmentQuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  CODING: 'Coding',
};

export const invitationStatusLabels: Record<AssessmentInvitationStatus, string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  OPENED: 'Opened',
  STARTED: 'In Progress',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export const resultStatusLabels: Record<AssessmentResultStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  TERMINATED: 'Terminated',
  TIMED_OUT: 'Timed Out',
};

// ============================================================================
// API METHODS
// ============================================================================

const BASE_URL = '/api/v1/assessments';

export const assessmentApi = {
  // ==========================================================================
  // TESTS
  // ==========================================================================

  /**
   * Get all tests with optional filters
   */
  getAllTests: async (filters?: TestFilters): Promise<AssessmentTest[]> => {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.category) params.category = filters.category;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.search) params.search = filters.search;
    return get<AssessmentTest[]>(`${BASE_URL}/tests`, params);
  },

  /**
   * Get published tests for dropdown selection
   */
  getPublishedTests: async (): Promise<TestForSelection[]> => {
    return get<TestForSelection[]>(`${BASE_URL}/tests/published`);
  },

  /**
   * Get a single test by ID
   */
  getTestById: async (id: string): Promise<AssessmentTest> => {
    return get<AssessmentTest>(`${BASE_URL}/tests/${id}`);
  },

  /**
   * Get test analytics
   */
  getTestAnalytics: async (id: string): Promise<TestAnalytics> => {
    return get<TestAnalytics>(`${BASE_URL}/tests/${id}/analytics`);
  },

  /**
   * Create a new test
   */
  createTest: async (data: CreateTestDto): Promise<AssessmentTest> => {
    return post<AssessmentTest>(`${BASE_URL}/tests`, data);
  },

  /**
   * Update a test
   */
  updateTest: async (id: string, data: UpdateTestDto): Promise<AssessmentTest> => {
    return put<AssessmentTest>(`${BASE_URL}/tests/${id}`, data);
  },

  /**
   * Delete a test
   */
  deleteTest: async (id: string): Promise<void> => {
    return del<void>(`${BASE_URL}/tests/${id}`);
  },

  /**
   * Publish a test
   */
  publishTest: async (id: string): Promise<AssessmentTest> => {
    return post<AssessmentTest>(`${BASE_URL}/tests/${id}/publish`, {});
  },

  // ==========================================================================
  // SECTIONS
  // ==========================================================================

  /**
   * Create a section
   */
  createSection: async (testId: string, data: CreateSectionDto): Promise<AssessmentSection> => {
    return post<AssessmentSection>(`${BASE_URL}/tests/${testId}/sections`, data);
  },

  /**
   * Update a section
   */
  updateSection: async (id: string, data: UpdateSectionDto): Promise<AssessmentSection> => {
    return put<AssessmentSection>(`${BASE_URL}/sections/${id}`, data);
  },

  /**
   * Delete a section
   */
  deleteSection: async (id: string): Promise<void> => {
    return del<void>(`${BASE_URL}/sections/${id}`);
  },

  // ==========================================================================
  // QUESTIONS
  // ==========================================================================

  /**
   * Get all questions from Question Bank
   */
  getAllQuestions: async (filters?: QuestionBankFilters): Promise<BankQuestion[]> => {
    const params: Record<string, string> = {};
    if (filters?.type) params.type = filters.type;
    if (filters?.category) params.category = filters.category;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.search) params.search = filters.search;
    if (filters?.testId) params.testId = filters.testId;
    return get<BankQuestion[]>(`${BASE_URL}/questions`, params);
  },

  /**
   * Get question categories
   */
  getQuestionCategories: async (): Promise<string[]> => {
    return get<string[]>(`${BASE_URL}/questions/categories`);
  },

  /**
   * Get a question by ID
   */
  getQuestionById: async (id: string): Promise<BankQuestion> => {
    return get<BankQuestion>(`${BASE_URL}/questions/${id}`);
  },

  /**
   * Create a question in Question Bank (no testId)
   */
  createBankQuestion: async (data: CreateQuestionDto): Promise<AssessmentQuestion> => {
    return post<AssessmentQuestion>(`${BASE_URL}/questions`, data);
  },

  /**
   * Create a question for a specific test
   */
  createQuestion: async (testId: string, data: CreateQuestionDto): Promise<AssessmentQuestion> => {
    return post<AssessmentQuestion>(`${BASE_URL}/tests/${testId}/questions`, data);
  },

  /**
   * Bulk create questions
   */
  bulkCreateQuestions: async (testId: string, questions: CreateQuestionDto[]): Promise<{ success: boolean; count: number }> => {
    return post<{ success: boolean; count: number }>(`${BASE_URL}/tests/${testId}/questions/bulk`, { questions });
  },

  /**
   * Update a question
   */
  updateQuestion: async (id: string, data: UpdateQuestionDto): Promise<AssessmentQuestion> => {
    return put<AssessmentQuestion>(`${BASE_URL}/questions/${id}`, data);
  },

  /**
   * Delete a question
   */
  deleteQuestion: async (id: string): Promise<void> => {
    return del<void>(`${BASE_URL}/questions/${id}`);
  },

  /**
   * Add question to a test
   */
  addQuestionToTest: async (questionId: string, testId: string, sectionId?: string): Promise<AssessmentQuestion> => {
    return post<AssessmentQuestion>(`${BASE_URL}/questions/${questionId}/add-to-test`, { testId, sectionId });
  },

  /**
   * Remove question from test (move to bank)
   */
  removeQuestionFromTest: async (questionId: string): Promise<AssessmentQuestion> => {
    return post<AssessmentQuestion>(`${BASE_URL}/questions/${questionId}/remove-from-test`, {});
  },

  // ==========================================================================
  // INVITATIONS
  // ==========================================================================

  /**
   * Get all invitations with optional filters
   */
  getAllInvitations: async (filters?: InvitationFilters): Promise<AssessmentInvitation[]> => {
    const params: Record<string, string> = {};
    if (filters?.testId) params.testId = filters.testId;
    if (filters?.candidateId) params.candidateId = filters.candidateId;
    if (filters?.status) params.status = filters.status;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.search) params.search = filters.search;
    return get<AssessmentInvitation[]>(`${BASE_URL}/invitations`, params);
  },

  /**
   * Get a single invitation
   */
  getInvitationById: async (id: string): Promise<AssessmentInvitation> => {
    return get<AssessmentInvitation>(`${BASE_URL}/invitations/${id}`);
  },

  /**
   * Get live monitoring data for an invitation
   */
  getLiveMonitorData: async (invitationId: string): Promise<LiveMonitorData> => {
    return get<LiveMonitorData>(`${BASE_URL}/invitations/${invitationId}/monitor`);
  },

  /**
   * Get invitation by assessment code (public - no auth required)
   */
  getInvitationByCode: async (code: string): Promise<AssessmentInvitation & { test: AssessmentTest }> => {
    return publicGet<AssessmentInvitation & { test: AssessmentTest }>(`${BASE_URL}/invitations/code/${code}`);
  },

  /**
   * Create an invitation
   */
  createInvitation: async (data: CreateInvitationDto): Promise<AssessmentInvitation> => {
    return post<AssessmentInvitation>(`${BASE_URL}/invitations`, data);
  },

  /**
   * Send invitation email
   */
  sendInvitationEmail: async (id: string): Promise<void> => {
    return post<void>(`${BASE_URL}/invitations/${id}/send`, {});
  },

  /**
   * Send reminder email
   */
  sendReminderEmail: async (id: string): Promise<void> => {
    return post<void>(`${BASE_URL}/invitations/${id}/remind`, {});
  },

  /**
   * Cancel an invitation
   */
  cancelInvitation: async (id: string): Promise<void> => {
    return post<void>(`${BASE_URL}/invitations/${id}/cancel`, {});
  },

  /**
   * Regenerate assessment code
   */
  regenerateCode: async (id: string): Promise<AssessmentInvitation> => {
    return post<AssessmentInvitation>(`${BASE_URL}/invitations/${id}/regenerate-code`, {});
  },

  // ==========================================================================
  // CANDIDATE ASSESSMENT FLOW
  // ==========================================================================

  /**
   * Start an assessment (public - no auth required)
   */
  startAssessment: async (invitationId: string, browserInfo?: string): Promise<AssessmentResult> => {
    return publicPost<AssessmentResult>(`${BASE_URL}/start/${invitationId}`, { browserInfo });
  },

  /**
   * Submit an answer (public - no auth required)
   */
  submitAnswer: async (
    resultId: string, 
    questionId: string, 
    answer: { answer?: string; selectedOptions?: string[] },
    timeTaken?: number
  ): Promise<AssessmentAnswer> => {
    return publicPost<AssessmentAnswer>(`${BASE_URL}/results/${resultId}/answer`, {
      questionId,
      ...answer,
      timeTaken,
    });
  },

  /**
   * Complete an assessment (public - no auth required)
   */
  completeAssessment: async (resultId: string): Promise<AssessmentResult> => {
    return publicPost<AssessmentResult>(`${BASE_URL}/results/${resultId}/complete`, {});
  },

  /**
   * Record tab switch (public - no auth required)
   */
  recordTabSwitch: async (resultId: string): Promise<{ terminated: boolean; tabSwitchCount?: number; reason?: string }> => {
    return publicPost<{ terminated: boolean; tabSwitchCount?: number; reason?: string }>(`${BASE_URL}/results/${resultId}/tab-switch`, {});
  },

  /**
   * Get result by ID (used by both HR and candidates)
   */
  getResultById: async (id: string): Promise<AssessmentResult> => {
    return publicGet<AssessmentResult>(`${BASE_URL}/results/${id}`);
  },

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get overall analytics
   */
  getOverallAnalytics: async (dateFrom?: string, dateTo?: string): Promise<OverallAnalytics> => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return get<OverallAnalytics>(`${BASE_URL}/analytics`, params);
  },

  /**
   * Get extended analytics
   */
  getExtendedAnalytics: async (dateFrom?: string, dateTo?: string): Promise<ExtendedAnalytics> => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return get<ExtendedAnalytics>(`${BASE_URL}/analytics/extended`, params);
  },

  /**
   * Get all results with filters
   */
  getAllResults: async (filters?: ResultFilters): Promise<AssessmentResult[]> => {
    const params: Record<string, string> = {};
    if (filters?.testId) params.testId = filters.testId;
    if (filters?.status) params.status = filters.status;
    if (filters?.passed !== undefined) params.passed = String(filters.passed);
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.search) params.search = filters.search;
    if (filters?.includeAnswers) params.includeAnswers = 'true';
    return get<AssessmentResult[]>(`${BASE_URL}/results`, params);
  },

  /**
   * Get result details for HR (authenticated, includes full answer details)
   */
  getResultDetailsForHR: async (id: string): Promise<AssessmentResult> => {
    return get<AssessmentResult>(`${BASE_URL}/results/${id}`);
  },

  /**
   * Get current/active assessments
   */
  getCurrentAssessments: async (filters?: { testId?: string; status?: string; search?: string }): Promise<CurrentAssessment[]> => {
    const params: Record<string, string> = {};
    if (filters?.testId) params.testId = filters.testId;
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    return get<CurrentAssessment[]>(`${BASE_URL}/current`, params);
  },

  /**
   * Get candidates for invite
   */
  getCandidatesForInvite: async (filters?: { jobId?: string; search?: string; status?: string }): Promise<CandidateForInvite[]> => {
    const params: Record<string, string> = {};
    if (filters?.jobId) params.jobId = filters.jobId;
    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    return get<CandidateForInvite[]>(`${BASE_URL}/candidates`, params);
  },

  /**
   * Bulk create invitations
   */
  bulkCreateInvitations: async (data: BulkInvitationDto): Promise<AssessmentInvitation[]> => {
    return post<AssessmentInvitation[]>(`${BASE_URL}/invitations/bulk`, data);
  },

  // ==========================================================================
  // AI QUESTION GENERATION
  // ==========================================================================

  /**
   * Get available AI categories for question generation
   * Returns categories and OpenAI status
   */
  getAICategories: async (): Promise<{ categories: string[]; openaiEnabled: boolean }> => {
    // Use api directly to preserve meta field (get() only returns data.data)
    const { api } = await import('./client');
    const response = await api.get<{ 
      success: boolean; 
      data: string[]; 
      meta?: { openaiEnabled: boolean } 
    }>(`${BASE_URL}/ai/categories`);
    
    const { data: categories, meta } = response.data;
    return {
      categories: Array.isArray(categories) ? categories : [],
      openaiEnabled: meta?.openaiEnabled || false,
    };
  },

  /**
   * Generate questions using AI
   * Returns questions and source (openai or predefined)
   */
  generateAIQuestions: async (
    category: string, 
    difficulty: string, 
    count: number = 5,
    questionTypes: string[] = ['MULTIPLE_CHOICE']
  ): Promise<{
    questions: AIGeneratedQuestion[];
    source: 'openai' | 'predefined';
    message?: string;
  }> => {
    // Use api directly to preserve meta field (post() only returns data.data)
    const { api } = await import('./client');
    const response = await api.post<{
      success: boolean;
      data: AIGeneratedQuestion[];
      meta?: { source: string; message?: string };
    }>(`${BASE_URL}/ai/generate`, {
      category,
      difficulty,
      count,
      questionTypes,
    });
    
    const { data: questions, meta } = response.data;
    
    return {
      questions: Array.isArray(questions) ? questions : [],
      source: (meta?.source as 'openai' | 'predefined') || 'predefined',
      message: meta?.message,
    };
  },

  /**
   * Bulk import questions with duplicate detection
   */
  bulkImportQuestions: async (questions: AIGeneratedQuestion[]): Promise<BulkImportResult> => {
    return post<BulkImportResult>(`${BASE_URL}/questions/bulk-import`, { questions });
  },
};
