/**
 * Resignation Service - Handles resignation lifecycle and offboarding process
 * 
 * Flow:
 * 1. HR activates resignation for employee → status: ACTIVATED
 * 2. Employee submits resignation → status: SUBMITTED
 * 3. HR reviews, discusses with PM/TL, adds summary → status: UNDER_REVIEW
 * 4. HR approves with finalized last working day → status: APPROVED → Employee status: NOTICE_PERIOD
 * 5. On/before last working day, HR starts offboarding → checklist items created
 * 6. HR completes checklist → offboarding complete → Employee deactivated
 */

import { PrismaClient } from '.prisma/tenant-client';
import { getEventBus, SNS_TOPICS } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { createActivity } from './activity.service';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivateResignationInput {
  employeeId: string;
  activationNotes?: string;
}

export interface SubmitResignationInput {
  resignationReason: string;
  personalReason?: string;
  resignationLetterUrl?: string;
}

export interface ReviewResignationInput {
  hrSummary: string;
  hrNotes?: string;
  lastWorkingDate: string;
  noticePeriodDays?: number;
}

export interface WithdrawResignationInput {
  withdrawalReason: string;
}

export interface CancelResignationInput {
  cancellationReason: string;
}

export interface StartOffboardingInput {
  resignationId: string;
}

export interface UpdateChecklistItemInput {
  status: 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE';
  notes?: string;
}

export interface CompleteOffboardingInput {
  completionNotes?: string;
}

// ============================================================================
// RESIGNATION FUNCTIONS
// ============================================================================

/**
 * HR activates resignation for an employee
 */
export async function activateResignation(
  prisma: PrismaClient,
  input: ActivateResignationInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const { employeeId, activationNotes } = input;

  // Check employee exists and is active
  const employee = await (prisma as any).$queryRaw`
    SELECT e.id, e.display_name, e.status, e.employee_code, e.email,
           d.name as department_name, des.name as designation_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    WHERE e.id = ${employeeId} AND e.deleted_at IS NULL
  `;

  if (!employee || (employee as any[]).length === 0) {
    throw new Error('Employee not found');
  }

  const emp = (employee as any[])[0];

  if (['TERMINATED', 'RESIGNED', 'RETIRED'].includes(emp.status)) {
    throw new Error('Cannot activate resignation for an employee who has already exited');
  }

  // Check if there's already an active resignation
  const existingResignation = await (prisma as any).$queryRaw`
    SELECT id, status FROM resignations 
    WHERE employee_id = ${employeeId} 
      AND status NOT IN ('WITHDRAWN', 'CANCELLED')
    LIMIT 1
  `;

  if ((existingResignation as any[]).length > 0) {
    throw new Error('Employee already has an active resignation process');
  }

  // Create resignation record
  const result = await (prisma as any).$queryRaw`
    INSERT INTO resignations (employee_id, status, activated_by, activated_at, activation_notes)
    VALUES (${employeeId}, 'ACTIVATED', ${performedBy}, NOW(), ${activationNotes})
    RETURNING *
  `;

  const resignation = (result as any[])[0];

  // Log activity
  await createActivity(prisma, {
    type: 'EXIT',
    action: 'Resignation activated by HR',
    entityType: 'resignation',
    entityId: resignation.id,
    entityName: emp.display_name,
    userId: performedBy,
    details: `Resignation process activated for ${emp.display_name} (${emp.employee_code})`,
  });

  logger.info({ resignationId: resignation.id, employeeId }, 'Resignation activated');

  return {
    ...resignation,
    employee: emp,
  };
}

/**
 * Employee submits their resignation
 */
