/**
 * Announcement Types - Company announcements
 */

import { AuditableEntity } from '../common';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Announcement extends AuditableEntity {
  tenantId: string;
  title: string;
  content: string;
  excerpt?: string;
  status: AnnouncementStatus;
  priority: AnnouncementPriority;
  category: string;
  authorId: string;
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
  isPinned: boolean;
  requiresAcknowledgement: boolean;
  audience: AnnouncementAudience;
  attachments?: string[];
  coverImage?: string;
  viewCount: number;
  acknowledgementCount: number;
  tags?: string[];
}

export interface AnnouncementAudience {
  allEmployees: boolean;
  departments?: string[];
  designations?: string[];
  locations?: string[];
  employeeIds?: string[];
}

export interface AnnouncementAcknowledgement {
  announcementId: string;
  userId: string;
  acknowledgedAt: Date;
}

export interface AnnouncementView {
  announcementId: string;
  userId: string;
  viewedAt: Date;
}
