/**
 * Invoice Service - Generate and manage invoices
 */

import { PrismaClient } from '.prisma/tenant-client';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import Decimal from 'decimal.js';
import { getMasterPrisma } from '@oms/database';
import { getEventBus, SQS_QUEUES, publishEvent } from '@oms/event-bus';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as planService from './plan.service';

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  paidAt?: Date;
  lineItems?: InvoiceLineItem[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, any>;
}

export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    periodStart?: Date;
    periodEnd?: Date;
  }[];
  taxRate?: number;
  dueInDays?: number;
  metadata?: Record<string, any>;
}

/**
 * Generate next invoice number
 */
async function generateInvoiceNumber(): Promise<string> {
  const masterPrisma = getMasterPrisma();
  
  const year = DateTime.now().year;
  const prefix = `${config.billing.invoicePrefix}${year}-`;
  
  const lastInvoice = await masterPrisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
  });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
    sequence = lastNumber + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

/**
 * Create a new invoice
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const masterPrisma = getMasterPrisma();
  
  const invoiceNumber = await generateInvoiceNumber();
  const taxRate = input.taxRate ?? config.billing.defaultTaxRate;
  const dueDate = DateTime.now()
    .plus({ days: input.dueInDays ?? config.billing.invoiceDueDays })
    .toJSDate();
  
  // Calculate totals
  let subtotal = new Decimal(0);
  const lineItemsData: any[] = [];
  
  for (const item of input.lineItems) {
    const amount = new Decimal(item.quantity).times(item.unitPrice);
    subtotal = subtotal.plus(amount);
    
    lineItemsData.push({
      id: uuid(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: amount.toNumber(),
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
    });
  }
  
  const tax = subtotal.times(taxRate);
  const total = subtotal.plus(tax);
  
  const invoice = await masterPrisma.invoice.create({
    data: {
      id: uuid(),
      tenantId: input.tenantId,
      subscriptionId: input.subscriptionId,
      invoiceNumber,
      status: 'SENT',
      currency: config.billing.defaultCurrency,
      subtotal: subtotal.toNumber(),
      tax: tax.toNumber(),
      total: total.toNumber(),
      amountPaid: 0,
      amountDue: total.toNumber(),
      issueDate: new Date(),
      dueDate,
      metadata: input.metadata as any,
      lineItems: lineItemsData,
    },
  });
  
  await publishEvent('invoice.created', {
    invoiceId: invoice.id,
    tenantId: input.tenantId,
    invoiceNumber,
    total: total.toNumber(),
    dueDate,
  });
  
  logger.info({
    invoiceId: invoice.id,
    tenantId: input.tenantId,
    invoiceNumber,
    total: total.toNumber(),
  }, 'Invoice created');
  
  return invoice as unknown as Invoice;
}

/**
 * Create subscription invoice
 */
export async function createSubscriptionInvoice(
  tenantId: string,
  subscriptionId: string,
  planId: string,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  periodStart: Date,
  periodEnd: Date
): Promise<Invoice> {
  const plan = planService.getPlanById(planId as any);
  
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  
  const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
  
  return createInvoice({
    tenantId,
    subscriptionId,
    lineItems: [
      {
        description: `${plan.name} Plan - ${billingCycle === 'YEARLY' ? 'Annual' : billingCycle === 'QUARTERLY' ? 'Quarterly' : 'Monthly'} Subscription`,
        quantity: 1,
        unitPrice: price,
        periodStart,
        periodEnd,
      },
    ],
  });
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const masterPrisma = getMasterPrisma();
  
  const invoice = await masterPrisma.invoice.findUnique({
    where: { id },
  });
  return invoice as unknown as Invoice | null;
}

/**
 * Get invoice by number
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const masterPrisma = getMasterPrisma();
  
  const invoice = await masterPrisma.invoice.findUnique({
    where: { invoiceNumber },
  });
  return invoice as unknown as Invoice | null;
}

/**
 * List tenant invoices
 */
