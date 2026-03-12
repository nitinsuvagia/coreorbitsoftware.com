/**
 * Employee Import Routes - API endpoints for bulk employee import from Excel
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Document service URL for folder creation
const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007';

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

const router = Router();

/**
 * Get Prisma client from request
 */
function getPrismaFromRequest(req: Request): PrismaClient {
  const prisma = (req as any).prisma as PrismaClient;
  if (!prisma) {
    throw new Error('Prisma client not found on request');
  }
  return prisma;
}

// ============================================================================
// TEMPLATE COLUMN MAPPINGS (Universal - matches DB structure)
// ============================================================================

// Standard template columns that map directly to employee fields
const TEMPLATE_COLUMNS = [
  'employee_code',
  'first_name',
  'last_name',
  'email',
  'personal_email',
  'phone',
  'alternate_phone',
  'date_of_birth',
  'date_of_joining',
  'date_of_leaving',
  'gender',
  'marital_status',
  'blood_group',
  'nationality',
  'department',
  'designation',
  'employment_type',
  'status',
  'current_salary',
  'address',
  'city',
  'state',
  'country',
  'postal_code',
  'bank_name',
  'bank_branch',
  'account_number',
  'account_holder_name',
  'ifsc_code',
  'pan_number',
  'skype_id',
];

