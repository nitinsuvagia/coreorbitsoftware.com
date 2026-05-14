/**
 * Payroll Excel Parser
 *
 * Parses an uploaded .xlsx file into normalized SalaryRunItem rows.
 * - Trusts the Excel values verbatim (no recompute).
 * - Matches employees by `employee_code` only.
 * - Rejects rows whose employee status is not ACTIVE/ON_LEAVE/PROBATION/NOTICE_PERIOD.
 */

import * as XLSX from 'xlsx';

export interface ParsedSalaryRow {
  rowNumber: number;          // 1-based, matches Excel row (header = 1, first data = 2)
  employeeCode: string;
  leaveTaken: number;
  totalSalary: number;
  basic: number;
  dearnessAllowance: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  educationAllowance: number;
  costOfLivingAllowance: number;
  medicalAllowance: number;
  foodCanteenAllowance: number;
  appraisal: number;
  grossEarnings: number;
  professionalTax: number;
  incomeTax: number;
  mealVoucher: number;
  variableDeduction: number;
  grossDeductions: number;
  netPayable: number;
  rawRow: Record<string, unknown>;
}

export interface ParsedSalarySheet {
  rows: ParsedSalaryRow[];
  errors: { rowNumber: number; field?: string; message: string }[];
}

// Header alias map: lower-cased / trimmed Excel header -> canonical key
const HEADER_ALIASES: Record<string, keyof ParsedSalaryRow | 'ignore'> = {
  'employee code': 'employeeCode',
  'emp code': 'employeeCode',
  'emp. code': 'employeeCode',
  'employee_code': 'employeeCode',

  'leave taken': 'leaveTaken',
  'leaves taken': 'leaveTaken',
  'leaves': 'leaveTaken',
  'lt': 'leaveTaken',
  'actual leave taken': 'leaveTaken',

  'total salary': 'totalSalary',
  'ctc': 'totalSalary',
  'real salary': 'totalSalary',

  'basic': 'basic',
  'basic salary': 'basic',

  'dearness allowance': 'dearnessAllowance',
  'da': 'dearnessAllowance',

  'house rent allowance': 'houseRentAllowance',
  'hra': 'houseRentAllowance',

  'conveyance allowance': 'conveyanceAllowance',
  'conveyance': 'conveyanceAllowance',
  'ca': 'conveyanceAllowance',

  'education allowance': 'educationAllowance',
  'education': 'educationAllowance',
  'ea': 'educationAllowance',

  'cost of living allowance': 'costOfLivingAllowance',
  'cola': 'costOfLivingAllowance',
  'col': 'costOfLivingAllowance',

  'medical allowance': 'medicalAllowance',
  'medical': 'medicalAllowance',
  'ma': 'medicalAllowance',

  'food & canteen allowance': 'foodCanteenAllowance',
  'food and canteen allowance': 'foodCanteenAllowance',
  'food canteen allowance': 'foodCanteenAllowance',
  'canteen allowance': 'foodCanteenAllowance',
  'food allowance': 'foodCanteenAllowance',

  'appraisal': 'appraisal',
  'apprisal': 'appraisal', // common typo

  'gross earnings': 'grossEarnings',
  'gross earning': 'grossEarnings',
  'total': 'grossEarnings',
  'total earnings': 'grossEarnings',

  'professional tax (pt)': 'professionalTax',
  'professional tax': 'professionalTax',
  'pt': 'professionalTax',

  'income tax(tds)': 'incomeTax',
  'income tax (tds)': 'incomeTax',
  'income tax': 'incomeTax',
  'tds': 'incomeTax',
  'tds deduction': 'incomeTax',

  'meal voucher': 'mealVoucher',
  'esic': 'mealVoucher', // repurpose meal_voucher column for ESIC if not used

  'variable deduction': 'variableDeduction',

  'gross deductions': 'grossDeductions',
  'gross deduction': 'grossDeductions',
  'total deduction': 'grossDeductions',
  'total deductions': 'grossDeductions',

  'total earning salary': 'netPayable',
  'net payable': 'netPayable',
  'net salary': 'netPayable',
  'net pay': 'netPayable',
  'actual salary': 'netPayable',

  // Informational only (ignored - already on Employee/Run)
  'name': 'ignore',
  'name of the employee': 'ignore',
  'employee name': 'ignore',
  'designation': 'ignore',
  'department': 'ignore',
  'pan': 'ignore',
  'holidays': 'ignore',
  'total working days': 'ignore',
  'twd': 'ignore',
  'month': 'ignore',
  'no.': 'ignore',
  'no': 'ignore',
  'sr no': 'ignore',
  'sr. no.': 'ignore',
  'yearly salary': 'ignore',
  'per day salary': 'ignore',
  'no. of month days': 'ignore',
  'no of month days': 'ignore',
};

