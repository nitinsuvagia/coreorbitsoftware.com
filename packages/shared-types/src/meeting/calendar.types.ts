/**
 * Calendar Types - Calendar events
 */

import { AuditableEntity } from '../common';
import { RecurrenceRule } from './room.types';

export type CalendarEventType = 'meeting' | 'task' | 'reminder' | 'out_of_office' | 'holiday' | 'birthday' | 'anniversary' | 'other';
export type CalendarVisibility = 'public' | 'private' | 'busy';

export interface CalendarEvent extends AuditableEntity {
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timezone: string;
  location?: string;
  visibility: CalendarVisibility;
  color?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentEventId?: string;
  linkedEntityId?: string;
  linkedEntityType?: 'meeting' | 'task' | 'interview' | 'leave';
  reminders: EventReminder[];
  attendees?: EventAttendee[];
  metadata?: Record<string, unknown>;
}

export interface EventReminder {
  type: 'email' | 'push' | 'sms';
  minutesBefore: number;
}

export interface EventAttendee {
  userId?: string;
  email: string;
  name: string;
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface Calendar extends AuditableEntity {
  tenantId: string;
  userId?: string;
  name: string;
  description?: string;
  color: string;
  type: 'personal' | 'team' | 'project' | 'shared' | 'holiday';
  isDefault: boolean;
  isVisible: boolean;
  syncWith?: CalendarSync[];
}

export interface CalendarSync {
  provider: 'google' | 'outlook' | 'apple';
  externalCalendarId: string;
  syncDirection: 'one_way' | 'two_way';
  lastSyncAt?: Date;
  isActive: boolean;
}
