/**
 * Candidate Types - Candidate management
 */

import { AuditableEntity, BaseEntity } from '../common';

export type CandidateSource = 'job_board' | 'referral' | 'linkedin' | 'company_website' | 'agency' | 'campus' | 'social_media' | 'other';
export type ApplicationStatus = 'new' | 'screening' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn' | 'on_hold';

export interface Candidate extends AuditableEntity {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentDesignation?: string;
  experience: number;
  expectedSalary?: number;
  noticePeriod?: number;
  location?: string;
  source: CandidateSource;
  referrerId?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  photoUrl?: string;
  skills: CandidateSkill[];
  education: CandidateEducation[];
  workHistory: CandidateWorkHistory[];
  documents: CandidateDocument[];
  tags: string[];
  notes?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
}

export interface CandidateSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  isVerified: boolean;
}

export interface CandidateEducation {
  degree: string;
  field: string;
  institution: string;
  startYear: number;
  endYear?: number;
  grade?: string;
  isCurrent: boolean;
}

export interface CandidateWorkHistory {
  company: string;
  designation: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  location?: string;
}

export interface CandidateDocument {
  id: string;
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'id_proof' | 'other';
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface Application extends AuditableEntity {
  tenantId: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  currentStageId: string;
  appliedAt: Date;
  source: CandidateSource;
  referrerId?: string;
  coverLetter?: string;
  expectedSalary?: number;
  availableFrom?: Date;
  screeningScore?: number;
  overallScore?: number;
  isStarred: boolean;
  assignedTo?: string;
  rejectionReason?: string;
  rejectedAt?: Date;
  hiredAt?: Date;
  notes?: string;
}

export interface ApplicationStageHistory extends BaseEntity {
  applicationId: string;
  stageId: string;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  outcome?: 'passed' | 'failed' | 'skipped';
  notes?: string;
  movedBy: string;
}