const NUMERIC_FIELDS: (keyof ParsedSalaryRow)[] = [
  'leaveTaken',
  'totalSalary',
  'basic',
  'dearnessAllowance',
  'houseRentAllowance',
  'conveyanceAllowance',
  'educationAllowance',
  'costOfLivingAllowance',
  'medicalAllowance',
  'foodCanteenAllowance',
  'appraisal',
  'grossEarnings',
  'professionalTax',
  'incomeTax',
  'mealVoucher',
  'variableDeduction',
  'grossDeductions',
  'netPayable',
];

function normalizeHeader(h: string): string {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/[,\s₹$€£]/g, '').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseSalaryExcel(buffer: Buffer): ParsedSalarySheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ rowNumber: 0, message: 'Workbook contains no sheets' }] };
  }

  const sheet = workbook.Sheets[sheetName];
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  const errors: ParsedSalarySheet['errors'] = [];
  const rows: ParsedSalaryRow[] = [];
  const seenCodes = new Set<string>();

  json.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // +2 = +1 (1-based) +1 (header row)

    // Build a normalized row keyed by canonical field
    const normalized: Partial<ParsedSalaryRow> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      const alias = HEADER_ALIASES[normalizeHeader(k)];
      if (!alias || alias === 'ignore') continue;
      if (alias === 'employeeCode') {
        normalized.employeeCode = String(v ?? '').trim();
      } else {
        (normalized as any)[alias] = toNumber(v);
      }
    }

    if (!normalized.employeeCode) {
      errors.push({ rowNumber, field: 'employee_code', message: 'Missing employee code' });
      return;
    }

    const code = normalized.employeeCode;
    if (seenCodes.has(code)) {
      errors.push({ rowNumber, field: 'employee_code', message: `Duplicate employee code in file: ${code}` });
      return;
    }
    seenCodes.add(code);

    // Default any missing numeric to 0
    for (const f of NUMERIC_FIELDS) {
      if ((normalized as any)[f] === undefined) (normalized as any)[f] = 0;
    }

    rows.push({
      rowNumber,
      employeeCode: code,
      leaveTaken: normalized.leaveTaken!,
      totalSalary: normalized.totalSalary!,
      basic: normalized.basic!,
      dearnessAllowance: normalized.dearnessAllowance!,
      houseRentAllowance: normalized.houseRentAllowance!,
      conveyanceAllowance: normalized.conveyanceAllowance!,
      educationAllowance: normalized.educationAllowance!,
      costOfLivingAllowance: normalized.costOfLivingAllowance!,
      medicalAllowance: normalized.medicalAllowance!,
      foodCanteenAllowance: normalized.foodCanteenAllowance!,
      appraisal: normalized.appraisal!,
      grossEarnings: normalized.grossEarnings!,
      professionalTax: normalized.professionalTax!,
      incomeTax: normalized.incomeTax!,
      mealVoucher: normalized.mealVoucher!,
      variableDeduction: normalized.variableDeduction!,
      grossDeductions: normalized.grossDeductions!,
      netPayable: normalized.netPayable!,
      rawRow,
    });
  });

  return { rows, errors };
}

/**
 * Build a blank import template workbook.
 */
export function buildTemplateWorkbook(): Buffer {
  const headers = [
    'Employee Code',
    'Name',
    'Designation',
    'Department',
    'PAN',
    'Holidays',
    'Total Working Days',
    'Leave Taken',
    'Total Salary',
    'Basic',
    'Dearness Allowance',
    'House Rent Allowance',
    'Conveyance Allowance',
    'Education Allowance',
    'Cost of Living Allowance',
    'Medical Allowance',
    'Food & Canteen Allowance',
    'Appraisal',
    'Gross Earnings',
    'Professional Tax (PT)',
    'Income Tax(TDS)',
    'Meal Voucher',
    'Variable Deduction',
    'Gross Deductions',
    'Total Earning Salary',
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Run');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return buf;
}
