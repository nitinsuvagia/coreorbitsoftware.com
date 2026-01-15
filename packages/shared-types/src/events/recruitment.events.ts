/**
 * Recruitment Events - ATS events
 */

export interface JobPublishedEvent {
  tenantId: string;
  jobId: string;
  title: string;
  departmentId: string;
  publishedBy: string;
  publishedAt: Date;
}

export interface ApplicationReceivedEvent {
  tenantId: string;
  jobId: string;
  applicationId: string;
  candidateId: string;
  source: string;
  receivedAt: Date;
}

export interface ApplicationStageChangedEvent {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  previousStageId: string;
  newStageId: string;
  changedBy: string;
  changedAt: Date;
}

export interface InterviewScheduledEvent {
  tenantId: string;
  interviewId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  interviewers: string[];
  scheduledAt: Date;
  scheduledBy: string;
}

export interface InterviewCompletedEvent {
  tenantId: string;
  interviewId: string;
  applicationId: string;
  candidateId: string;
  result: string;
  overallScore?: number;
  completedAt: Date;
}

export interface OfferSentEvent {
  tenantId: string;
  offerId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  compensation: {
    baseSalary: number;
    currency: string;
  };
  sentBy: string;
  sentAt: Date;
}

export interface OfferAcceptedEvent {
  tenantId: string;
  offerId: string;
  applicationId: string;
  candidateId: string;
  joiningDate: Date;
  acceptedAt: Date;
}

export interface OfferDeclinedEvent {
  tenantId: string;
  offerId: string;
  applicationId: string;
  candidateId: string;
  reason?: string;
  declinedAt: Date;
}

export interface CandidateHiredEvent {
  tenantId: string;
  candidateId: string;
  applicationId: string;
  jobId: string;
  offerId: string;
  employeeId: string;
  joiningDate: Date;
  hiredAt: Date;
}