// Column name mappings - accepts both underscore and space variations
const COLUMN_MAPPINGS: Record<string, string> = {
  // Employee Code
  'employee_code': 'employee_code',
  'employee code': 'employee_code',
  
  // Name fields  
  'first_name': 'first_name',
  'first name': 'first_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  
  // Department & Designation
  'department': 'department',
  'designation': 'designation',
  
  // Dates
  'date_of_joining': 'date_of_joining',
  'date of joining': 'date_of_joining',
  'date_of_birth': 'date_of_birth',
  'date of birth': 'date_of_birth',
  'date_of_leaving': 'date_of_leaving',
  'date of leaving': 'date_of_leaving',
  
  // Contact
  'phone': 'phone',
  'alternate_phone': 'alternate_phone',
  'alternate phone': 'alternate_phone',
  
  // Email
  'email': 'email',
  'personal_email': 'personal_email',
  'personal email': 'personal_email',
  
  // Address
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'country': 'country',
  'postal_code': 'postal_code',
  'postal code': 'postal_code',
  
  // Salary
  'current_salary': 'current_salary',
  'current salary': 'current_salary',
  
  // Bank details
  'bank_name': 'bank_name',
  'bank name': 'bank_name',
  'bank_branch': 'bank_branch',
  'bank branch': 'bank_branch',
  'account_number': 'account_number',
  'account number': 'account_number',
  'account_holder_name': 'account_holder_name',
  'account holder name': 'account_holder_name',
  'ifsc_code': 'ifsc_code',
  'ifsc code': 'ifsc_code',
  
  // Other
  'pan_number': 'pan_number',
  'pan number': 'pan_number',
  'skype_id': 'skype_id',
  'skype id': 'skype_id',
  
  // Enums
  'gender': 'gender',
  'status': 'status',
  'employment_type': 'employment_type',
  'employment type': 'employment_type',
  'blood_group': 'blood_group',
  'blood group': 'blood_group',
  'marital_status': 'marital_status',
  'marital status': 'marital_status',
  'nationality': 'nationality',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize column name to lowercase with underscores
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Map Excel column to standard field
 */
function mapColumnToField(columnName: string): string | null {
  const normalized = normalizeColumnName(columnName);
  return COLUMN_MAPPINGS[normalized] || null;
}

/**
 * Parse Excel date to ISO string
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null;
  
  // If it's already a date string in YYYY-MM-DD format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // If it's a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel serial date - 25569 is the offset for 1970-01-01
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400 * 1000;
    const date = new Date(utc_value);
    return date.toISOString().split('T')[0];
  }
  
  // Try parsing various date formats
  if (typeof value === 'string') {
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // MM/DD/YYYY
    const mmddyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      // This is ambiguous, so let's try to parse it as a Date
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    // Try generic date parsing
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Parse gender value
 */
function parseGender(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toString().toLowerCase().trim();
  
  if (['m', 'male'].includes(normalized)) return 'MALE';
  if (['f', 'female'].includes(normalized)) return 'FEMALE';
  if (['other', 'o'].includes(normalized)) return 'OTHER';
  
  return null;
}

/**
 * Parse employment status
 */
function parseStatus(value: string | null, hasLeftDate: boolean): string {
  if (hasLeftDate) return 'TERMINATED';
  if (!value) return 'ACTIVE';
  
  const normalized = value.toString().toLowerCase().trim();
  
  if (['active', 'working'].includes(normalized)) return 'ACTIVE';
  if (['resigned', 'left'].includes(normalized)) return 'RESIGNED';
  if (['terminated', 'fired'].includes(normalized)) return 'TERMINATED';
  if (['on_leave', 'on leave'].includes(normalized)) return 'ON_LEAVE';
  if (['probation'].includes(normalized)) return 'PROBATION';
  if (['notice', 'notice_period', 'notice period'].includes(normalized)) return 'NOTICE_PERIOD';
  
  return 'ACTIVE';
}

/**
 * Parse employment type
 */
function parseEmploymentType(value: string | null): string {
  if (!value) return 'FULL_TIME';
  const normalized = value.toString().toLowerCase().trim().replace(/[- ]/g, '_');
  
  if (['full_time', 'fulltime', 'full time', 'permanent'].includes(normalized)) return 'FULL_TIME';
  if (['part_time', 'parttime', 'part time'].includes(normalized)) return 'PART_TIME';
  if (['contract', 'contractor'].includes(normalized)) return 'CONTRACT';
  if (['intern', 'internship'].includes(normalized)) return 'INTERN';
  if (['consultant', 'consulting'].includes(normalized)) return 'CONSULTANT';
  if (['temporary', 'temp'].includes(normalized)) return 'TEMPORARY';
  
  return 'FULL_TIME';
}

/**
 * Parse Excel file and extract employee data
 */
function parseEmployeeExcel(buffer: Buffer): { 
  success: boolean; 
  data: any[]; 
  columns: string[];
  mappedColumns: Record<string, string>;
  unmappedColumns: string[];
  errors: string[];
} {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get raw data with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    }) as any[][];
    
    if (rawData.length < 2) {
      return { 
        success: false, 
        data: [], 
        columns: [],
        mappedColumns: {},
        unmappedColumns: [],
        errors: ['File must contain header row and at least one data row'] 
      };
    }
    
    // Get headers from first row
    const headers = rawData[0].map((h: any) => String(h || '').trim());
    
    // Map columns
    const mappedColumns: Record<string, string> = {};
    const unmappedColumns: string[] = [];
    
    headers.forEach((header: string) => {
      const mapped = mapColumnToField(header);
      if (mapped) {
        mappedColumns[header] = mapped;
      } else if (header) {
        unmappedColumns.push(header);
      }
    });
    
    // Parse data rows
    const data: any[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every((cell: any) => !cell)) continue; // Skip empty rows
      
      const rowData: Record<string, any> = {};
      const customFields: Record<string, string> = {};
      
      headers.forEach((header: string, j: number) => {
        const value = row[j];
        const mappedField = mappedColumns[header];
        
        if (mappedField) {
          rowData[mappedField] = value;
        } else if (header && value !== undefined && value !== null && value !== '') {
          // Store as custom field
          customFields[header] = String(value);
        }
      });
      
      // Store custom fields
      rowData._customFields = customFields;
      rowData._rowNumber = i + 1;
      
      data.push(rowData);
    }
    
    return { 
      success: true, 
      data, 
      columns: headers.filter(h => h),
      mappedColumns,
      unmappedColumns,
      errors,
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      columns: [],
      mappedColumns: {},
      unmappedColumns: [],
      errors: [`Failed to parse Excel file: ${(error as Error).message}`] 
    };
  }
}

/**
 * Validate employee data before import
 */
