/**
 * Base Types - Common entities and response types
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date;
  deletedBy?: string;
  isDeleted: boolean;
}

export interface AuditableEntity extends SoftDeleteEntity {
  version: number;
}
