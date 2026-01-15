/**
 * Performance Types - Performance reviews and goals
 */

import { AuditableEntity, BaseEntity } from '../common';

export type ReviewCycleStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type ReviewStatus = 'not_started' | 'self_review' | 'manager_review' | 'calibration' | 'completed';
export type GoalStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceReviewCycle extends AuditableEntity {
  tenantId: string;
  name: string;
  description?: string;
  type: 'annual' | 'mid_year' | 'quarterly' | 'probation' | 'project';
  status: ReviewCycleStatus;
  startDate: Date;
  endDate: Date;
  selfReviewDeadline: Date;
  managerReviewDeadline: Date;
  calibrationDeadline?: Date;
  template: ReviewTemplate;
  settings: ReviewCycleSettings;
}

export interface ReviewCycleSettings {
  includeSelfReview: boolean;
  includePeerReview: boolean;
  include360Review: boolean;
  anonymousPeerReview: boolean;
  requireGoalRating: boolean;
  requireCompetencyRating: boolean;
  allowPartialSubmission: boolean;
}

export interface ReviewTemplate {
  id: string;
  name: string;
  sections: ReviewSection[];
  ratingScale: RatingScale;
}

export interface ReviewSection {
  id: string;
  name: string;
  description?: string;
  type: 'goals' | 'competencies' | 'feedback' | 'custom';
  weight: number;
  questions: ReviewQuestion[];
}

export interface ReviewQuestion {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'multi_choice';
  isRequired: boolean;
  options?: string[];
}

export interface RatingScale {
  min: number;
  max: number;
  labels: { value: number; label: string; description?: string }[];
}

export interface PerformanceReview extends AuditableEntity {
  tenantId: string;
  cycleId: string;
  employeeId: string;
  managerId: string;
  status: ReviewStatus;
  selfReview?: ReviewSubmission;
  managerReview?: ReviewSubmission;
  peerReviews?: ReviewSubmission[];
  finalRating?: number;
  finalComments?: string;
  calibratedRating?: number;
  calibrationNotes?: string;
  submittedAt?: Date;
  completedAt?: Date;
}

export interface ReviewSubmission {
  reviewerId: string;
  reviewerType: 'self' | 'manager' | 'peer' | '360';
  sections: SectionSubmission[];
  overallRating: number;
  overallComments: string;
  strengths: string[];
  areasForImprovement: string[];
  submittedAt: Date;
}

export interface SectionSubmission {
  sectionId: string;
  answers: QuestionAnswer[];
  sectionRating?: number;
}

export interface QuestionAnswer {
  questionId: string;
  rating?: number;
  textAnswer?: string;
  selectedOptions?: string[];
}

export interface PerformanceGoal extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  cycleId?: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  category?: string;
  startDate: Date;
  dueDate: Date;
  completedAt?: Date;
  progress: number;
  weight?: number;
  keyResults: KeyResult[];
  alignedTo?: string;
  rating?: number;
  managerRating?: number;
  feedback?: string;
}

export interface KeyResult {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  isCompleted: boolean;
}