async function validateEmployeeImportData(
  prisma: PrismaClient,
  data: any[]
): Promise<{
  valid: any[];
  invalid: { row: number; errors: string[]; data: any }[];
  duplicates: { row: number; email: string; data: any }[];
}> {
  const valid: any[] = [];
  const invalid: { row: number; errors: string[]; data: any }[] = [];
  const duplicates: { row: number; email: string; data: any }[] = [];
  
  // Get existing emails
  const existingEmployees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { email: true, employeeCode: true },
  });
  const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode.toLowerCase()));
  
  // Get departments and designations for lookup
  const departments = await prisma.department.findMany({ where: { deletedAt: null } });
  const designations = await prisma.designation.findMany();
  
  const deptMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]));
  
  // Create maps for designation lookup by both name and code
  const desigByName = new Map(designations.map(d => [d.name.toLowerCase(), { id: d.id, name: d.name }]));
  const desigByCode = new Map(designations.map(d => [d.code.toLowerCase(), { id: d.id, name: d.name }]));
  
  // Track emails in current import batch to detect duplicates
  const batchEmails = new Set<string>();
  
  for (const row of data) {
    const rowErrors: string[] = [];
    const rowNumber = row._rowNumber || 0;
    
    // Validate required fields
    if (!row.first_name) {
      rowErrors.push('First name is required');
    }
    
    if (!row.email) {
      rowErrors.push('Email is required');
    } else {
      const email = row.email.toLowerCase().trim();
      
      // Check if email already exists
      if (existingEmails.has(email)) {
        duplicates.push({ row: rowNumber, email, data: row });
        continue;
      }
      
      // Check for duplicate in current batch
      if (batchEmails.has(email)) {
        rowErrors.push(`Duplicate email in import file: ${email}`);
      } else {
        batchEmails.add(email);
      }
      
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push('Invalid email format');
      }
    }
    
    if (!row.date_of_joining) {
      rowErrors.push('Date of joining is required');
    } else {
      const joinDate = parseExcelDate(row.date_of_joining);
      if (!joinDate) {
        rowErrors.push('Invalid date of joining format');
      } else {
        row.date_of_joining = joinDate;
      }
    }
    
    // Parse optional dates
    if (row.date_of_birth) {
      const dob = parseExcelDate(row.date_of_birth);
      if (!dob) {
        rowErrors.push('Invalid date of birth format');
      } else {
        row.date_of_birth = dob;
      }
    }
    
    if (row.date_of_leaving) {
      const leftDate = parseExcelDate(row.date_of_leaving);
      if (!leftDate) {
        rowErrors.push('Invalid date of leaving format');
      } else {
        row.date_of_leaving = leftDate;
      }
    }
    
    // Look up department
    if (row.department) {
      const deptId = deptMap.get(row.department.toLowerCase().trim());
      if (deptId) {
        row.departmentId = deptId;
      } else {
        rowErrors.push(`Department not found: ${row.department}`);
      }
    }
    
    // Look up designation by name OR code
    if (row.designation) {
      const desigKey = row.designation.toLowerCase().trim();
      // Try matching by name first, then by code
      const desigMatch = desigByName.get(desigKey) || desigByCode.get(desigKey);
      if (desigMatch) {
        row.designationId = desigMatch.id;
        row.designation = desigMatch.name; // Use full designation name
      } else {
        rowErrors.push(`Designation not found: ${row.designation}`);
      }
    }
    
    // Parse enums
    row.gender = parseGender(row.gender);
    row.status = parseStatus(row.status, !!row.date_of_leaving);
    row.employment_type = parseEmploymentType(row.employment_type);
    
    if (rowErrors.length > 0) {
      invalid.push({ row: rowNumber, errors: rowErrors, data: row });
    } else {
      valid.push(row);
    }
  }
  
  return { valid, invalid, duplicates };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /employees/import/template
 * Download sample Excel template for employee import
 */
