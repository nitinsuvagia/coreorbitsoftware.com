/**
 * Client Events - Client and billing events
 */

export interface ClientCreatedEvent {
  tenantId: string;
  clientId: string;
  name: string;
  code: string;
  type: string;
  createdBy: string;
  createdAt: Date;
}

export interface ContractSignedEvent {
  tenantId: string;
  contractId: string;
  clientId: string;
  type: string;
  value?: number;
  startDate: Date;
  endDate: Date;
  signedAt: Date;
}

export interface ContractExpiringEvent {
  tenantId: string;
  contractId: string;
  clientId: string;
  expiryDate: Date;
  daysUntilExpiry: number;
}

export interface InvoiceCreatedEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  createdAt: Date;
}

export interface InvoiceSentEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  sentTo: string;
  sentAt: Date;
}

export interface PaymentReceivedEvent {
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  currency: string;
  receivedAt: Date;
}

export interface InvoiceOverdueEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
}