export async function submitResignation(
  prisma: PrismaClient,
  resignationId: string,
  input: SubmitResignationInput,
  performedBy: string
): Promise<any> {
  // Get resignation and verify status
  const resignations = await (prisma as any).$queryRaw`
    SELECT r.*, e.display_name, e.employee_code
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ${resignationId}
  `;

  if ((resignations as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  const resignation = (resignations as any[])[0];

  if (resignation.status !== 'ACTIVATED') {
    throw new Error(`Cannot submit resignation in ${resignation.status} status. Must be ACTIVATED.`);
  }

  // Update resignation with employee's submission
  const result = await (prisma as any).$queryRaw`
    UPDATE resignations SET
      status = 'SUBMITTED',
      submitted_at = NOW(),
      resignation_reason = ${input.resignationReason},
      personal_reason = ${input.personalReason || null},
      resignation_letter_url = ${input.resignationLetterUrl || null},
      updated_at = NOW()
    WHERE id = ${resignationId}
    RETURNING *
  `;

  await createActivity(prisma, {
    type: 'EXIT',
    action: 'Resignation submitted by employee',
    entityType: 'resignation',
    entityId: resignationId,
    entityName: resignation.display_name,
    userId: performedBy,
    details: `${resignation.display_name} submitted resignation. Reason: ${input.resignationReason}`,
  });

  logger.info({ resignationId }, 'Resignation submitted');

  return (result as any[])[0];
}

/**
 * HR reviews and finalizes resignation with last working day
 */
export async function approveResignation(
  prisma: PrismaClient,
  resignationId: string,
  input: ReviewResignationInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');

  // Get resignation
  const resignations = await (prisma as any).$queryRaw`
    SELECT r.*, e.display_name, e.employee_code, e.id as emp_id
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ${resignationId}
  `;

  if ((resignations as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  const resignation = (resignations as any[])[0];

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(resignation.status)) {
    throw new Error(`Cannot approve resignation in ${resignation.status} status. Must be SUBMITTED or UNDER_REVIEW.`);
  }

  const lastWorkingDate = new Date(input.lastWorkingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lastWorkingDate < today) {
    throw new Error('Last working date cannot be in the past');
  }

  // Calculate notice period days
  const noticePeriodDays = input.noticePeriodDays || 
    Math.ceil((lastWorkingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Transaction: update resignation + set employee to NOTICE_PERIOD
  await (prisma as any).$executeRaw`
    UPDATE resignations SET
      status = 'APPROVED',
      reviewed_by = ${performedBy},
      reviewed_at = NOW(),
      hr_summary = ${input.hrSummary},
      hr_notes = ${input.hrNotes || null},
      last_working_date = ${input.lastWorkingDate}::date,
      notice_period_days = ${noticePeriodDays},
      notice_period_start_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = ${resignationId}
  `;

  // Set employee status to NOTICE_PERIOD with exit date
  await (prisma as any).$executeRaw`
    UPDATE employees SET
      status = 'NOTICE_PERIOD',
      exit_date = ${input.lastWorkingDate}::date,
      exit_reason = 'Resignation',
      updated_at = NOW()
    WHERE id = ${resignation.emp_id}
  `;

  // Fetch updated resignation
  const updated = await (prisma as any).$queryRaw`
    SELECT * FROM resignations WHERE id = ${resignationId}
  `;

  // Emit event
  await eventBus.publishToTopic(
    SNS_TOPICS.EMPLOYEE_EVENTS,
    'employee.resignation.approved',
    {
      employeeId: resignation.emp_id,
      resignationId,
      lastWorkingDate: input.lastWorkingDate,
      noticePeriodDays,
      approvedBy: performedBy,
    },
    tenantContext
  );

  await createActivity(prisma, {
    type: 'EXIT',
    action: 'Resignation approved by HR',
    entityType: 'resignation',
    entityId: resignationId,
    entityName: resignation.display_name,
    userId: performedBy,
    details: `Resignation approved for ${resignation.display_name}. Last working day: ${input.lastWorkingDate}. Notice period: ${noticePeriodDays} days.`,
  });

  logger.info({ resignationId, lastWorkingDate: input.lastWorkingDate }, 'Resignation approved');

  return (updated as any[])[0];
}

/**
 * Employee withdraws their resignation (before approval)
 */
export async function withdrawResignation(
  prisma: PrismaClient,
  resignationId: string,
  input: WithdrawResignationInput,
  performedBy: string
): Promise<any> {
  const resignations = await (prisma as any).$queryRaw`
    SELECT r.*, e.display_name, e.employee_code
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ${resignationId}
  `;

  if ((resignations as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  const resignation = (resignations as any[])[0];

  if (!['ACTIVATED', 'SUBMITTED', 'UNDER_REVIEW'].includes(resignation.status)) {
    throw new Error('Can only withdraw resignation before it is approved');
  }

  const result = await (prisma as any).$queryRaw`
    UPDATE resignations SET
      status = 'WITHDRAWN',
      withdrawn_at = NOW(),
      withdrawal_reason = ${input.withdrawalReason},
      updated_at = NOW()
    WHERE id = ${resignationId}
    RETURNING *
  `;

  await createActivity(prisma, {
    type: 'EXIT',
    action: 'Resignation withdrawn',
    entityType: 'resignation',
    entityId: resignationId,
    entityName: resignation.display_name,
    userId: performedBy,
    details: `${resignation.display_name} withdrew resignation. Reason: ${input.withdrawalReason}`,
  });

  logger.info({ resignationId }, 'Resignation withdrawn');

  return (result as any[])[0];
}

/**
 * HR cancels a resignation
 */
export async function cancelResignation(
  prisma: PrismaClient,
  resignationId: string,
  input: CancelResignationInput,
  performedBy: string
): Promise<any> {
  const resignations = await (prisma as any).$queryRaw`
    SELECT r.*, e.display_name, e.employee_code, e.id as emp_id
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ${resignationId}
  `;

  if ((resignations as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  const resignation = (resignations as any[])[0];

  if (['CANCELLED', 'WITHDRAWN'].includes(resignation.status)) {
    throw new Error('Resignation is already cancelled or withdrawn');
  }

  // If resignation was approved, revert employee to ACTIVE
  if (resignation.status === 'APPROVED') {
    await (prisma as any).$executeRaw`
      UPDATE employees SET
        status = 'ACTIVE',
        exit_date = NULL,
        exit_reason = NULL,
        updated_at = NOW()
      WHERE id = ${resignation.emp_id}
    `;
  }

  const result = await (prisma as any).$queryRaw`
    UPDATE resignations SET
      status = 'CANCELLED',
      cancelled_at = NOW(),
      cancelled_by = ${performedBy},
      cancellation_reason = ${input.cancellationReason},
      updated_at = NOW()
    WHERE id = ${resignationId}
    RETURNING *
  `;

  await createActivity(prisma, {
    type: 'EXIT',
    action: 'Resignation cancelled by HR',
    entityType: 'resignation',
    entityId: resignationId,
    entityName: resignation.display_name,
    userId: performedBy,
    details: `Resignation cancelled for ${resignation.display_name}. Reason: ${input.cancellationReason}`,
  });

  logger.info({ resignationId }, 'Resignation cancelled');

  return (result as any[])[0];
}

/**
 * Get resignation by ID with employee details
 */
export async function getResignation(
  prisma: PrismaClient,
  resignationId: string
): Promise<any> {
  const results = await (prisma as any).$queryRaw`
    SELECT 
      r.*,
      e.display_name as employee_name,
      e.employee_code,
      e.email as employee_email,
      e.avatar as employee_avatar,
      e.status as employee_status,
      d.name as department_name,
      des.name as designation_name,
      activator.display_name as activated_by_name,
      reviewer.display_name as reviewed_by_name
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN employees activator ON r.activated_by = activator.id
    LEFT JOIN employees reviewer ON r.reviewed_by = reviewer.id
    WHERE r.id = ${resignationId}
  `;

  if ((results as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  return (results as any[])[0];
}

/**
 * Get resignation by employee ID (active only)
 */
export async function getResignationByEmployeeId(
  prisma: PrismaClient,
  employeeId: string
): Promise<any | null> {
  const results = await (prisma as any).$queryRaw`
    SELECT 
      r.*,
      e.display_name as employee_name,
      e.employee_code,
      e.email as employee_email,
      e.avatar as employee_avatar,
      e.status as employee_status,
      d.name as department_name,
      des.name as designation_name
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    WHERE r.employee_id = ${employeeId}
      AND r.status NOT IN ('WITHDRAWN', 'CANCELLED')
    ORDER BY r.created_at DESC
    LIMIT 1
  `;

  return (results as any[]).length > 0 ? (results as any[])[0] : null;
}

/**
 * List all resignations with filters
 */
export async function listResignations(
  prisma: PrismaClient,
  filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // Build parameterized query conditions
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`r.status = $${paramIndex}::"ResignationStatus"`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters.search) {
    conditions.push(`(e.display_name ILIKE $${paramIndex} OR e.employee_code ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) as total
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    ${whereClause}
  `, ...params);

  const total = parseInt((countResult as any[])[0]?.total || '0', 10);

  const items = await (prisma as any).$queryRawUnsafe(`
    SELECT 
      r.*,
      e.display_name as employee_name,
      e.employee_code,
      e.email as employee_email,
      e.avatar as employee_avatar,
      e.status as employee_status,
      d.name as department_name,
      des.name as designation_name,
      activator.display_name as activated_by_name,
      reviewer.display_name as reviewed_by_name
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN employees activator ON r.activated_by = activator.id
    LEFT JOIN employees reviewer ON r.reviewed_by = reviewer.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, ...params, limit, offset);

  return {
    items: items as any[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================================
// OFFBOARDING FUNCTIONS
// ============================================================================

/**
 * Start offboarding process for an employee
 */
export async function startOffboarding(
  prisma: PrismaClient,
  input: StartOffboardingInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');
  const { resignationId } = input;

  // Verify resignation is approved
  const resignations = await (prisma as any).$queryRaw`
    SELECT r.*, e.display_name, e.employee_code, e.id as emp_id, e.status as emp_status
    FROM resignations r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ${resignationId}
  `;

  if ((resignations as any[]).length === 0) {
    throw new Error('Resignation not found');
  }

  const resignation = (resignations as any[])[0];

  if (resignation.status !== 'APPROVED') {
    throw new Error('Can only start offboarding for approved resignations');
  }

  // Check if offboarding already exists
  const existingOffboarding = await (prisma as any).$queryRaw`
    SELECT id FROM offboardings 
    WHERE resignation_id = ${resignationId} AND status != 'COMPLETED'
    LIMIT 1
  `;

  if ((existingOffboarding as any[]).length > 0) {
    throw new Error('Offboarding is already in progress for this resignation');
  }

  // Create offboarding record
  const offboardingResult = await (prisma as any).$queryRaw`
    INSERT INTO offboardings (employee_id, resignation_id, status, started_by, started_at)
    VALUES (${resignation.emp_id}, ${resignationId}, 'IN_PROGRESS', ${performedBy}, NOW())
    RETURNING *
  `;

  const offboarding = (offboardingResult as any[])[0];

  // Copy default checklist template items
  await (prisma as any).$executeRaw`
    INSERT INTO offboarding_checklist_items (offboarding_id, category, title, description, sort_order, status)
    SELECT 
      ${offboarding.id},
      category,
      title,
      description,
      sort_order,
      'PENDING'
    FROM offboarding_checklist_templates
    WHERE is_active = true
    ORDER BY sort_order
  `;

  // Fetch checklist items
  const checklistItems = await (prisma as any).$queryRaw`
    SELECT * FROM offboarding_checklist_items 
    WHERE offboarding_id = ${offboarding.id}
    ORDER BY sort_order
  `;

  // Emit event
  await eventBus.publishToTopic(
    SNS_TOPICS.EMPLOYEE_EVENTS,
    'employee.offboarding.started',
    {
      employeeId: resignation.emp_id,
      resignationId,
      offboardingId: offboarding.id,
      startedBy: performedBy,
    },
    tenantContext
  );

  await createActivity(prisma, {
    type: 'OFFBOARDING',
    action: 'Offboarding process started',
    entityType: 'offboarding',
    entityId: offboarding.id,
    entityName: resignation.display_name,
    userId: performedBy,
    details: `Offboarding started for ${resignation.display_name} (${resignation.employee_code})`,
  });

  logger.info({ offboardingId: offboarding.id, resignationId }, 'Offboarding started');

  return {
    ...offboarding,
    checklistItems: checklistItems as any[],
    employee: {
      id: resignation.emp_id,
      displayName: resignation.display_name,
      employeeCode: resignation.employee_code,
    },
  };
}

/**
 * Get offboarding with checklist items
 */
export async function getOffboarding(
  prisma: PrismaClient,
  offboardingId: string
): Promise<any> {
  const results = await (prisma as any).$queryRaw`
    SELECT 
      o.*,
      e.display_name as employee_name,
      e.employee_code,
      e.email as employee_email,
      e.avatar as employee_avatar,
      e.status as employee_status,
      d.name as department_name,
      des.name as designation_name,
      r.last_working_date,
      r.resignation_reason,
      r.hr_summary,
      r.status as resignation_status,
      starter.display_name as started_by_name
    FROM offboardings o
    JOIN employees e ON o.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN resignations r ON o.resignation_id = r.id
    LEFT JOIN employees starter ON o.started_by = starter.id
    WHERE o.id = ${offboardingId}
  `;

  if ((results as any[]).length === 0) {
    throw new Error('Offboarding not found');
  }

  const offboarding = (results as any[])[0];

  // Get checklist items
  const checklistItems = await (prisma as any).$queryRaw`
    SELECT ci.*, completer.display_name as completed_by_name
    FROM offboarding_checklist_items ci
    LEFT JOIN employees completer ON ci.completed_by = completer.id
    WHERE ci.offboarding_id = ${offboardingId}
    ORDER BY ci.sort_order
  `;

  return {
    ...offboarding,
    checklistItems: checklistItems as any[],
  };
}

/**
 * Get offboarding by resignation ID
 */
export async function getOffboardingByResignationId(
  prisma: PrismaClient,
  resignationId: string
): Promise<any | null> {
  const results = await (prisma as any).$queryRaw`
    SELECT o.*, r.last_working_date, r.status as resignation_status
    FROM offboardings o
    LEFT JOIN resignations r ON o.resignation_id = r.id
    WHERE o.resignation_id = ${resignationId}
    ORDER BY o.created_at DESC
    LIMIT 1
  `;

  if ((results as any[]).length === 0) {
    return null;
  }

  const offboarding = (results as any[])[0];

  const checklistItems = await (prisma as any).$queryRaw`
    SELECT ci.*, completer.display_name as completed_by_name
    FROM offboarding_checklist_items ci
    LEFT JOIN employees completer ON ci.completed_by = completer.id
    WHERE ci.offboarding_id = ${offboarding.id}
    ORDER BY ci.sort_order
  `;

  return {
    ...offboarding,
    checklistItems: checklistItems as any[],
  };
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  prisma: PrismaClient,
  itemId: string,
  input: UpdateChecklistItemInput,
  performedBy: string
): Promise<any> {
  const completedBy = input.status === 'COMPLETED' ? performedBy : null;
  const completedAt = input.status === 'COMPLETED' ? 'NOW()' : 'NULL';

  const result = await (prisma as any).$queryRaw`
    UPDATE offboarding_checklist_items SET
      status = ${input.status}::"ChecklistItemStatus",
      completed_by = ${completedBy},
      completed_at = CASE WHEN ${input.status} = 'COMPLETED' THEN NOW() ELSE NULL END,
      notes = COALESCE(${input.notes || null}, notes),
      updated_at = NOW()
    WHERE id = ${itemId}
    RETURNING *
  `;

  if ((result as any[]).length === 0) {
    throw new Error('Checklist item not found');
  }

  return (result as any[])[0];
}

/**
 * Add custom checklist item to offboarding
 */
export async function addChecklistItem(
  prisma: PrismaClient,
  offboardingId: string,
  input: { category: string; title: string; description?: string },
  performedBy: string
): Promise<any> {
  // Get max sort_order
  const maxOrder = await (prisma as any).$queryRaw`
    SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
    FROM offboarding_checklist_items
    WHERE offboarding_id = ${offboardingId}
  `;

  const nextOrder = (maxOrder as any[])[0]?.next_order || 1;

  const result = await (prisma as any).$queryRaw`
    INSERT INTO offboarding_checklist_items (offboarding_id, category, title, description, sort_order, status)
    VALUES (${offboardingId}, ${input.category}, ${input.title}, ${input.description || null}, ${nextOrder}, 'PENDING')
    RETURNING *
  `;

  return (result as any[])[0];
}

/**
 * Complete offboarding process - deactivates user
 */
export async function completeOffboarding(
  prisma: PrismaClient,
  offboardingId: string,
  input: CompleteOffboardingInput,
  performedBy: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('employee-service');

  // Get offboarding details
  const offboardings = await (prisma as any).$queryRaw`
    SELECT o.*, e.id as emp_id, e.display_name, e.employee_code
    FROM offboardings o
    JOIN employees e ON o.employee_id = e.id
    WHERE o.id = ${offboardingId}
  `;

  if ((offboardings as any[]).length === 0) {
    throw new Error('Offboarding not found');
  }

  const offboarding = (offboardings as any[])[0];

  if (offboarding.status === 'COMPLETED') {
    throw new Error('Offboarding is already completed');
  }

  // Check if all required checklist items are completed
  const pendingItems = await (prisma as any).$queryRaw`
    SELECT COUNT(*) as pending_count
    FROM offboarding_checklist_items
    WHERE offboarding_id = ${offboardingId} AND status = 'PENDING'
  `;

  const pendingCount = parseInt((pendingItems as any[])[0]?.pending_count || '0', 10);
  if (pendingCount > 0) {
    throw new Error(`Cannot complete offboarding. ${pendingCount} checklist item(s) are still pending.`);
  }

  // Transaction: complete offboarding + update employee status + deactivate user
  // 1. Complete offboarding
  await (prisma as any).$executeRaw`
    UPDATE offboardings SET
      status = 'COMPLETED',
      completed_by = ${performedBy},
      completed_at = NOW(),
      completion_notes = ${input.completionNotes || null},
      updated_at = NOW()
    WHERE id = ${offboardingId}
  `;

  // 2. Update employee status to RESIGNED
  await (prisma as any).$executeRaw`
    UPDATE employees SET
      status = 'RESIGNED',
      updated_at = NOW()
    WHERE id = ${offboarding.emp_id}
  `;

  // 3. Deactivate user account
  await (prisma as any).$executeRaw`
    UPDATE users SET
      status = 'INACTIVE',
      updated_at = NOW()
    WHERE employee_id = ${offboarding.emp_id}
  `;

  // Emit event
  await eventBus.publishToTopic(
    SNS_TOPICS.EMPLOYEE_EVENTS,
    'employee.offboarded',
    {
      employeeId: offboarding.emp_id,
      offboardingId,
      reason: 'resignation',
      offboardedBy: performedBy,
    },
    tenantContext
  );

  await createActivity(prisma, {
    type: 'OFFBOARDING',
    action: 'Offboarding completed - User deactivated',
    entityType: 'offboarding',
    entityId: offboardingId,
    entityName: offboarding.display_name,
    userId: performedBy,
    details: `Offboarding completed for ${offboarding.display_name} (${offboarding.employee_code}). User account deactivated.`,
  });

  logger.info({ offboardingId, employeeId: offboarding.emp_id }, 'Offboarding completed, user deactivated');

  return { success: true };
}

/**
 * Get resignation statistics for dashboard
 */
export async function getResignationStats(
  prisma: PrismaClient
): Promise<any> {
  const stats = await (prisma as any).$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE status = 'ACTIVATED') as activated_count,
      COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_count,
      COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review_count,
      COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
      COUNT(*) FILTER (WHERE status IN ('ACTIVATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED')) as active_count,
      COUNT(*) FILTER (WHERE status = 'WITHDRAWN') as withdrawn_count,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_count,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month_count
    FROM resignations
  `;

  const offboardingStats = await (prisma as any).$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
      COUNT(*) FILTER (WHERE status = 'COMPLETED' AND completed_at >= date_trunc('month', CURRENT_DATE)) as completed_this_month
    FROM offboardings
  `;

  return {
    resignations: (stats as any[])[0],
    offboardings: (offboardingStats as any[])[0],
  };
}
