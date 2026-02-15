/**
 * Payment Service - Handle payment processing
 */

import { PrismaClient } from '.prisma/tenant-client';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import Decimal from 'decimal.js';
import { getMasterPrisma } from '@oms/database';
import { publishEvent } from '@oms/event-bus';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as stripeService from './stripe.service';
import * as invoiceService from './invoice.service';
import * as subscriptionService from './subscription.service';

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'CARD' | 'BANK_ACCOUNT' | 'PAYPAL' | 'OTHER';
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
  stripePaymentMethodId?: string;
  createdAt: Date;
}

export interface CreatePaymentInput {
  tenantId: string;
  invoiceId?: string;
  amount: number;
  paymentMethodId: string;
  description?: string;
}

// Helper to convert Prisma Payment to our Payment interface
function mapPayment(p: any): Payment {
  return {
    id: p.id,
    tenantId: p.tenantId,
    invoiceId: p.invoiceId || undefined,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    paymentMethod: p.paymentMethodId,
    stripePaymentIntentId: p.stripePaymentIntentId || undefined,
    stripeChargeId: p.stripeChargeId || undefined,
    errorMessage: p.failureReason || undefined,
    metadata: p.metadata || undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * Create a payment
 */
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const masterPrisma = getMasterPrisma();
  
  const paymentId = uuid();
  
  // Create payment record
  let payment = await masterPrisma.payment.create({
    data: {
      id: paymentId,
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      paymentMethodId: input.paymentMethodId,
      amount: input.amount,
      currency: config.billing.defaultCurrency,
      status: 'PROCESSING',
      metadata: input.description ? { description: input.description } : undefined,
    },
  });
  
  try {
    // Process via Stripe
    const stripeResult = await stripeService.createPayment({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: config.billing.defaultCurrency,
      paymentMethodId: input.paymentMethodId,
      description: input.description,
      metadata: {
        paymentId,
        tenantId: input.tenantId,
        invoiceId: input.invoiceId || '',
      },
    });
    
    payment = await masterPrisma.payment.update({
      where: { id: paymentId },
      data: {
        status: stripeResult.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
        stripePaymentIntentId: stripeResult.paymentIntentId,
        stripeChargeId: stripeResult.chargeId,
        failureReason: stripeResult.error,
        processedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    if (payment.status === 'SUCCEEDED') {
      // Mark invoice as paid
      if (input.invoiceId) {
        await invoiceService.markInvoicePaid(input.invoiceId, paymentId);
      }
      
      await publishEvent('payment.succeeded', {
        paymentId,
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        amount: input.amount,
      });
      
      logger.info({
        paymentId,
        tenantId: input.tenantId,
        amount: input.amount,
      }, 'Payment succeeded');
    } else {
      await publishEvent('payment.failed', {
        paymentId,
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        error: stripeResult.error,
      });
      
      logger.warn({
        paymentId,
        tenantId: input.tenantId,
        error: stripeResult.error,
      }, 'Payment failed');
    }
  } catch (error: any) {
    payment = await masterPrisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: error.message,
        updatedAt: new Date(),
      },
    });
    
    logger.error({
      paymentId,
      tenantId: input.tenantId,
      error: error.message,
    }, 'Payment processing error');
  }
  
  return mapPayment(payment);
}

/**
 * Get payment by ID
 */
export async function getPaymentById(id: string): Promise<Payment | null> {
  const masterPrisma = getMasterPrisma();
  const payment = await masterPrisma.payment.findUnique({ where: { id } });
  return payment ? mapPayment(payment) : null;
}

/**
 * List tenant payments
 */
export async function listTenantPayments(
  tenantId: string,
  options: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{ payments: Payment[]; total: number; page: number; pageSize: number }> {
  const masterPrisma = getMasterPrisma();
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  
  const where: any = { tenantId };
  
  if (options.status) {
    where.status = options.status;
  }
  
  const [payments, total] = await Promise.all([
    masterPrisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    masterPrisma.payment.count({ where }),
  ]);
  
  return { payments: payments.map(mapPayment), total, page, pageSize };
}

/**
 * Refund a payment
 */
export async function refundPayment(
  id: string,
  amount?: number
): Promise<Payment> {
  const masterPrisma = getMasterPrisma();
  
  const payment = await masterPrisma.payment.findUnique({
    where: { id },
  });
  
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  if (payment.status !== 'SUCCEEDED') {
    throw new Error('Can only refund successful payments');
  }
  
  const refundAmount = amount ?? Number(payment.amount);
  
  if (refundAmount > Number(payment.amount)) {
    throw new Error('Refund amount exceeds original payment');
  }
  
  // Process refund via Stripe
  if (payment.stripePaymentIntentId) {
    await stripeService.refundPayment(
      payment.stripePaymentIntentId,
      Math.round(refundAmount * 100)
    );
  }
  
  const refunded = await masterPrisma.payment.update({
    where: { id },
    data: {
      status: 'REFUNDED',
      updatedAt: new Date(),
    },
  });
  
  // Create credit note
  if (payment.invoiceId) {
    await invoiceService.createCreditNote(
      payment.invoiceId,
      refundAmount,
      'Payment refund'
    );
  }
  
  await publishEvent('payment.refunded', {
    paymentId: id,
    tenantId: payment.tenantId,
    amount: refundAmount,
  });
  
  logger.info({
    paymentId: id,
    tenantId: payment.tenantId,
    amount: refundAmount,
  }, 'Payment refunded');
  
  return mapPayment(refunded);
}

/**
 * Add payment method
 */
export async function addPaymentMethod(
  tenantId: string,
  stripePaymentMethodId: string,
  setAsDefault: boolean = false
): Promise<PaymentMethod> {
  const masterPrisma = getMasterPrisma();
  
  // Get payment method details from Stripe
  const stripeMethod = await stripeService.getPaymentMethod(stripePaymentMethodId);
  
  // If setting as default, unset other defaults
  if (setAsDefault) {
    await masterPrisma.paymentMethod.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }
  
  const paymentMethod = await masterPrisma.paymentMethod.create({
    data: {
      id: uuid(),
      tenantId,
      type: stripeMethod.type.toUpperCase() as 'CARD' | 'BANK_ACCOUNT',
      isDefault: setAsDefault,
      stripePaymentMethodId,
      cardBrand: stripeMethod.card?.brand,
      cardLast4: stripeMethod.card?.last4,
      cardExpMonth: stripeMethod.card?.expMonth,
      cardExpYear: stripeMethod.card?.expYear,
      bankName: stripeMethod.bankAccount?.bankName,
      bankLast4: stripeMethod.bankAccount?.last4,
    },
  });
  
  logger.info({
    paymentMethodId: paymentMethod.id,
    tenantId,
    type: stripeMethod.type,
  }, 'Payment method added');
  
  return {
    id: paymentMethod.id,
    tenantId: paymentMethod.tenantId,
    type: paymentMethod.type as 'CARD' | 'BANK_ACCOUNT',
    isDefault: paymentMethod.isDefault,
    card: stripeMethod.card,
    bankAccount: stripeMethod.bankAccount,
    stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
    createdAt: paymentMethod.createdAt,
  };
}

/**
 * List tenant payment methods
 */
export async function listPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
  const masterPrisma = getMasterPrisma();
  
  const methods = await masterPrisma.paymentMethod.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  
  return methods.map(m => ({
    id: m.id,
    tenantId: m.tenantId,
    type: m.type as 'CARD' | 'BANK_ACCOUNT',
    isDefault: m.isDefault,
    card: m.cardBrand ? {
      brand: m.cardBrand,
      last4: m.cardLast4!,
      expMonth: m.cardExpMonth!,
      expYear: m.cardExpYear!,
    } : undefined,
    bankAccount: m.bankName ? {
      bankName: m.bankName,
      last4: m.bankLast4!,
    } : undefined,
    stripePaymentMethodId: m.stripePaymentMethodId,
    createdAt: m.createdAt,
  }));
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(id: string): Promise<void> {
  const masterPrisma = getMasterPrisma();
  
  const method = await masterPrisma.paymentMethod.findUnique({
    where: { id },
  });
  
  if (!method) {
    throw new Error('Payment method not found');
  }
  
  // Detach from Stripe
  if (method.stripePaymentMethodId) {
    await stripeService.detachPaymentMethod(method.stripePaymentMethodId);
  }
  
  await masterPrisma.paymentMethod.delete({
    where: { id },
  });
  
  logger.info({
    paymentMethodId: id,
    tenantId: method.tenantId,
  }, 'Payment method removed');
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  tenantId: string,
  paymentMethodId: string
): Promise<PaymentMethod> {
  const masterPrisma = getMasterPrisma();
  
  // Unset current default
  await masterPrisma.paymentMethod.updateMany({
    where: { tenantId, isDefault: true },
    data: { isDefault: false },
  });
  
  // Set new default
  const method = await masterPrisma.paymentMethod.update({
    where: { id: paymentMethodId },
    data: { isDefault: true },
  });
  
  return {
    id: method.id,
    tenantId: method.tenantId,
    type: method.type as 'CARD' | 'BANK_ACCOUNT',
    isDefault: method.isDefault,
    card: method.cardBrand ? {
      brand: method.cardBrand,
      last4: method.cardLast4!,
      expMonth: method.cardExpMonth!,
      expYear: method.cardExpYear!,
    } : undefined,
    stripePaymentMethodId: method.stripePaymentMethodId,
    createdAt: method.createdAt,
  };
}