router.get('/template', async (req: Request, res: Response) => {
  try {
    // Create sample data based on universal DB structure
    const sampleData = [
      {
        'employee_code': 'EMP001',
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@company.com',
        'personal_email': 'john.doe@gmail.com',
        'phone': '+91 9876543210',
        'alternate_phone': '+91 9876543211',
        'date_of_birth': '1990-05-20',
        'date_of_joining': '2024-01-15',
        'date_of_leaving': '',
        'gender': 'MALE',
        'marital_status': 'SINGLE',
        'blood_group': 'O+',
        'nationality': 'Indian',
        'department': 'Engineering',
        'designation': 'Software Engineer',
        'employment_type': 'FULL_TIME',
        'status': 'ACTIVE',
        'current_salary': '50000',
        'address': '123 Main Street',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'country': 'India',
        'postal_code': '400001',
        'bank_name': 'HDFC Bank',
        'bank_branch': 'Main Branch',
        'account_number': '1234567890',
        'account_holder_name': 'John Doe',
        'ifsc_code': 'HDFC0001234',
        'pan_number': 'ABCDE1234F',
        'skype_id': 'john.doe.skype',
      },
      {
        'employee_code': 'EMP002',
        'first_name': 'Jane',
        'last_name': 'Smith',
        'email': 'jane.smith@company.com',
        'personal_email': 'jane.smith@gmail.com',
        'phone': '+91 9876543220',
        'alternate_phone': '',
        'date_of_birth': '1988-12-15',
        'date_of_joining': '2023-03-01',
        'date_of_leaving': '',
        'gender': 'FEMALE',
        'marital_status': 'MARRIED',
        'blood_group': 'A+',
        'nationality': 'Indian',
        'department': 'Human Resources',
        'designation': 'HR Manager',
        'employment_type': 'FULL_TIME',
        'status': 'ACTIVE',
        'current_salary': '75000',
        'address': '456 Oak Avenue',
        'city': 'Delhi',
        'state': 'Delhi',
        'country': 'India',
        'postal_code': '110001',
        'bank_name': 'ICICI Bank',
        'bank_branch': 'Branch Office',
        'account_number': '0987654321',
        'account_holder_name': 'Jane Smith',
        'ifsc_code': 'ICIC0005678',
        'pan_number': 'FGHIJ5678K',
        'skype_id': '',
      },
      {
        'employee_code': 'EMP003',
        'first_name': 'Robert',
        'last_name': 'Johnson',
        'email': 'robert.johnson@company.com',
        'personal_email': '',
        'phone': '+91 9876543230',
        'alternate_phone': '',
        'date_of_birth': '1985-08-25',
        'date_of_joining': '2022-06-10',
        'date_of_leaving': '2025-12-31',
        'gender': 'MALE',
        'marital_status': 'MARRIED',
        'blood_group': 'B+',
        'nationality': 'Indian',
        'department': 'Finance',
        'designation': 'Accountant',
        'employment_type': 'FULL_TIME',
        'status': 'TERMINATED',
        'current_salary': '60000',
        'address': '789 Pine Road',
        'city': 'Bangalore',
        'state': 'Karnataka',
        'country': 'India',
        'postal_code': '560001',
        'bank_name': 'State Bank',
        'bank_branch': 'City Branch',
        'account_number': '5678901234',
        'account_holder_name': 'Robert Johnson',
        'ifsc_code': 'SBIN0009012',
        'pan_number': 'KLMNO9012P',
        'skype_id': '',
      },
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // employee_code
      { wch: 15 }, // first_name
      { wch: 15 }, // last_name
      { wch: 30 }, // email
      { wch: 30 }, // personal_email
      { wch: 18 }, // phone
      { wch: 18 }, // alternate_phone
      { wch: 14 }, // date_of_birth
      { wch: 15 }, // date_of_joining
      { wch: 15 }, // date_of_leaving
      { wch: 10 }, // gender
      { wch: 14 }, // marital_status
      { wch: 12 }, // blood_group
      { wch: 12 }, // nationality
      { wch: 18 }, // department
      { wch: 20 }, // designation
      { wch: 15 }, // employment_type
      { wch: 12 }, // status
      { wch: 14 }, // current_salary
      { wch: 25 }, // address
      { wch: 15 }, // city
      { wch: 15 }, // state
      { wch: 12 }, // country
      { wch: 12 }, // postal_code
      { wch: 18 }, // bank_name
      { wch: 18 }, // bank_branch
      { wch: 18 }, // account_number
      { wch: 22 }, // account_holder_name
      { wch: 15 }, // ifsc_code
      { wch: 15 }, // pan_number
      { wch: 18 }, // skype_id
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    // Add instructions sheet
    const instructionsData = [
      { 'Field': 'employee_code', 'Required': 'Optional', 'Description': 'Unique employee code (auto-generated if not provided)' },
      { 'Field': 'first_name', 'Required': 'Required', 'Description': 'First name of employee' },
      { 'Field': 'last_name', 'Required': 'Optional', 'Description': 'Last name of employee' },
      { 'Field': 'email', 'Required': 'Required', 'Description': 'Work email address (must be unique)' },
      { 'Field': 'personal_email', 'Required': 'Optional', 'Description': 'Personal email address' },
      { 'Field': 'phone', 'Required': 'Optional', 'Description': 'Primary phone number' },
      { 'Field': 'alternate_phone', 'Required': 'Optional', 'Description': 'Secondary phone number' },
      { 'Field': 'date_of_birth', 'Required': 'Optional', 'Description': 'Date of Birth (YYYY-MM-DD format)' },
      { 'Field': 'date_of_joining', 'Required': 'Required', 'Description': 'Date of Joining (YYYY-MM-DD format)' },
      { 'Field': 'date_of_leaving', 'Required': 'Optional', 'Description': 'Date of leaving (YYYY-MM-DD, for ex-employees)' },
      { 'Field': 'gender', 'Required': 'Optional', 'Description': 'MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY' },
      { 'Field': 'marital_status', 'Required': 'Optional', 'Description': 'SINGLE, MARRIED, DIVORCED, WIDOWED, or OTHER' },
      { 'Field': 'blood_group', 'Required': 'Optional', 'Description': 'Blood group (e.g., A+, O-, B+)' },
      { 'Field': 'nationality', 'Required': 'Optional', 'Description': 'Nationality of employee' },
      { 'Field': 'department', 'Required': 'Optional', 'Description': 'Department name (must exist in system)' },
      { 'Field': 'designation', 'Required': 'Optional', 'Description': 'Designation/Job title (must exist in system)' },
      { 'Field': 'employment_type', 'Required': 'Optional', 'Description': 'FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT, or TEMPORARY' },
      { 'Field': 'status', 'Required': 'Optional', 'Description': 'ACTIVE, ON_LEAVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED, or RETIRED' },
      { 'Field': 'current_salary', 'Required': 'Optional', 'Description': 'Current salary (numeric)' },
      { 'Field': 'address', 'Required': 'Optional', 'Description': 'Street address' },
      { 'Field': 'city', 'Required': 'Optional', 'Description': 'City' },
      { 'Field': 'state', 'Required': 'Optional', 'Description': 'State/Province' },
      { 'Field': 'country', 'Required': 'Optional', 'Description': 'Country' },
      { 'Field': 'postal_code', 'Required': 'Optional', 'Description': 'Postal/ZIP code' },
      { 'Field': 'bank_name', 'Required': 'Optional', 'Description': 'Name of the bank' },
      { 'Field': 'bank_branch', 'Required': 'Optional', 'Description': 'Bank branch name' },
      { 'Field': 'account_number', 'Required': 'Optional', 'Description': 'Bank account number' },
      { 'Field': 'account_holder_name', 'Required': 'Optional', 'Description': 'Bank account holder name' },
      { 'Field': 'ifsc_code', 'Required': 'Optional', 'Description': 'Bank IFSC code' },
      { 'Field': 'pan_number', 'Required': 'Optional', 'Description': 'PAN card number (stored as custom field)' },
      { 'Field': 'skype_id', 'Required': 'Optional', 'Description': 'Skype username (stored as custom field)' },
      { 'Field': '', 'Required': '', 'Description': '' },
      { 'Field': 'NOTES:', 'Required': '', 'Description': '' },
      { 'Field': '1.', 'Required': '', 'Description': 'Any additional columns not listed above will be stored as custom fields (Other Information tab)' },
      { 'Field': '2.', 'Required': '', 'Description': 'Duplicate emails will be skipped automatically' },
      { 'Field': '3.', 'Required': '', 'Description': 'Department and Designation must exist in the system before import' },
      { 'Field': '4.', 'Required': '', 'Description': 'Date format: YYYY-MM-DD (e.g., 2024-01-15)' },
    ];
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 70 },
    ];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee-import-template.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to generate import template');
    res.status(500).json({ 
      success: false,
      error: { code: 'TEMPLATE_ERROR', message: 'Failed to generate template' } 
    });
  }
});