export async function listTenantInvoices(
  tenantId: string,
  options: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{ invoices: Invoice[]; total: number; page: number; pageSize: number }> {
  const masterPrisma = getMasterPrisma();
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  
  const where: any = { tenantId };
  
  if (options.status) {
    where.status = options.status;
  }
  
  const [invoices, total] = await Promise.all([
    masterPrisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    masterPrisma.invoice.count({ where }),
  ]);
  
  return { invoices: invoices as unknown as Invoice[], total, page, pageSize };
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  id: string,
  paymentId: string,
  amountPaid?: number
): Promise<Invoice> {
  const masterPrisma = getMasterPrisma();
  
  const invoice = await masterPrisma.invoice.findUnique({
    where: { id },
    
  });
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const paidAmount = amountPaid ?? invoice.amountDue;
  const newAmountPaid = new Decimal(invoice.amountPaid).plus(paidAmount);
  const newAmountDue = new Decimal(invoice.total).minus(newAmountPaid);
  
  const updated = await masterPrisma.invoice.update({
    where: { id },
    data: {
      status: newAmountDue.lte(0) ? 'PAID' : 'SENT',
      amountPaid: newAmountPaid.toNumber(),
      amountDue: Math.max(0, newAmountDue.toNumber()),
      paidAt: newAmountDue.lte(0) ? new Date() : undefined,
      updatedAt: new Date(),
    },
    
  });
  
  if (updated.status === 'PAID') {
    await publishEvent('invoice.paid', {
      invoiceId: id,
      tenantId: invoice.tenantId,
      invoiceNumber: invoice.invoiceNumber,
      paymentId,
    });
    
    logger.info({
      invoiceId: id,
      tenantId: invoice.tenantId,
      invoiceNumber: invoice.invoiceNumber,
    }, 'Invoice paid');
  }
  
  return updated as unknown as Invoice;
}

/**
 * Void an invoice
 */
export async function voidInvoice(id: string): Promise<Invoice> {
  const masterPrisma = getMasterPrisma();
  
  const invoice = await masterPrisma.invoice.findUnique({
    where: { id },
  });
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.status === 'PAID') {
    throw new Error('Cannot void a paid invoice');
  }
  
  const voided = await masterPrisma.invoice.update({
    where: { id },
    data: {
      status: 'CANCELED',
      updatedAt: new Date(),
    },
  });
  
  await publishEvent('invoice.voided', {
    invoiceId: id,
    tenantId: invoice.tenantId,
    invoiceNumber: invoice.invoiceNumber,
  });
  
  return voided as unknown as Invoice;
}

/**
 * Get overdue invoices
 */
export async function getOverdueInvoices(): Promise<Invoice[]> {
  const masterPrisma = getMasterPrisma();
  
  const invoices = await masterPrisma.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: new Date() },
    },
    orderBy: { dueDate: 'asc' },
  });
  return invoices as unknown as Invoice[];
}

/**
 * Add credit note (refund)
 */
export async function createCreditNote(
  originalInvoiceId: string,
  amount: number,
  reason: string
): Promise<Invoice> {
  const masterPrisma = getMasterPrisma();
  
  const originalInvoice = await masterPrisma.invoice.findUnique({
    where: { id: originalInvoiceId },
  });
  
  if (!originalInvoice) {
    throw new Error('Original invoice not found');
  }
  
  const invoiceNumber = await generateInvoiceNumber();
  
  const creditNote = await masterPrisma.invoice.create({
    data: {
      id: uuid(),
      tenantId: originalInvoice.tenantId,
      subscriptionId: originalInvoice.subscriptionId,
      invoiceNumber: invoiceNumber.replace('INV-', 'CN-'),
      status: 'PAID',
      currency: originalInvoice.currency,
      subtotal: -amount,
      tax: 0,
      total: -amount,
      amountPaid: -amount,
      amountDue: 0,
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      metadata: {
        type: 'credit_note',
        originalInvoiceId,
        reason,
      } as any,
      lineItems: [{
        id: uuid(),
        description: `Credit Note: ${reason}`,
        quantity: 1,
        unitPrice: -amount,
        amount: -amount,
      }],
    },
  });
  
  await publishEvent('credit_note.created', {
    creditNoteId: creditNote.id,
    tenantId: originalInvoice.tenantId,
    originalInvoiceId,
    amount,
  });
  
  return creditNote as unknown as Invoice;
}
