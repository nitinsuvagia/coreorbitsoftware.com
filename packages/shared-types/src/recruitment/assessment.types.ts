/**
 * Assessment Types - Skill tests and assessments
 */

import { AuditableEntity, BaseEntity } from '../common';

export type AssessmentType = 'mcq' | 'coding' | 'practical' | 'personality' | 'aptitude' | 'custom';
export type AssessmentStatus = 'draft' | 'published' | 'archived';
export type TestAttemptStatus = 'invited' | 'started' | 'submitted' | 'evaluated' | 'expired';

export interface SkillAssessment extends AuditableEntity {
  tenantId: string;
  name: string;
  description?: string;
  type: AssessmentType;
  status: AssessmentStatus;
  duration: number;
  passingScore: number;
  totalScore: number;
  questions: AssessmentQuestion[];
  randomizeQuestions: boolean;
  showScore: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  jobIds?: string[];
  stageId?: string;
  instructions?: string;
  isProctored: boolean;
  tags: string[];
}

export interface AssessmentQuestion {
  id: string;
  type: 'mcq' | 'multi_select' | 'text' | 'code' | 'file_upload';
  question: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  codeTemplate?: string;
  testCases?: CodeTestCase[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  explanation?: string;
  order: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface CodeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface TestAttempt extends AuditableEntity {
  tenantId: string;
  assessmentId: string;
  candidateId: string;
  applicationId?: string;
  status: TestAttemptStatus;
  startedAt?: Date;
  submittedAt?: Date;
  expiresAt: Date;
  answers: AttemptAnswer[];
  score?: number;
  percentage?: number;
  isPassed?: boolean;
  evaluatedBy?: string;
  evaluatedAt?: Date;
  feedback?: string;
  proctorData?: ProctorData;
}

export interface AttemptAnswer {
  questionId: string;
  answer: string | string[];
  codeSubmission?: string;
  fileUrl?: string;
  isCorrect?: boolean;
  points?: number;
  feedback?: string;
  answeredAt: Date;
  timeSpent: number;
}

export interface ProctorData {
  screenshots: string[];
  tabSwitches: number;
  copyPasteAttempts: number;
  suspiciousActivities: SuspiciousActivity[];
}

export interface SuspiciousActivity {
  type: string;
  timestamp: Date;
  details?: string;
}
