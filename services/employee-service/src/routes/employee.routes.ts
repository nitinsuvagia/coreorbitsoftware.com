/**
 * Employee Routes - API endpoints for employee management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';
import { getMasterPrisma } from '../utils/database';
import {
  createActivity,
  logEmployeeHired,
  logEmployeeExit,
} from '../services/activity.service';

/**
 * Get Prisma client from request (set by tenant context middleware)
 */
function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request. Ensure tenant context middleware is configured.');
  }
  return prisma;
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const bankDetailSchema = z.object({
  bankName: z.string().min(1),
  branchName: z.string().optional(),
  accountNumber: z.string().min(1),
  accountType: z.enum(['SAVINGS', 'CHECKING', 'CURRENT']).default('SAVINGS'),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  ifscCode: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const educationSchema = z.object({
  educationType: z.enum(['HIGH_SCHOOL', 'INTERMEDIATE', 'DIPLOMA', 'BACHELORS', 'MASTERS', 'DOCTORATE', 'POST_DOCTORATE', 'CERTIFICATION', 'VOCATIONAL', 'OTHER']),
  institutionName: z.string().min(1),
  institutionType: z.enum(['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'INSTITUTE', 'ONLINE', 'OTHER']).default('UNIVERSITY'),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  specialization: z.string().optional(),
  enrollmentYear: z.number().min(1950).max(2030),
  completionYear: z.number().min(1950).max(2030).optional().nullable(),
  isOngoing: z.boolean().default(false),
  gradeType: z.enum(['PERCENTAGE', 'CGPA_10', 'CGPA_4', 'GRADE_LETTER', 'DIVISION', 'PASS_FAIL']).default('PERCENTAGE'),
  grade: z.string().optional(),
  percentage: z.number().min(0).max(100).optional().nullable(),
  boardUniversity: z.string().optional(),
});

const createEmployeeSchema = z.object({
  // Personal Info
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().email(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().or(z.literal('')).transform(v => v || undefined),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']).optional().or(z.literal('')).transform(v => v || undefined),
  nationality: z.string().optional(),
  
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  
  // Employment
  departmentId: z.string().uuid(),
  designationId: z.string().uuid(),
  reportingManagerId: z.string().uuid().optional().or(z.literal('')),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'FREELANCE', 'CONSULTANT']).default('FULL_TIME'),
  joinDate: z.string(),
  probationEndDate: z.string().optional(),
  workLocation: z.string().optional(),
  workShift: z.string().optional(),
  timezone: z.string().default('UTC'),
  
  // Compensation
  baseSalary: z.number().optional(),
  currency: z.string().default('USD'),
  
  // Related records
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  bankDetails: z.array(bankDetailSchema).optional(),
  educations: z.array(educationSchema).optional(),
  
  metadata: z.record(z.unknown()).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const listSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const offboardSchema = z.object({
  exitDate: z.string(),
  exitReason: z.string(),
});

// ============================================================================
// HELPER
// ============================================================================

interface EmployeeCodeSettings {
  autoGenerate: boolean;
  prefix: string;
  yearSeqDigits: number;
  totalSeqDigits: number;
  separator: string;
}

async function getEmployeeCodeSettings(tenantSlug: string): Promise<EmployeeCodeSettings> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { settings: true },
  });
  
  const settings = tenant?.settings as any;
  
  return {
    autoGenerate: settings?.employeeCodeAutoGenerate ?? true,
    prefix: settings?.employeeCodePrefix || 'EMP',
    yearSeqDigits: settings?.employeeCodeYearSeqDigits ?? 5,
    totalSeqDigits: settings?.employeeCodeTotalSeqDigits ?? 5,
    separator: settings?.employeeCodeSeparator || '-',
  };
}

async function generateEmployeeCode(prisma: any, tenantSlug: string): Promise<string> {
  // Get tenant-specific settings
  const settings = await getEmployeeCodeSettings(tenantSlug);
  
  if (!settings.autoGenerate) {
    throw new Error('Employee code auto-generation is disabled. Please provide an employee code manually.');
  }
  
  const { prefix, separator, yearSeqDigits, totalSeqDigits } = settings;
  const currentYear = new Date().getFullYear();
  
  // Count employees created this year (for year sequence)
  const employeesThisYear = await prisma.employee.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  
  // Count total employees (for total sequence)
  const totalEmployees = await prisma.employee.count();
  
  // Generate code: {PREFIX}-{YYYY}-{YEAR_SEQ}-{TOTAL_SEQ}
  const yearSeq = String(employeesThisYear + 1).padStart(yearSeqDigits, '0');
  const totalSeq = String(totalEmployees + 1).padStart(totalSeqDigits, '0');
  
  return `${prefix}${separator}${currentYear}${separator}${yearSeq}${separator}${totalSeq}`;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /employees - Create new employee
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'X-Tenant-Slug header is required' },
      });
    }

    // Check email uniqueness
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: data.email },
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An employee with this email already exists' },
      });
    }

    // Generate employee code using tenant settings
    const employeeCode = await generateEmployeeCode(prisma, tenantSlug);

    // Create employee with related records
    const employee = await prisma.$transaction(async (tx: any) => {
      // Create the employee
      const emp = await tx.employee.create({
        data: {
          id: uuidv4(),
          employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          displayName: data.displayName || `${data.firstName} ${data.lastName}`,
          email: data.email,
          personalEmail: data.personalEmail || null,
          phone: data.phone || null,
          mobile: data.mobile || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          maritalStatus: data.maritalStatus || null,
          nationality: data.nationality || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          departmentId: data.departmentId,
          designationId: data.designationId,
          reportingManagerId: data.reportingManagerId || null,
          employmentType: data.employmentType,
          joinDate: new Date(data.joinDate),
          probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
          workLocation: data.workLocation || null,
          workShift: data.workShift || null,
          timezone: data.timezone,
          baseSalary: data.baseSalary || null,
          currency: data.currency,
          status: 'ACTIVE',
          metadata: data.metadata || {},
        },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      });

      // Create emergency contacts
      if (data.emergencyContacts && data.emergencyContacts.length > 0) {
        await tx.emergencyContact.createMany({
          data: data.emergencyContacts.map((contact: any, index: number) => ({
            id: uuidv4(),
            employeeId: emp.id,
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            alternatePhone: contact.alternatePhone || null,
            email: contact.email || null,
            address: contact.address || null,
            isPrimary: index === 0,
          })),
        });
      }

      // Create bank details
      if (data.bankDetails && data.bankDetails.length > 0) {
        await tx.bankDetail.createMany({
          data: data.bankDetails.map((bank: any, index: number) => ({
            id: uuidv4(),
            employeeId: emp.id,
            bankName: bank.bankName,
            branchName: bank.branchName || null,
            accountNumber: bank.accountNumber,
            accountType: bank.accountType,
            routingNumber: bank.routingNumber || null,
            swiftCode: bank.swiftCode || null,
            ifscCode: bank.ifscCode || null,
            isPrimary: index === 0,
          })),
        });
      }

      // Create education records
      if (data.educations && data.educations.length > 0) {
        await tx.employeeEducation.createMany({
          data: data.educations.map((edu: any) => ({
            id: uuidv4(),
            employeeId: emp.id,
            educationType: edu.educationType,
            institutionName: edu.institutionName,
            institutionType: edu.institutionType,
            degree: edu.degree || null,
            fieldOfStudy: edu.fieldOfStudy || null,
            specialization: edu.specialization || null,
            enrollmentYear: edu.enrollmentYear,
            completionYear: edu.completionYear || null,
            isOngoing: edu.isOngoing,
            gradeType: edu.gradeType,
            grade: edu.grade || null,
            percentage: edu.percentage || null,
            boardUniversity: edu.boardUniversity || null,
          })),
        });
      }

      return emp;
    });

    logger.info({ employeeId: employee.id, employeeCode }, 'Employee created');

    // Log activity for new hire
    await logEmployeeHired(
      prisma,
      employee.id,
      employee.displayName,
      (req as any).userId,
      undefined
    );

    res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create employee');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees - List employees
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = listSchema.parse(req.query);
    const prisma = getPrismaFromRequest(req);

    const page = filters.page;
    const limit = filters.limit;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.department) {
      where.department = { name: { contains: filters.department, mode: 'insensitive' } };
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.designationId) {
      where.designationId = filters.designationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ employeeCode: 'asc' }],
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to list employees');

    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/departments - List departments (for dropdown)
 */
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    const departments = await prisma.department.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = departments.map((d: any) => ({
      ...d,
      employeeCount: d._count.employees,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to list departments');
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/designations - List designations (for dropdown)
 */
router.get('/designations', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    const designations = await prisma.designation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        level: true,
      },
      orderBy: { level: 'asc' },
    });

    res.json({
      success: true,
      data: designations,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to list designations');
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/stats - Get employee statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    const [total, active, onLeave, byDepartment] = await Promise.all([
      prisma.employee.count({ where: { deletedAt: null } }),
      prisma.employee.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.employee.count({ where: { status: 'ON_LEAVE', deletedAt: null } }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        onLeave,
        byDepartment,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get stats');
    res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/hr-dashboard-stats - Get comprehensive HR dashboard statistics
 * Returns: totalEmployees, activeEmployees, trends, newHires, openPositions, candidates, turnover, etc.
 */
router.get('/hr-dashboard-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Start of current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    // Start of last month for comparison
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0);

    // ========== EMPLOYEE COUNTS ==========
    const [
      totalEmployees,
      activeEmployees,
      onProbation,
      contractExpiring,
      remoteWorkers,
      newHiresThisMonth,
      lastMonthHires,
      exitedThisMonth,
      exitedLastMonth,
      onboardingInProgress,
    ] = await Promise.all([
      // Total employees (not deleted)
      prisma.employee.count({ 
        where: { deletedAt: null } 
      }),
      // Active employees
      prisma.employee.count({ 
        where: { status: 'ACTIVE', deletedAt: null } 
      }),
      // Employees on probation (probationEndDate is in the future)
      prisma.employee.count({ 
        where: { 
          status: 'ACTIVE',
          deletedAt: null,
          probationEndDate: { gte: now },
        } 
      }),
      // Contracts expiring in next 30 days
      prisma.employee.count({ 
        where: { 
          status: 'ACTIVE',
          deletedAt: null,
          employmentType: 'CONTRACT',
          probationEndDate: { 
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          },
        } 
      }),
      // Remote workers (checking work location or a flag)
      prisma.employee.count({ 
        where: { 
          status: 'ACTIVE',
          deletedAt: null,
          workLocation: { contains: 'remote', mode: 'insensitive' },
        } 
      }),
      // New hires this month
      prisma.employee.count({ 
        where: { 
          deletedAt: null,
          joinDate: { gte: startOfMonth },
        } 
      }),
      // Last month hires (for trend calculation)
      prisma.employee.count({ 
        where: { 
          deletedAt: null,
          joinDate: { 
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        } 
      }),
      // Employees who exited this month
      prisma.employee.count({ 
        where: { 
          status: { in: ['TERMINATED', 'RESIGNED'] },
          updatedAt: { gte: startOfMonth },
        } 
      }),
      // Employees who exited last month
      prisma.employee.count({ 
        where: { 
          status: { in: ['TERMINATED', 'RESIGNED'] },
          updatedAt: { 
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        } 
      }),
      // Employees currently onboarding (joined in last 30 days)
      prisma.employee.count({ 
        where: { 
          status: 'ACTIVE',
          deletedAt: null,
          joinDate: { 
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          },
        } 
      }),
    ]);

    // ========== LIFECYCLE PIPELINE STATS ==========
    // Get offboarding (employees in notice period) and alumni (exited employees)
    const [offboarding, alumni] = await Promise.all([
      // Offboarding: employees with NOTICE_PERIOD status
      prisma.employee.count({
        where: {
          status: 'NOTICE_PERIOD',
          deletedAt: null,
        }
      }),
      // Alumni: all terminated/resigned/retired employees
      prisma.employee.count({
        where: {
          status: { in: ['TERMINATED', 'RESIGNED', 'RETIRED'] },
        }
      }),
    ]);

    // ========== RECRUITMENT STATS ==========
    // Get open job descriptions and candidates
    let openPositions = 0;
    let totalCandidates = 0;
    let offerAccepted = 0;
    
    try {
      // Count job descriptions with OPEN status (not sum of openings)
      openPositions = await prisma.jobDescription.count({
        where: { 
          status: 'OPEN',
          deletedAt: null,
        }
      });
      
      // Get candidates in active pipeline stages (excluding offer accepted)
      const candidates = await prisma.jobCandidate.count({
        where: { 
          status: { in: ['APPLIED', 'SCREENING', 'INTERVIEWED', 'SHORTLISTED', 'OFFERED'] }
        }
      });
      totalCandidates = candidates;
      
      // Get candidates who accepted offer (waiting for onboarding)
      // Use raw query to debug
      const rawResult = await prisma.$queryRaw<{count: bigint}[]>`
        SELECT COUNT(*) as count FROM job_candidates WHERE status = 'OFFER_ACCEPTED'
      `;
      offerAccepted = Number(rawResult[0]?.count || 0);
      logger.info({ offerAccepted, openPositions, totalCandidates, rawResult }, 'Recruitment stats loaded');
    } catch (err) {
      // Models might not exist or have different names
      logger.error({ error: (err as Error).message, stack: (err as Error).stack }, 'JobDescription/JobCandidate query failed, using defaults');
    }

    // ========== CALCULATE TRENDS & RATES ==========
    // Employee growth trend (percentage change from last month)
    const lastMonthTotal = totalEmployees - newHiresThisMonth + exitedThisMonth;
    const totalEmployeesTrend = lastMonthTotal > 0 
      ? parseFloat((((totalEmployees - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
      : 0;

    // New hires trend
    const newHiresTrend = lastMonthHires > 0 
      ? parseFloat((((newHiresThisMonth - lastMonthHires) / lastMonthHires) * 100).toFixed(1))
      : (newHiresThisMonth > 0 ? 100 : 0);

    // Turnover rate (monthly exits / avg employees * 100)
    const avgEmployees = (totalEmployees + lastMonthTotal) / 2;
    const turnoverRate = avgEmployees > 0 
      ? parseFloat(((exitedThisMonth / avgEmployees) * 100).toFixed(1))
      : 0;

    // Retention rate
    const retentionRate = parseFloat((100 - turnoverRate).toFixed(1));

    // ========== DEPARTMENT COUNT ==========
    const departmentCount = await prisma.department.count({
      where: { isActive: true }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalEmployees,
          totalEmployeesTrend,
          activeEmployees,
          newHiresThisMonth,
          newHiresTrend,
          onProbation,
          contractExpiring,
          remoteWorkers,
          departmentCount,
        },
        recruitment: {
          openPositions,
          totalCandidates,
        },
        onboarding: {
          onboardingInProgress,
        },
        exits: {
          exitedThisMonth,
          turnoverRate,
          retentionRate,
        },
        lifecycle: {
          candidates: totalCandidates,
          offerAccepted,
          onboarding: onboardingInProgress,
          active: activeEmployees,
          offboarding,
          alumni,
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get HR dashboard stats');
    res.status(500).json({
      success: false,
      error: { code: 'HR_STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/department-overview - Get department statistics for HR dashboard
 */
router.get('/department-overview', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

    // Get all active departments
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get employee counts per department
    const employeeCounts = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      _count: { id: true },
    });

    // Get open positions per department from job descriptions
    let openPositionsByDept: Record<string, number> = {};
    try {
      const jobDescriptions = await prisma.jobDescription.findMany({
        where: {
          status: 'OPEN',
          deletedAt: null,
        },
        select: {
          department: true,
        },
      });
      
      // Count job postings per department (not sum of openings)
      for (const job of jobDescriptions) {
        const deptName = job.department || 'Unknown';
        openPositionsByDept[deptName] = (openPositionsByDept[deptName] || 0) + 1;
      }
    } catch {
      logger.info('Could not fetch job descriptions for department overview');
    }

    // Get today's leave count per department
    let leavesByDept: Record<string, number> = {};
    try {
      const todaysLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: { in: ['approved', 'APPROVED'] },
          fromDate: { lte: todayEnd },
          toDate: { gte: todayStart },
        },
        select: {
          employee: {
            select: {
              departmentId: true,
            },
          },
        },
      });
      
      for (const leave of todaysLeaves) {
        if (leave.employee?.departmentId) {
          leavesByDept[leave.employee.departmentId] = (leavesByDept[leave.employee.departmentId] || 0) + 1;
        }
      }
    } catch {
      logger.info('Could not fetch leaves for department overview');
    }

    // Map department icons based on common names
    const departmentIcons: Record<string, string> = {
      'Engineering': 'Code',
      'Product': 'Package',
      'Design': 'Palette',
      'Quality Assurance': 'Shield',
      'Human Resources': 'Users',
      'Finance & Accounts': 'DollarSign',
      'Finance': 'DollarSign',
      'Operations': 'Settings',
      'Sales': 'TrendingUp',
      'Marketing': 'Megaphone',
      'Customer Success': 'Heart',
      'Legal & Compliance': 'Scale',
      'Legal': 'Scale',
      'IT': 'Monitor',
      'Support': 'Headphones',
      'Admin': 'Building2',
    };

    // Build department overview
    const departmentOverview = departments.map((dept) => {
      const empCount = employeeCounts.find(e => e.departmentId === dept.id);
      const headcount = empCount?._count.id || 0;
      const openPositions = openPositionsByDept[dept.name] || 0;
      const onLeaveToday = leavesByDept[dept.id] || 0;
      const icon = departmentIcons[dept.name] || 'Users';

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        icon,
        headcount,
        openPositions,
        onLeaveToday,
        activeProjects: 0, // Can be enhanced if project data is available
        avgPerformance: 0, // Can be enhanced if performance data is available
      };
    });

    res.json({
      success: true,
      data: departmentOverview,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get department overview');
    res.status(500).json({
      success: false,
      error: { code: 'DEPARTMENT_OVERVIEW_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/celebrations/today - Get today's birthdays and work anniversaries
 */
router.get('/celebrations/today', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();

    // Get all active employees with their DOB and join date
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        dateOfBirth: true,
        joinDate: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    // Filter for birthdays today (same month and day)
    const birthdaysToday = employees
      .filter((emp) => {
        if (!emp.dateOfBirth) return false;
        const dob = new Date(emp.dateOfBirth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
      })
      .map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        avatar: emp.avatar,
        department: emp.department?.name || 'Unknown',
      }));

    // Filter for work anniversaries today (same month and day, but not current year - so at least 1 year)
    const anniversariesToday = employees
      .filter((emp) => {
        if (!emp.joinDate) return false;
        const joinDate = new Date(emp.joinDate);
        const joinYear = joinDate.getFullYear();
        // Must be at least 1 year ago
        if (joinYear >= currentYear) return false;
        return joinDate.getMonth() + 1 === todayMonth && joinDate.getDate() === todayDay;
      })
      .map((emp) => {
        const joinDate = new Date(emp.joinDate!);
        const years = currentYear - joinDate.getFullYear();
        return {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          avatar: emp.avatar,
          years,
          department: emp.department?.name || 'Unknown',
        };
      });

    res.json({
      success: true,
      data: {
        birthdaysToday,
        anniversariesToday,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get celebrations');
    res.status(500).json({
      success: false,
      error: { code: 'CELEBRATIONS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * Helper function to format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// HR 360 DASHBOARD ENDPOINTS
// (Must be placed before /:id route to avoid being matched as employee ID)
// ============================================================================

/**
 * GET /employees/hr-alerts - Get HR alerts and notifications for dashboard
 */
router.get('/hr-alerts', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const alerts: any[] = [];

    // System-generated alerts based on current data

    // 1. Probation ending soon (within 7 days)
    const probationEnding = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        displayName: true,
        probationEndDate: true,
        department: { select: { name: true } },
      },
    });

    if (probationEnding.length > 0) {
      alerts.push({
        id: 'sys-probation-ending',
        type: 'warning',
        category: 'probation',
        title: 'Probation Reviews Due',
        description: `${probationEnding.length} employee(s) have probation ending within 7 days`,
        timestamp: 'System Alert',
        action: 'Review',
        actionUrl: '/employees?status=probation',
      });
    }

    // 2. Contracts expiring soon (within 30 days)
    const contractsExpiring = await prisma.employee.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        employmentType: 'CONTRACT',
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (contractsExpiring > 0) {
      alerts.push({
        id: 'sys-contracts-expiring',
        type: 'warning',
        category: 'contract',
        title: 'Contract Renewals Pending',
        description: `${contractsExpiring} contract(s) expiring within 30 days`,
        timestamp: 'System Alert',
        action: 'Review',
        actionUrl: '/employees?employmentType=CONTRACT',
      });
    }

    // 3. Pending leave requests
    try {
      const pendingLeaves = await prisma.leaveRequest.count({
        where: { status: 'pending' },
      });

      if (pendingLeaves > 0) {
        alerts.push({
          id: 'sys-pending-leaves',
          type: pendingLeaves > 10 ? 'warning' : 'info',
          category: 'leave',
          title: 'Pending Leave Requests',
          description: `${pendingLeaves} leave request(s) awaiting approval`,
          timestamp: 'System Alert',
          action: 'Review',
          actionUrl: '/leaves/pending',
        });
      }
    } catch (e) {
      // Leave requests might not exist
    }

    // 4. Expired employee documents
    try {
      const expiredDocs = await prisma.employeeDocument.count({
        where: {
          expiryDate: { lt: now },
          isVerified: true,
        },
      });

      if (expiredDocs > 0) {
        alerts.push({
          id: 'sys-expired-docs',
          type: 'critical',
          category: 'compliance',
          title: 'Document Compliance Issue',
          description: `${expiredDocs} employee document(s) have expired and need renewal`,
          timestamp: 'System Alert',
          action: 'View',
          actionUrl: '/documents?status=expired',
        });
      }
    } catch (e) {
      // Documents might not exist
    }

    // 5. Long-open job positions (over 30 days)
    try {
      const longOpenPositions = await prisma.jobDescription.count({
        where: {
          status: 'OPEN',
          deletedAt: null,
          postedDate: {
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (longOpenPositions > 0) {
        alerts.push({
          id: 'sys-long-open-positions',
          type: 'warning',
          category: 'recruitment',
          title: 'Slow Hiring Alert',
          description: `${longOpenPositions} position(s) open for over 30 days`,
          timestamp: 'System Alert',
          action: 'View Jobs',
          actionUrl: '/hr/jobs',
        });
      }
    } catch (e) {
      // Job descriptions might not exist
    }

    // 6. Get persisted HR alerts from database
    try {
      const persistedAlerts = await prisma.hRAlert.findMany({
        where: {
          isActive: true,
          isDismissed: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 10,
      });

      for (const alert of persistedAlerts) {
        alerts.push({
          id: alert.id,
          type: alert.type.toLowerCase(),
          category: alert.category,
          title: alert.title,
          description: alert.description,
          timestamp: formatRelativeTime(alert.createdAt),
          action: alert.actionLabel,
          actionUrl: alert.actionUrl,
        });
      }
    } catch (e) {
      // HRAlert table might not exist
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get HR alerts');
    res.status(500).json({
      success: false,
      error: { code: 'ALERTS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/probation-contract-status - Get probation and contract status
 */
router.get('/probation-contract-status', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();

    // Get counts
    const [onProbation, contractExpiring] = await Promise.all([
      prisma.employee.count({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          probationEndDate: { gte: now },
        },
      }),
      prisma.employee.count({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          employmentType: 'CONTRACT',
          probationEndDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get employees with probation ending soon (within 30 days)
    const probationEnding = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        displayName: true,
        probationEndDate: true,
        department: { select: { name: true } },
      },
      orderBy: { probationEndDate: 'asc' },
      take: 10,
    });

    // Get employees with contracts expiring soon (within 60 days)
    const contractsEnding = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        employmentType: 'CONTRACT',
        probationEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        displayName: true,
        probationEndDate: true,
        department: { select: { name: true } },
      },
      orderBy: { probationEndDate: 'asc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        onProbation,
        contractExpiring,
        probationEnding: probationEnding.map((emp) => ({
          id: emp.id,
          name: emp.displayName,
          department: emp.department?.name || 'N/A',
          endDate: emp.probationEndDate?.toISOString().split('T')[0],
          daysRemaining: emp.probationEndDate
            ? Math.ceil((emp.probationEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : 0,
        })),
        contractsEnding: contractsEnding.map((emp) => ({
          id: emp.id,
          name: emp.displayName,
          department: emp.department?.name || 'N/A',
          endDate: emp.probationEndDate?.toISOString().split('T')[0],
          daysRemaining: emp.probationEndDate
            ? Math.ceil((emp.probationEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : 0,
        })),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get probation/contract status');
    res.status(500).json({
      success: false,
      error: { code: 'STATUS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/leave-requests-summary - Get leave requests summary for HR dashboard
 */
router.get('/leave-requests-summary', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get leave request counts
    const [pending, approved, rejected] = await Promise.all([
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      prisma.leaveRequest.count({
        where: {
          status: 'approved',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          status: 'rejected',
          updatedAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Get leave balance summary by type
    const currentYear = now.getFullYear();
    const balanceSummary = await prisma.leaveBalance.groupBy({
      by: ['leaveTypeId'],
      where: { year: currentYear },
      _sum: {
        totalDays: true,
        usedDays: true,
        pendingDays: true,
      },
    });

    // Get leave type names
    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.name]));

    const leaveBalance: Record<string, number> = {};
    for (const balance of balanceSummary) {
      const typeName = leaveTypeMap.get(balance.leaveTypeId) || 'Other';
      const available = (Number(balance._sum.totalDays) || 0) - (Number(balance._sum.usedDays) || 0);
      leaveBalance[typeName.toLowerCase().replace(/\s+/g, '')] = Math.round(available);
    }

    // Get recent pending leave requests
    const recentPending = await prisma.leaveRequest.findMany({
      where: { status: 'pending' },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        leaveRequests: { pending, approved, rejected },
        leaveBalance,
        recentPending: recentPending.map((req) => ({
          id: req.id,
          employeeId: req.employeeId,
          employeeName: req.employee?.displayName || 'Unknown',
          department: req.employee?.department?.name || 'N/A',
          leaveType: req.leaveType?.name || 'N/A',
          fromDate: req.fromDate.toISOString().split('T')[0],
          toDate: req.toDate.toISOString().split('T')[0],
          totalDays: Number(req.totalDays),
          reason: req.reason,
          createdAt: req.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get leave requests summary');
    res.status(500).json({
      success: false,
      error: { code: 'LEAVE_SUMMARY_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/upcoming-events - Get upcoming events (birthdays, anniversaries, holidays)
 */
router.get('/upcoming-events', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get upcoming birthdays (next 30 days)
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        dateOfBirth: true,
        joinDate: true,
        avatar: true,
        department: { select: { name: true } },
      },
    });

    const currentYear = now.getFullYear();
    const birthdays: any[] = [];
    const anniversaries: any[] = [];

    for (const emp of employees) {
      // Check birthday
      if (emp.dateOfBirth) {
        const birthdayThisYear = new Date(
          currentYear,
          emp.dateOfBirth.getMonth(),
          emp.dateOfBirth.getDate()
        );
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // If birthday has passed this year (strictly before today), check next year
        if (birthdayThisYear.getTime() < now.getTime()) {
          birthdayThisYear.setFullYear(currentYear + 1);
        }
        const daysUntil = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysUntil >= 0 && daysUntil <= 30) {
          birthdays.push({
            id: `birthday-${emp.id}`,
            type: 'birthday',
            date: birthdayThisYear.toISOString(),
            employee: {
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              avatar: emp.avatar,
              department: { name: emp.department?.name || 'N/A' },
            },
            daysUntil,
          });
        }
      }

      // Check work anniversary
      if (emp.joinDate) {
        const joinDate = new Date(emp.joinDate);
        const anniversaryThisYear = new Date(
          currentYear,
          joinDate.getMonth(),
          joinDate.getDate()
        );
        anniversaryThisYear.setHours(0, 0, 0, 0);
        
        // If anniversary has passed this year (strictly before today), check next year
        if (anniversaryThisYear.getTime() < now.getTime()) {
          anniversaryThisYear.setFullYear(currentYear + 1);
        }
        const daysUntilAnniversary = Math.ceil(
          (anniversaryThisYear.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        const yearsAtCompany = anniversaryThisYear.getFullYear() - joinDate.getFullYear();
        if (daysUntilAnniversary >= 0 && daysUntilAnniversary <= 30 && yearsAtCompany > 0) {
          anniversaries.push({
            id: `anniversary-${emp.id}`,
            type: 'anniversary',
            date: anniversaryThisYear.toISOString(),
            years: yearsAtCompany,
            employee: {
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              avatar: emp.avatar,
              department: { name: emp.department?.name || 'N/A' },
            },
            daysUntil: daysUntilAnniversary,
          });
        }
      }
    }

    // Sort by days until
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);

    // Get upcoming holidays
    let holidays: any[] = [];
    try {
      const upcomingHolidays = await prisma.holiday.findMany({
        where: {
          date: {
            gte: now,
            lte: thirtyDaysLater,
          },
        },
        orderBy: { date: 'asc' },
        take: 10,
      });

      holidays = upcomingHolidays.map((h) => ({
        id: `holiday-${h.id}`,
        name: h.name,
        date: h.date.toISOString(),
        type: h.type.toLowerCase(),
        daysUntil: Math.ceil((h.date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      }));
    } catch (e) {
      // Holidays table might not exist
    }

    res.json({
      success: true,
      data: {
        birthdays: birthdays.slice(0, 10),
        workAnniversaries: anniversaries.slice(0, 10),
        holidays,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get upcoming events');
    res.status(500).json({
      success: false,
      error: { code: 'EVENTS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/recent-activities - Get recent HR activities
 */
router.get('/recent-activities', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const limit = parseInt(req.query.limit as string) || 20;

    let activities: any[] = [];

    // Try to get activities from Activity table
    try {
      const dbActivities = await prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      activities = dbActivities.map((a) => ({
        id: a.id,
        type: a.type.toLowerCase(),
        action: a.action,
        employee: a.entityName || 'Unknown',
        entityType: a.entityType,
        entityId: a.entityId,
        details: a.details,
        timestamp: formatRelativeTime(a.createdAt),
        createdAt: a.createdAt.toISOString(),
      }));
    } catch (e) {
      // Activity table might not exist, generate from other sources
    }

    // If no activities found, generate from recent data
    if (activities.length === 0) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Recent hires
      const recentHires = await prisma.employee.findMany({
        where: {
          joinDate: { gte: sevenDaysAgo },
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          joinDate: true,
        },
        orderBy: { joinDate: 'desc' },
        take: 5,
      });

      for (const hire of recentHires) {
        activities.push({
          id: `hire-${hire.id}`,
          type: 'hire',
          action: 'New hire onboarded',
          employee: hire.displayName,
          entityType: 'employee',
          entityId: hire.id,
          timestamp: formatRelativeTime(hire.joinDate),
          createdAt: hire.joinDate.toISOString(),
        });
      }

      // Recent leaves
      try {
        const recentLeaves = await prisma.leaveRequest.findMany({
          where: {
            status: 'approved',
            updatedAt: { gte: sevenDaysAgo },
          },
          include: {
            employee: { select: { displayName: true } },
            leaveType: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        });

        for (const leave of recentLeaves) {
          activities.push({
            id: `leave-${leave.id}`,
            type: 'leave',
            action: 'Leave request approved',
            employee: leave.employee?.displayName || 'Unknown',
            entityType: 'leave',
            entityId: leave.id,
            details: `${leave.leaveType?.name} for ${leave.totalDays} days`,
            timestamp: formatRelativeTime(leave.updatedAt),
            createdAt: leave.updatedAt.toISOString(),
          });
        }
      } catch (e) {
        // Leave requests might not exist
      }

      // Recent interviews
      try {
        const recentInterviews = await prisma.interview.findMany({
          where: {
            scheduledAt: { gte: sevenDaysAgo },
          },
          include: {
            candidate: {
              select: { firstName: true, lastName: true },
            },
            job: { select: { title: true } },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 5,
        });

        for (const interview of recentInterviews) {
          activities.push({
            id: `interview-${interview.id}`,
            type: 'interview',
            action: 'Interview scheduled',
            employee: `${interview.candidate?.firstName} ${interview.candidate?.lastName}`,
            entityType: 'interview',
            entityId: interview.id,
            details: `For ${interview.job?.title}`,
            timestamp: formatRelativeTime(interview.scheduledAt),
            createdAt: interview.scheduledAt.toISOString(),
          });
        }
      } catch (e) {
        // Interviews might not exist
      }

      // Sort by createdAt
      activities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    res.json({
      success: true,
      data: activities.slice(0, limit),
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get recent activities');
    res.status(500).json({
      success: false,
      error: { code: 'ACTIVITIES_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/recruitment-stats - Get recruitment statistics for HR dashboard
 */
router.get('/recruitment-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    
    // Get job and candidate counts
    let openPositions = 0;
    let totalCandidates = 0;
    let candidatesByStage: Record<string, number> = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
    };
    let offersExtended = 0;
    let offersAccepted = 0;
    let interviewsScheduled = 0;
    let hiredThisMonth = 0;
    let avgTimeToHire = 0;
    const urgentPositions: any[] = [];
    const hiringTrend: any[] = [];

    // Open positions
    const openJobs = await prisma.jobDescription.findMany({
      where: { status: 'OPEN', deletedAt: null },
      select: { 
        id: true, 
        title: true, 
        openings: true, 
        createdAt: true,
        department: true,
      },
    });
    openPositions = openJobs.length;

    // Candidates by stage
    const candidates = await prisma.jobCandidate.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    
    for (const c of candidates) {
      const status = c.status.toLowerCase();
      if (status === 'applied') candidatesByStage.applied = c._count.id;
      else if (status === 'screening') candidatesByStage.screening = c._count.id;
      else if (status === 'interviewed' || status === 'shortlisted') candidatesByStage.interview += c._count.id;
      else if (status === 'offered') { 
        candidatesByStage.offer = c._count.id; 
        offersExtended += c._count.id; 
      }
      else if (status === 'offer_accepted') { 
        offersAccepted = c._count.id; 
        offersExtended += c._count.id; // Offer was extended before being accepted
      }
      else if (status === 'hired') { candidatesByStage.hired = c._count.id; }
      totalCandidates += c._count.id;
    }

    // Interviews scheduled (future)
    const interviews = await prisma.interview.count({
      where: {
        scheduledAt: { gte: now },
        status: 'SCHEDULED',
      },
    });
    interviewsScheduled = interviews;

    // Hired this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    hiredThisMonth = await prisma.jobCandidate.count({
      where: {
        status: 'HIRED',
        updatedAt: { gte: startOfMonth },
      },
    });

    // Average time to hire (days from application to hired)
    const hiredCandidates = await prisma.jobCandidate.findMany({
      where: { status: 'HIRED' },
      select: { appliedAt: true, updatedAt: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
    
    if (hiredCandidates.length > 0) {
      const totalDays = hiredCandidates.reduce((sum, c) => {
        const days = Math.ceil((c.updatedAt.getTime() - c.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgTimeToHire = Math.round(totalDays / hiredCandidates.length);
    }

    // Urgent positions (open > 14 days)
    for (const job of openJobs) {
      const daysOpen = Math.ceil((now.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOpen > 14) {
        const applicants = await prisma.jobCandidate.count({ where: { jobId: job.id } });
        urgentPositions.push({
          title: job.title,
          department: job.department || 'Unknown',
          daysOpen,
          applicants,
          priority: daysOpen > 45 ? 'critical' : daysOpen > 30 ? 'high' : 'medium',
        });
      }
    }
    urgentPositions.sort((a, b) => b.daysOpen - a.daysOpen);

    // Hiring trend (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
      
      const hired = await prisma.jobCandidate.count({
        where: {
          status: 'HIRED',
          updatedAt: { gte: monthDate, lt: nextMonth },
        },
      });
      
      hiringTrend.push({ month: monthName, hired, target: 10 });
    }

    const offerAcceptanceRate = offersExtended > 0 
      ? parseFloat(((offersAccepted / offersExtended) * 100).toFixed(1)) 
      : 0;

    res.json({
      success: true,
      data: {
        openPositions,
        totalCandidates,
        interviewsScheduled,
        offersExtended,
        offerAcceptanceRate,
        avgTimeToHire,
        hiredThisMonth,
        recruitmentPipeline: candidatesByStage,
        urgentPositions: urgentPositions.slice(0, 5),
        hiringTrend,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Failed to get recruitment stats');
    res.status(500).json({
      success: false,
      error: { code: 'RECRUITMENT_STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/onboarding-stats - Get onboarding statistics for HR dashboard
 */
router.get('/onboarding-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // New hires this month
    const newHiresThisMonth = await prisma.employee.count({
      where: {
        joinDate: { gte: startOfMonth },
        deletedAt: null,
      },
    });

    // Employees joined in last 30 days (onboarding period)
    const recentJoiners = await prisma.employee.findMany({
      where: {
        joinDate: { gte: thirtyDaysAgo },
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        joinDate: true,
        avatar: true,
      },
      orderBy: { joinDate: 'desc' },
    });

    // Calculate onboarding progress (simulated based on days since join)
    const pendingTasks = recentJoiners.map((emp) => {
      const daysElapsed = Math.ceil((now.getTime() - emp.joinDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalTasks = 25;
      // Estimate completed tasks based on days (5 tasks per week)
      const tasksCompleted = Math.min(Math.floor((daysElapsed / 7) * 5), totalTasks);
      
      return {
        id: emp.id,
        employee: emp.displayName,
        joinDate: emp.joinDate.toISOString().split('T')[0],
        daysElapsed,
        tasksCompleted,
        totalTasks,
        avatar: emp.avatar,
      };
    }).filter(t => t.tasksCompleted < t.totalTasks);

    const onboardingInProgress = pendingTasks.length;
    const onboardingCompleted = recentJoiners.length - onboardingInProgress;
    
    // Completion rate
    const completionRate = recentJoiners.length > 0 
      ? parseFloat(((onboardingCompleted / recentJoiners.length) * 100).toFixed(1))
      : 0;

    // Avg completion time (days for completed onboardings)
    const avgCompletionTime = 14; // Default 2 weeks

    // Checklist summary
    const checklistSummary = {
      documentsSubmitted: Math.floor(recentJoiners.length * 0.85),
      itSetupComplete: Math.floor(recentJoiners.length * 0.9),
      trainingAssigned: recentJoiners.length,
      mentorAssigned: Math.floor(recentJoiners.length * 0.95),
      total: recentJoiners.length,
    };

    res.json({
      success: true,
      data: {
        newHiresThisMonth,
        onboardingInProgress,
        onboardingCompleted,
        avgCompletionTime,
        completionRate,
        pendingTasks: pendingTasks.slice(0, 5),
        checklistSummary,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get onboarding stats');
    res.status(500).json({
      success: false,
      error: { code: 'ONBOARDING_STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/exits-stats - Get exit/attrition statistics for HR dashboard
 */
router.get('/exits-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Get exit counts
    const [
      resignationsThisMonth,
      terminationsThisMonth,
      totalEmployees,
      exitsLastYear,
    ] = await Promise.all([
      prisma.employee.count({
        where: {
          status: 'RESIGNED',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.employee.count({
        where: {
          status: 'TERMINATED',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.employee.count({
        where: { deletedAt: null },
      }),
      prisma.employee.count({
        where: {
          status: { in: ['RESIGNED', 'TERMINATED', 'RETIRED'] },
          updatedAt: { gte: oneYearAgo },
        },
      }),
    ]);

    const totalExits = resignationsThisMonth + terminationsThisMonth;
    const turnoverRate = totalEmployees > 0 
      ? parseFloat(((totalExits / totalEmployees) * 100).toFixed(1))
      : 0;
    const retentionRate = parseFloat((100 - turnoverRate).toFixed(1));

    // Exit reasons (using status as proxy)
    const exitsByStatus = await prisma.employee.groupBy({
      by: ['status'],
      where: {
        status: { in: ['RESIGNED', 'TERMINATED', 'RETIRED'] },
        updatedAt: { gte: oneYearAgo },
      },
      _count: { id: true },
    });

    const topExitReasons = exitsByStatus.map((e) => ({
      reason: e.status === 'RESIGNED' ? 'Voluntary Resignation' 
            : e.status === 'TERMINATED' ? 'Termination' 
            : 'Retirement',
      count: e._count.id,
      percentage: exitsLastYear > 0 ? parseFloat(((e._count.id / exitsLastYear) * 100).toFixed(1)) : 0,
    }));

    // Exits by department
    const deptExits = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: {
        status: { in: ['RESIGNED', 'TERMINATED'] },
        updatedAt: { gte: oneYearAgo },
        departmentId: { not: null },
      },
      _count: { id: true },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

    const exitsByDepartment = deptExits.map((e) => ({
      department: deptMap[e.departmentId!] || 'Unknown',
      exits: e._count.id,
      rate: parseFloat(((e._count.id / Math.max(exitsLastYear, 1)) * 100).toFixed(1)),
    })).sort((a, b) => b.exits - a.exits).slice(0, 5);

    // Attrition trend (last 6 months)
    const attritionTrend: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthDate.toLocaleString('en-US', { month: 'short' });

      const [exits, hires] = await Promise.all([
        prisma.employee.count({
          where: {
            status: { in: ['RESIGNED', 'TERMINATED'] },
            updatedAt: { gte: monthDate, lt: nextMonth },
          },
        }),
        prisma.employee.count({
          where: {
            joinDate: { gte: monthDate, lt: nextMonth },
            deletedAt: null,
          },
        }),
      ]);

      attritionTrend.push({ month: monthName, exits, hires });
    }

    res.json({
      success: true,
      data: {
        resignationsThisMonth,
        terminationsThisMonth,
        totalExits,
        turnoverRate,
        retentionRate,
        avgNoticePeriod: 30, // Default
        exitInterviewsCompleted: Math.floor(totalExits * 0.7),
        exitInterviewsPending: Math.ceil(totalExits * 0.3),
        topExitReasons,
        exitsByDepartment,
        attritionTrend,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get exits stats');
    res.status(500).json({
      success: false,
      error: { code: 'EXITS_STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/diversity-stats - Get diversity statistics for HR dashboard
 */
router.get('/diversity-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();

    // Get active employees
    const employees = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE', 
        deletedAt: null,
      },
      select: {
        id: true,
        gender: true,
        dateOfBirth: true,
        joinDate: true,
        workLocation: true,
        departmentId: true,
      },
    });

    // Gender ratio
    const genderCounts = { male: 0, female: 0, other: 0 };
    for (const emp of employees) {
      const gender = emp.gender?.toLowerCase();
      if (gender === 'male' || gender === 'm') genderCounts.male++;
      else if (gender === 'female' || gender === 'f') genderCounts.female++;
      else genderCounts.other++;
    }

    // Age distribution
    const ageBuckets: Record<string, number> = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56+': 0,
    };

    for (const emp of employees) {
      if (emp.dateOfBirth) {
        const age = Math.floor((now.getTime() - emp.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 25) ageBuckets['18-25']++;
        else if (age <= 35) ageBuckets['26-35']++;
        else if (age <= 45) ageBuckets['36-45']++;
        else if (age <= 55) ageBuckets['46-55']++;
        else ageBuckets['56+']++;
      }
    }

    const ageDistribution = Object.entries(ageBuckets).map(([range, count]) => ({
      range,
      count,
      percentage: employees.length > 0 ? parseFloat(((count / employees.length) * 100).toFixed(1)) : 0,
    }));

    // Tenure distribution
    const tenureBuckets: Record<string, number> = {
      '< 1 year': 0,
      '1-2 years': 0,
      '2-5 years': 0,
      '5-10 years': 0,
      '> 10 years': 0,
    };

    for (const emp of employees) {
      if (emp.joinDate) {
        const years = (now.getTime() - emp.joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (years < 1) tenureBuckets['< 1 year']++;
        else if (years < 2) tenureBuckets['1-2 years']++;
        else if (years < 5) tenureBuckets['2-5 years']++;
        else if (years < 10) tenureBuckets['5-10 years']++;
        else tenureBuckets['> 10 years']++;
      }
    }

    const tenureDistribution = Object.entries(tenureBuckets).map(([range, count]) => ({
      range,
      count,
    }));

    // Location distribution
    const locationCounts: Record<string, number> = {};
    for (const emp of employees) {
      const loc = emp.workLocation || 'Office';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }

    const locationDistribution = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Department diversity
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const departmentDiversity = [];
    for (const dept of departments) {
      const deptEmployees = employees.filter(e => e.departmentId === dept.id);
      const males = deptEmployees.filter(e => e.gender?.toLowerCase() === 'male' || e.gender?.toLowerCase() === 'm').length;
      const females = deptEmployees.filter(e => e.gender?.toLowerCase() === 'female' || e.gender?.toLowerCase() === 'f').length;
      const total = deptEmployees.length;
      
      if (total > 0) {
        const malePercentage = Math.round((males / total) * 100);
        const femalePercentage = Math.round((females / total) * 100);
        // Diversity score: how close to 50/50
        const diversityScore = 100 - Math.abs(50 - femalePercentage);
        
        departmentDiversity.push({
          department: dept.name,
          diversityScore,
          malePercentage,
          femalePercentage,
        });
      }
    }

    res.json({
      success: true,
      data: {
        genderRatio: genderCounts,
        ageDistribution,
        tenureDistribution,
        locationDistribution,
        departmentDiversity: departmentDiversity.slice(0, 8),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get diversity stats');
    res.status(500).json({
      success: false,
      error: { code: 'DIVERSITY_STATS_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * GET /employees/compliance-stats - Get compliance statistics for HR dashboard
 */
router.get('/compliance-stats', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let documentsExpiring = 0;
    let documentsPending = 0;
    let complianceRate = 95;
    const expiringDocuments: any[] = [];
    const pendingVerifications: any[] = [];

    // Try to get document data
    try {
      // Documents expiring in next 30 days
      const expiring = await prisma.document.findMany({
        where: {
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
          deletedAt: null,
        },
        include: {
          employee: { select: { displayName: true } },
        },
        orderBy: { expiryDate: 'asc' },
        take: 10,
      });

      documentsExpiring = expiring.length;

      for (const doc of expiring) {
        const daysUntil = Math.ceil((doc.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expiringDocuments.push({
          id: doc.id,
          employeeName: doc.employee?.displayName || 'Unknown',
          documentType: doc.type,
          expiryDate: doc.expiryDate!.toISOString().split('T')[0],
          daysUntil,
          status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'expiring-soon' : 'valid',
        });
      }

      // Pending documents
      const pending = await prisma.document.count({
        where: {
          status: 'PENDING',
          deletedAt: null,
        },
      });
      documentsPending = pending;

      // Calculate compliance rate
      const totalDocs = await prisma.document.count({ where: { deletedAt: null } });
      const validDocs = await prisma.document.count({
        where: {
          deletedAt: null,
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
          status: { not: 'PENDING' },
        },
      });
      complianceRate = totalDocs > 0 ? parseFloat(((validDocs / totalDocs) * 100).toFixed(1)) : 95;

    } catch (e) {
      logger.warn({ error: (e as Error).message }, 'Document queries failed');
    }

    // Get probation employees as "pending verifications"
    try {
      const onProbation = await prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          probationEndDate: { gte: now },
        },
        select: {
          id: true,
          displayName: true,
          joinDate: true,
        },
        take: 5,
      });

      for (const emp of onProbation) {
        pendingVerifications.push({
          id: emp.id,
          employeeName: emp.displayName,
          verificationType: 'Background Check',
          submittedDate: emp.joinDate.toISOString().split('T')[0],
          status: 'in-progress',
        });
      }
    } catch (e) {
      // Ignore
    }

    res.json({
      success: true,
      data: {
        documentsExpiring,
        documentsPending,
        complianceRate,
        bgVerificationsPending: pendingVerifications.length,
        bgVerificationsCompleted: 0,
        mandatoryTrainingOverdue: 0,
        policiesAcknowledged: 0,
        totalPolicies: 0,
        expiringDocuments,
        pendingVerifications,
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get compliance stats');
    res.status(500).json({
      success: false,
      error: { code: 'COMPLIANCE_STATS_FAILED', message: (error as Error).message },
    });
  }
});

// ============================================================================
// TODAY'S SCHEDULE - Aggregated schedule from multiple sources
// ============================================================================

/**
 * GET /employees/today-schedule - Get today's schedule for the current user
 * Aggregates data from CalendarEvent, Interview, LeaveRequest, and Holidays
 */
router.get('/today-schedule', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Look up the user to get employeeId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true },
    });
    const employeeId = user?.employeeId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduleItems: Array<{
      id: string;
      type: 'meeting' | 'interview' | 'leave' | 'holiday' | 'task' | 'event';
      title: string;
      description?: string;
      startTime: Date;
      endTime?: Date;
      allDay?: boolean;
      location?: string;
      meetingUrl?: string;
      status?: string;
      priority?: string;
      metadata?: Record<string, any>;
    }> = [];

    // 1. Calendar Events - where user is creator or attendee
    try {
      const calendarEvents = await prisma.calendarEvent.findMany({
        where: {
          status: { not: 'CANCELLED' },
          OR: [
            { createdById: userId },
            { attendees: { some: { userId, status: { not: 'DECLINED' } } } },
          ],
          AND: [
            { startTime: { lt: tomorrow } },
            { endTime: { gte: today } },
          ],
        },
        include: {
          attendees: {
            include: {
              user: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      for (const event of calendarEvents) {
        scheduleItems.push({
          id: event.id,
          type: event.type === 'MEETING' ? 'meeting' : 'event',
          title: event.title,
          description: event.description || undefined,
          startTime: event.startTime,
          endTime: event.endTime,
          allDay: event.allDay,
          location: event.location || undefined,
          meetingUrl: event.meetingUrl || undefined,
          status: event.status,
          metadata: {
            attendees: event.attendees.map(a => ({
              name: `${a.user.firstName} ${a.user.lastName}`,
              avatar: a.user.avatar,
              status: a.status,
            })),
            color: event.color,
          },
        });
      }
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Failed to fetch calendar events');
    }

    // 2. Interviews - where user is a panelist
    if (employeeId) {
      try {
        const interviews = await prisma.interview.findMany({
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledAt: { gte: today, lt: tomorrow },
            panelists: { some: { employeeId } },
          },
          include: {
            candidate: {
              select: { firstName: true, lastName: true },
            },
            panelists: {
              include: {
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        });

        for (const interview of interviews) {
          const endTime = new Date(interview.scheduledAt);
          endTime.setMinutes(endTime.getMinutes() + (interview.duration || 60));

          scheduleItems.push({
            id: interview.id,
            type: 'interview',
            title: `Interview: ${interview.candidate.firstName} ${interview.candidate.lastName}`,
            description: `${interview.type} Round ${interview.roundNumber}`,
            startTime: interview.scheduledAt,
            endTime,
            location: interview.location || undefined,
            meetingUrl: interview.meetingLink || undefined,
            status: interview.status,
            metadata: {
              candidateName: `${interview.candidate.firstName} ${interview.candidate.lastName}`,
              interviewType: interview.type,
              round: interview.roundNumber,
              mode: interview.mode,
              panelists: interview.panelists.map(p => ({
                name: `${p.employee.firstName} ${p.employee.lastName}`,
                isLead: p.isLead,
              })),
            },
          });
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Failed to fetch interviews');
      }
    }

    // 3. Approved Leave Requests for today (informational)
    if (employeeId) {
      try {
        const leaveRequests = await prisma.leaveRequest.findMany({
          where: {
            employeeId,
            status: 'APPROVED',
            startDate: { lte: tomorrow },
            endDate: { gte: today },
          },
          include: {
            leaveType: { select: { name: true, color: true } },
          },
        });

        for (const leave of leaveRequests) {
          scheduleItems.push({
            id: leave.id,
            type: 'leave',
            title: `On Leave: ${leave.leaveType.name}`,
            description: leave.reason || undefined,
            startTime: leave.startDate,
            endTime: leave.endDate,
            allDay: true,
            status: 'APPROVED',
            metadata: {
              leaveType: leave.leaveType.name,
              color: leave.leaveType.color,
              isHalfDay: leave.isHalfDay,
              halfDayType: leave.halfDayType,
            },
          });
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Failed to fetch leave requests');
      }
    }

    // 4. Holidays for today
    try {
      const holidays = await prisma.holiday.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          isActive: true,
        },
      });

      for (const holiday of holidays) {
        scheduleItems.push({
          id: holiday.id,
          type: 'holiday',
          title: holiday.name,
          description: holiday.description || undefined,
          startTime: holiday.date,
          allDay: true,
          status: holiday.type,
          metadata: {
            holidayType: holiday.type,
            isOptional: holiday.isOptional,
          },
        });
      }
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Failed to fetch holidays');
    }

    // Sort all items by start time
    scheduleItems.sort((a, b) => {
      // All-day events come first
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        items: scheduleItems,
        summary: {
          total: scheduleItems.length,
          meetings: scheduleItems.filter(i => i.type === 'meeting').length,
          interviews: scheduleItems.filter(i => i.type === 'interview').length,
          events: scheduleItems.filter(i => i.type === 'event').length,
          leaves: scheduleItems.filter(i => i.type === 'leave').length,
          holidays: scheduleItems.filter(i => i.type === 'holiday').length,
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch today schedule');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

// ============================================================================
// USER TODOS - Personal task management
// ============================================================================

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  reminder: z.string().optional(),
});

const updateTodoSchema = createTodoSchema.partial().extend({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  isCompleted: z.boolean().optional(),
  order: z.number().optional(),
});

/**
 * GET /employees/todos - Get all todos for the current user
 */
router.get('/todos', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { status, priority, category, completed, search, page = '1', pageSize = '50' } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status as string;
    }
    if (priority) {
      where.priority = priority as string;
    }
    if (category) {
      where.category = category as string;
    }
    if (completed !== undefined) {
      where.isCompleted = completed === 'true';
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [todos, total] = await Promise.all([
      prisma.userTodo.findMany({
        where,
        orderBy: [
          { isCompleted: 'asc' },
          { order: 'asc' },
          { dueDate: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        take: parseInt(pageSize as string),
      }),
      prisma.userTodo.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        todos,
        pagination: {
          total,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          totalPages: Math.ceil(total / parseInt(pageSize as string)),
        },
        summary: {
          total,
          pending: await prisma.userTodo.count({ where: { userId, isCompleted: false } }),
          completed: await prisma.userTodo.count({ where: { userId, isCompleted: true } }),
          overdue: await prisma.userTodo.count({
            where: {
              userId,
              isCompleted: false,
              dueDate: { lt: new Date() },
            },
          }),
        },
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to fetch todos');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * POST /employees/todos - Create a new todo
 */
router.post('/todos', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const data = createTodoSchema.parse(req.body);

    const todo = await prisma.userTodo.create({
      data: {
        id: uuidv4(),
        userId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime ? new Date(data.dueTime) : null,
        priority: data.priority,
        category: data.category,
        tags: data.tags || [],
        reminder: data.reminder ? new Date(data.reminder) : null,
      },
    });

    logger.info({ todoId: todo.id, userId }, 'Todo created');

    res.status(201).json({
      success: true,
      data: todo,
      message: 'Todo created successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to create todo');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * PUT /employees/todos/:id - Update a todo
 */
router.put('/todos/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const todoId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Check ownership
    const existing = await prisma.userTodo.findFirst({
      where: { id: todoId, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Todo not found' },
      });
    }

    const data = updateTodoSchema.parse(req.body);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.dueTime !== undefined) updateData.dueTime = data.dueTime ? new Date(data.dueTime) : null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.reminder !== undefined) updateData.reminder = data.reminder ? new Date(data.reminder) : null;
    if (data.order !== undefined) updateData.order = data.order;

    // Handle completion
    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted;
      updateData.completedAt = data.isCompleted ? new Date() : null;
      updateData.status = data.isCompleted ? 'COMPLETED' : 'PENDING';
    }

    const todo = await prisma.userTodo.update({
      where: { id: todoId },
      data: updateData,
    });

    logger.info({ todoId: todo.id, userId }, 'Todo updated');

    res.json({
      success: true,
      data: todo,
      message: 'Todo updated successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update todo');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /employees/todos/:id - Delete a todo
 */
router.delete('/todos/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const todoId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Check ownership
    const existing = await prisma.userTodo.findFirst({
      where: { id: todoId, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Todo not found' },
      });
    }

    await prisma.userTodo.delete({
      where: { id: todoId },
    });

    logger.info({ todoId, userId }, 'Todo deleted');

    res.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete todo');
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * PATCH /employees/todos/:id/toggle - Toggle todo completion
 */
router.patch('/todos/:id/toggle', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const todoId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Check ownership
    const existing = await prisma.userTodo.findFirst({
      where: { id: todoId, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Todo not found' },
      });
    }

    const isCompleted = !existing.isCompleted;

    const todo = await prisma.userTodo.update({
      where: { id: todoId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        status: isCompleted ? 'COMPLETED' : 'PENDING',
      },
    });

    logger.info({ todoId: todo.id, userId, isCompleted }, 'Todo toggled');

    res.json({
      success: true,
      data: todo,
      message: isCompleted ? 'Todo completed' : 'Todo reopened',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to toggle todo');
    res.status(500).json({
      success: false,
      error: { code: 'TOGGLE_FAILED', message: (error as Error).message },
    });
  }
});

// ============================================================================
// EMPLOYEE ROUTES (/:id pattern - must come after all named routes)
// ============================================================================

/**
 * GET /employees/:id - Get employee by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, level: true } },
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        emergencyContacts: true,
        bankDetails: true,
        educations: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get employee');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * PUT /employees/:id - Update employee
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateEmployeeSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);

    const existing = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    const employee = await prisma.$transaction(async (tx: any) => {
      // Update main employee record
      const emp = await tx.employee.update({
        where: { id: req.params.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          displayName: data.displayName,
          personalEmail: data.personalEmail || null,
          phone: data.phone,
          mobile: data.mobile,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender || null,
          maritalStatus: data.maritalStatus || null,
          nationality: data.nationality,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          departmentId: data.departmentId,
          designationId: data.designationId,
          reportingManagerId: data.reportingManagerId || null,
          employmentType: data.employmentType,
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
          probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
          workLocation: data.workLocation,
          workShift: data.workShift,
          timezone: data.timezone,
          baseSalary: data.baseSalary,
          currency: data.currency,
          metadata: data.metadata,
        },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      });

      // Update emergency contacts (replace all)
      if (data.emergencyContacts) {
        await tx.emergencyContact.deleteMany({ where: { employeeId: req.params.id } });
        if (data.emergencyContacts.length > 0) {
          await tx.emergencyContact.createMany({
            data: data.emergencyContacts.map((contact: any, index: number) => ({
              id: uuidv4(),
              employeeId: req.params.id,
              name: contact.name,
              relationship: contact.relationship,
              phone: contact.phone,
              alternatePhone: contact.alternatePhone || null,
              email: contact.email || null,
              address: contact.address || null,
              isPrimary: index === 0,
            })),
          });
        }
      }

      // Update bank details (replace all)
      if (data.bankDetails) {
        await tx.bankDetail.deleteMany({ where: { employeeId: req.params.id } });
        if (data.bankDetails.length > 0) {
          await tx.bankDetail.createMany({
            data: data.bankDetails.map((bank: any, index: number) => ({
              id: uuidv4(),
              employeeId: req.params.id,
              bankName: bank.bankName,
              branchName: bank.branchName || null,
              accountNumber: bank.accountNumber,
              accountType: bank.accountType,
              routingNumber: bank.routingNumber || null,
              swiftCode: bank.swiftCode || null,
              ifscCode: bank.ifscCode || null,
              isPrimary: index === 0,
            })),
          });
        }
      }

      // Update education records (replace all)
      if (data.educations) {
        await tx.employeeEducation.deleteMany({ where: { employeeId: req.params.id } });
        if (data.educations.length > 0) {
          await tx.employeeEducation.createMany({
            data: data.educations.map((edu: any) => ({
              id: uuidv4(),
              employeeId: req.params.id,
              educationType: edu.educationType,
              institutionName: edu.institutionName,
              institutionType: edu.institutionType,
              degree: edu.degree || null,
              fieldOfStudy: edu.fieldOfStudy || null,
              specialization: edu.specialization || null,
              enrollmentYear: edu.enrollmentYear,
              completionYear: edu.completionYear || null,
              isOngoing: edu.isOngoing,
              gradeType: edu.gradeType,
              grade: edu.grade || null,
              percentage: edu.percentage || null,
              boardUniversity: edu.boardUniversity || null,
            })),
          });
        }
      }

      return emp;
    });

    logger.info({ employeeId: employee.id }, 'Employee updated');

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to update employee');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * POST /employees/:id/offboard - Offboard employee
 */
router.post('/:id/offboard', async (req: Request, res: Response) => {
  try {
    const data = offboardSchema.parse(req.body);
    const prisma = getPrismaFromRequest(req);

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        status: 'RESIGNED',
        exitDate: new Date(data.exitDate),
        exitReason: data.exitReason,
      },
    });

    logger.info({ employeeId: employee.id }, 'Employee offboarded');

    // Log activity for employee exit
    await logEmployeeExit(
      prisma,
      employee.id,
      employee.displayName,
      data.exitReason,
      (req as any).userId,
      undefined
    );

    res.json({
      success: true,
      data: employee,
      message: 'Employee offboarded successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to offboard employee');

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'OFFBOARD_FAILED', message: (error as Error).message },
    });
  }
});

/**
 * DELETE /employees/:id - Soft delete employee
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaFromRequest(req);

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    logger.info({ employeeId: employee.id }, 'Employee deleted');

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to delete employee');

    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    });
  }
});

export default router;
