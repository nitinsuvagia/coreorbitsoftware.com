/**
 * Meeting Room Types - Room management
 */

import { AuditableEntity, BaseEntity } from '../common';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'inactive';

export interface MeetingRoom extends AuditableEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  location: string;
  floor?: string;
  building?: string;
  capacity: number;
  status: RoomStatus;
  amenities: string[];
  images?: string[];
  calendarId?: string;
  bookingRules: RoomBookingRules;
  isActive: boolean;
}

export interface RoomBookingRules {
  minDuration: number;
  maxDuration: number;
  advanceBookingDays: number;
  cancellationMinutes: number;
  requiresApproval: boolean;
  allowRecurring: boolean;
  maxRecurrences?: number;
  allowedDays: number[];
  allowedStartTime: string;
  allowedEndTime: string;
  bufferMinutes?: number;
}

export interface RoomBooking extends AuditableEntity {
  tenantId: string;
  roomId: string;
  meetingId?: string;
  title: string;
  description?: string;
  organizerId: string;
  startTime: Date;
  endTime: Date;
  attendees: BookingAttendee[];
  status: 'confirmed' | 'tentative' | 'cancelled' | 'checked_in' | 'no_show';
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentBookingId?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
  amenitiesRequested?: string[];
  cateringRequired?: boolean;
  cateringNotes?: string;
}

export interface BookingAttendee {
  employeeId: string;
  name: string;
  email: string;
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  isRequired: boolean;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[];
}