/**
 * POST /employees/import/preview
 * Preview Excel file without importing (validate and show data)
 */
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' } 
      });
    }

    const prisma = getPrismaFromRequest(req);

    // Parse Excel file
    const parsed = parseEmployeeExcel(req.file.buffer);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Failed to parse Excel file' },
        details: parsed.errors,
      });
    }

    // Validate data
    const validation = await validateEmployeeImportData(prisma, parsed.data);

    res.json({
      success: true,
      data: {
        total: parsed.data.length,
        valid: validation.valid.length,
        duplicates: validation.duplicates.length,
        invalid: validation.invalid.length,
        columns: parsed.columns,
        mappedColumns: parsed.mappedColumns,
        unmappedColumns: parsed.unmappedColumns,
        preview: validation.valid.slice(0, 20).map(row => ({
          ...row,
          _customFields: row._customFields,
        })),
        duplicateDetails: validation.duplicates.slice(0, 10),
        invalidDetails: validation.invalid.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Preview import failed');
    res.status(500).json({ 
      success: false,
      error: { code: 'PREVIEW_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * POST /employees/import/execute
 * Import employees from Excel file
 */
router.post('/execute', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' } 
      });
    }

    const prisma = getPrismaFromRequest(req);
    const userId = (req as any).userId;
    const tenantSlug = (req as any).tenantSlug;
    const tenantId = (req as any).tenantId;
    const skipDuplicates = req.body.skipDuplicates === 'true' || req.body.skipDuplicates === true;

    // Parse Excel file
    const parsed = parseEmployeeExcel(req.file.buffer);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Failed to parse Excel file' },
        details: parsed.errors,
      });
    }

    if (parsed.data.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'EMPTY_FILE', message: 'No valid employee data found in file' }
      });
    }

    // Validate data
    const validation = await validateEmployeeImportData(prisma, parsed.data);

    if (validation.valid.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'NO_VALID_DATA', message: 'No valid employees to import' },
        details: {
          duplicates: validation.duplicates.length,
          invalid: validation.invalid.length,
          invalidDetails: validation.invalid.slice(0, 5),
        },
      });
    }

    // Get employee code settings for generating codes
    const { getMasterPrisma } = await import('../utils/database');
    const masterPrisma = getMasterPrisma();
    
    // Get tenant ID from slug with subscription info
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { 
        settings: true,
        subscription: true,
      },
    });

    // ========== PLAN LIMIT CHECK ==========
    // Get max users from subscription
    const maxUsersAllowed = tenant?.subscription?.maxUsers || 50; // Default to 50 if not set
    
    // Count current active employees (not terminated/resigned/retired)
    const currentActiveCount = await prisma.employee.count({
      where: {
        deletedAt: null,
        status: { notIn: ['TERMINATED', 'RESIGNED', 'RETIRED'] },
      },
    });
    
    // Count how many employees in import are active (not terminated/resigned/retired)
    const exEmployeeStatuses = ['TERMINATED', 'RESIGNED', 'RETIRED'];
    const activeImportCount = validation.valid.filter(
      (row: any) => !exEmployeeStatuses.includes((row.status || 'ACTIVE').toUpperCase())
    ).length;
    
    // Check if importing would exceed the plan limit
    if (maxUsersAllowed > 0 && (currentActiveCount + activeImportCount) > maxUsersAllowed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `Cannot import ${activeImportCount} active employees. Your current plan allows ${maxUsersAllowed} employees and you already have ${currentActiveCount} active employees. Please upgrade your plan to add more employees.`,
        },
        details: {
          currentActive: currentActiveCount,
          importingActive: activeImportCount,
          maxAllowed: maxUsersAllowed,
          wouldExceedBy: (currentActiveCount + activeImportCount) - maxUsersAllowed,
        },
      });
    }

    const settings = tenant?.settings;
    const prefix = settings?.employeeCodePrefix || 'EMP';
    const includeYear = settings?.employeeCodeIncludeYear ?? false;
    const separator = settings?.employeeCodeSeparator || '';
    const yearSeqDigits = settings?.employeeCodeYearSeqDigits || 3;
    const totalSeqDigits = settings?.employeeCodeTotalSeqDigits || 5;
    const orgCurrency = settings?.currency || 'USD';

    // Track sequences for employee code generation
    const yearSequences: Map<string, number> = new Map();  // Per-year sequences (resets each year)
    let globalSequence: number | null = null;  // Total sequence (continuous)
    
    // Get next year-specific sequence (resets per year: 001, 002, ...)
    const getNextYearSequence = async (year: string): Promise<number> => {
      if (yearSequences.has(year)) {
        const seq = yearSequences.get(year)!;
        yearSequences.set(year, seq + 1);
        return seq;
      }
      
      // Find latest employee with code containing this year
      const employees = await prisma.employee.findMany({
        where: {
          deletedAt: null,
          employeeCode: { contains: year },
        },
        select: { employeeCode: true },
      });

      let maxYearSeq = 0;
      for (const emp of employees) {
        // Extract year sequence (digits after the year, before total seq)
        // Format: PREFIX YEAR YEARSEQ TOTALSEQ (e.g., SQT202000100001)
        const yearIndex = emp.employeeCode?.indexOf(year);
        if (yearIndex !== undefined && yearIndex >= 0 && emp.employeeCode) {
          const afterYear = emp.employeeCode.substring(yearIndex + 4); // After YYYY
          const yearSeqMatch = afterYear.match(/^(\d{1,5})/);
          if (yearSeqMatch) {
            const seq = parseInt(yearSeqMatch[1].substring(0, yearSeqDigits), 10);
            if (seq > maxYearSeq) maxYearSeq = seq;
          }
        }
      }
      
      const nextSeq = maxYearSeq + 1;
      yearSequences.set(year, nextSeq + 1);
      return nextSeq;
    };
    
    // Get next global/total sequence (continuous: 00001, 00002, ...)
    const getNextGlobalSequence = async (): Promise<number> => {
      if (globalSequence !== null) {
        return globalSequence++;
      }
      
      // Count all employees to get next sequence
      const count = await prisma.employee.count({
        where: { deletedAt: null },
      });
      
      globalSequence = count + 2; // +1 for next, +1 because we already return count+1
      return count + 1;
    };

    // Import employees
    const created: any[] = [];
    const failed: any[] = [];

    for (const row of validation.valid) {
      try {
        // Generate employee code if not provided
        let employeeCode = row.employee_code;
        if (!employeeCode) {
          // Get year from date of joining
          const joinYear = new Date(row.date_of_joining).getFullYear().toString();
          
          if (includeYear) {
            // Format: PREFIX + YEAR + YEAR_SEQ + TOTAL_SEQ (e.g., SQT202000100001)
            const yearSeq = await getNextYearSequence(joinYear);
            const totalSeq = await getNextGlobalSequence();
            const yearSeqStr = yearSeq.toString().padStart(yearSeqDigits, '0');
            const totalSeqStr = totalSeq.toString().padStart(totalSeqDigits, '0');
            employeeCode = `${prefix}${separator}${joinYear}${separator}${yearSeqStr}${separator}${totalSeqStr}`;
          } else {
            // Format: PREFIX + TOTAL_SEQ (e.g., EMP00001)
            const totalSeq = await getNextGlobalSequence();
            const totalSeqStr = totalSeq.toString().padStart(totalSeqDigits, '0');
            employeeCode = `${prefix}${separator}${totalSeqStr}`;
          }
        }

        // Prepare employee data
        const employeeData: any = {
          id: uuidv4(),
          employeeCode,
          firstName: row.first_name?.trim() || '',
          lastName: row.last_name?.trim() || '',
          displayName: `${row.first_name?.trim() || ''} ${row.last_name?.trim() || ''}`.trim(),
          email: row.email.toLowerCase().trim(),
          personalEmail: row.personal_email?.trim() || null,
          phone: row.phone?.trim() || null,
          mobile: row.alternate_phone?.trim() || null,
          dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
          gender: row.gender || null,
          joinDate: new Date(row.date_of_joining),
          exitDate: row.date_of_leaving ? new Date(row.date_of_leaving) : null,
          status: row.status || 'ACTIVE',
          employmentType: row.employment_type || 'FULL_TIME',
          departmentId: row.departmentId || null,
          designationId: row.designationId || null,
          baseSalary: row.current_salary ? parseFloat(row.current_salary) : null,
          currency: orgCurrency,
          addressLine1: row.address?.trim() || null,
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          country: row.country?.trim() || null,
          postalCode: row.postal_code?.trim() || null,
        };

        // Create employee
        const employee = await prisma.employee.create({
          data: employeeData,
        });

        // Create bank details if provided
        if (row.bank_name && row.account_number) {
          await prisma.bankDetail.create({
            data: {
              employeeId: employee.id,
              bankName: row.bank_name.trim(),
              branchName: row.bank_branch?.trim() || null,
              accountNumber: row.account_number.trim(),
              accountHolderName: row.account_holder_name?.trim() || null,
              ifscCode: row.ifsc_code?.trim() || null,
              isPrimary: true,
            },
          });
        }

        // Create custom fields for unmapped columns and special fields
        const customFieldsToCreate: { key: string; value: string }[] = [];
        
        // Add PAN number as custom field
        if (row.pan_number) {
          customFieldsToCreate.push({ key: 'PAN Number', value: row.pan_number.trim() });
        }
        
        // Add Skype ID as custom field
        if (row.skype_id) {
          customFieldsToCreate.push({ key: 'Skype ID', value: row.skype_id.trim() });
        }
        
        // Add all unmapped columns from Excel
        if (row._customFields && Object.keys(row._customFields).length > 0) {
          for (const [key, value] of Object.entries(row._customFields)) {
            if (value) {
              customFieldsToCreate.push({ key, value: String(value) });
            }
          }
        }

        // Insert custom fields
        if (customFieldsToCreate.length > 0) {
          await prisma.employeeCustomField.createMany({
            data: customFieldsToCreate.map(cf => ({
              employeeId: employee.id,
              fieldKey: cf.key,
              fieldValue: cf.value,
              source: 'import',
            })),
          });
        }

        // Create employee document folders (non-blocking)
        try {
          await axios.post(
            `${DOCUMENT_SERVICE_URL}/api/documents/folders/employee-direct/${employee.id}`,
            {},
            {
              headers: {
                'X-Tenant-Slug': tenantSlug,
                'X-Tenant-Id': tenantId || '',
                'X-User-Id': userId || 'system',
              },
              timeout: 10000, // 10 second timeout
            }
          );
          logger.info({ employeeId: employee.id }, 'Created document folders for imported employee');
        } catch (folderError) {
          // Log but don't fail the import - folders can be created later
          logger.warn({ 
            employeeId: employee.id, 
            error: (folderError as Error).message 
          }, 'Failed to create document folders during import (non-critical)');
        }

        created.push({
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.displayName,
          email: employee.email,
        });
      } catch (error) {
        failed.push({
          row: row._rowNumber,
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
          email: row.email,
          error: (error as Error).message,
        });
      }
    }

    logger.info({ 
      created: created.length, 
      failed: failed.length,
      duplicates: validation.duplicates.length,
    }, 'Employee import completed');

    res.status(201).json({
      success: true,
      message: `Successfully imported ${created.length} employees`,
      data: {
        created: created.length,
        failed: failed.length,
        duplicates: validation.duplicates.length,
        invalid: validation.invalid.length,
        createdEmployees: created.slice(0, 10),
        failedDetails: failed.slice(0, 10),
        duplicateDetails: validation.duplicates.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Import employees failed');
    res.status(500).json({ 
      success: false,
      error: { code: 'IMPORT_ERROR', message: (error as Error).message }
    });
  }
});

export default router;
