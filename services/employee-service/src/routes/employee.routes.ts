/**
 * Employee Routes - API endpoints for employee management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

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
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']).optional(),
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

async function generateEmployeeCode(prisma: any): Promise<string> {
  const prefix = 'EMP';
  const latest = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: prefix } },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  });

  let nextNumber = 1;
  if (latest?.employeeCode) {
    const numPart = latest.employeeCode.replace(prefix, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) nextNumber = parsed + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
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

    // Generate employee code
    const employeeCode = await generateEmployeeCode(prisma);

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
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
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
      where: { isActive: true, deletedAt: null },
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
          gender: data.gender,
          maritalStatus: data.maritalStatus,
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
