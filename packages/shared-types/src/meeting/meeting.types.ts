/**
 * Meeting Types - Meeting management
 */

import { AuditableEntity } from '../common';
import { RecurrenceRule } from './room.types';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingType = 'in_person' | 'virtual' | 'hybrid';

export interface Meeting extends AuditableEntity {
  tenantId: string;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  organizerId: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  roomId?: string;
  virtualMeetingUrl?: string;
  virtualMeetingId?: string;
  virtualPlatform?: 'zoom' | 'teams' | 'meet' | 'webex' | 'other';
  attendees: MeetingAttendee[];
  agenda?: MeetingAgendaItem[];
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentMeetingId?: string;
  projectId?: string;
  clientId?: string;
  isPrivate: boolean;
  reminders: MeetingReminder[];
  notes?: string;
  attachments?: string[];
  recordingUrl?: string;
  transcriptUrl?: string;
}

export interface MeetingAttendee {
  employeeId?: string;
  externalEmail?: string;
  name: string;
  email: string;
  isRequired: boolean;
  isOrganizer: boolean;
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  respondedAt?: Date;
  attendedAt?: Date;
  leftAt?: Date;
}

export interface MeetingAgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number;
  presenterId?: string;
  order: number;
  notes?: string;
  attachments?: string[];
}

export interface MeetingReminder {
  type: 'email' | 'push' | 'both';
  minutesBefore: number;
}

export interface MeetingMinutes extends AuditableEntity {
  tenantId: string;
  meetingId: string;
  content: string;
  attendees: string[];
  absentees: string[];
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  nextMeetingDate?: Date;
  isPublished: boolean;
  publishedAt?: Date;
  publishedBy?: string;
}

export interface MeetingDecision {
  id: string;
  decision: string;
  madeBy?: string;
  context?: string;
}

export interface MeetingActionItem {
  id: string;
  action: string;
  assigneeId: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
}
