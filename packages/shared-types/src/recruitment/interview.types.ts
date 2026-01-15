/**
 * Interview Types - Interview management
 */

import { AuditableEntity, BaseEntity } from '../common';

export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
export type InterviewType = 'phone' | 'video' | 'in_person' | 'panel' | 'technical' | 'hr' | 'cultural';
export type InterviewResult = 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'pending';

export interface Interview extends AuditableEntity {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  stageId: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: Date;
  duration: number;
  location?: string;
  meetingLink?: string;
  meetingId?: string;
  interviewers: InterviewerAssignment[];
  scorecardId?: string;
  feedback?: InterviewFeedback[];
  result?: InterviewResult;
  notes?: string;
  recordingUrl?: string;
  scheduledBy: string;
  confirmedByCandidate: boolean;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface InterviewerAssignment {
  interviewerId: string;
  role: 'lead' | 'participant' | 'observer';
  isOptional: boolean;
  hasConfirmed: boolean;
  confirmedAt?: Date;
}

export interface InterviewFeedback extends BaseEntity {
  interviewId: string;
  interviewerId: string;
  scorecardId?: string;
  scores: InterviewScore[];
  overallScore: number;
  recommendation: InterviewResult;
  strengths: string[];
  weaknesses: string[];
  comments: string;
  submittedAt: Date;
  isPrivate: boolean;
}

export interface InterviewScore {
  criteriaId: string;
  criteriaName: string;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface InterviewScorecard extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  jobId?: string;
  stageId?: string;
  criteria: ScorecardCriteria[];
  isDefault: boolean;
  isActive: boolean;
}

export interface ScorecardCriteria {
  id: string;
  name: string;
  description?: string;
  category: string;
  weight: number;
  maxScore: number;
  order: number;
}

export interface InterviewSlot {
  interviewerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  interviewId?: string;
}
