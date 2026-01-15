/**
 * Meeting Events - Meeting and calendar events
 */

export interface MeetingScheduledEvent {
  tenantId: string;
  meetingId: string;
  title: string;
  organizerId: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  roomId?: string;
  scheduledAt: Date;
}

export interface MeetingCancelledEvent {
  tenantId: string;
  meetingId: string;
  cancelledBy: string;
  reason?: string;
  cancelledAt: Date;
}

export interface MeetingStartedEvent {
  tenantId: string;
  meetingId: string;
  startedAt: Date;
  startedBy: string;
}

export interface MeetingEndedEvent {
  tenantId: string;
  meetingId: string;
  endedAt: Date;
  duration: number;
  attendeesPresent: number;
}

export interface RoomBookedEvent {
  tenantId: string;
  bookingId: string;
  roomId: string;
  organizerId: string;
  startTime: Date;
  endTime: Date;
  bookedAt: Date;
}

export interface RoomBookingCancelledEvent {
  tenantId: string;
  bookingId: string;
  roomId: string;
  cancelledBy: string;
  cancelledAt: Date;
}
