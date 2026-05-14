/**
 * Payslip PDF Service
 *
 * Renders a single payslip as a PDF using PDFKit (no headless browser required).
 * All company info (name, logo, address) is sourced from the TenantProfile.
 * All employee info (name, code, designation, department, PAN) is sourced from Employee.
 * All amounts come straight from the SalaryRunItem (verbatim from import).
 */

import PDFDocument from 'pdfkit';
import axios from 'axios';
import { logger } from '../../utils/logger';
import type { TenantProfile } from './tenant-profile.client';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

/**
 * Resolve a stored logo reference to image bytes. Handles three storage
 * formats currently used in the platform:
 *   - `data:image/...;base64,xxx` (inline base64 — most common, used by Org settings)
 *   - absolute http(s) URL
 *   - relative path served by the gateway (e.g. `/api/documents/files/...`)
 * Returns null on any failure (caller falls back to text header).
 * PDFKit accepts JPEG and PNG only.
 */
async function fetchLogoBuffer(ref: string | null | undefined): Promise<Buffer | null> {
  if (!ref) return null;
  try {
    // Inline data URL — decode the base64 payload directly.
    if (ref.startsWith('data:')) {
      const commaIdx = ref.indexOf(',');
      if (commaIdx === -1) return null;
      const meta = ref.slice(5, commaIdx); // e.g. "image/png;base64"
      const payload = ref.slice(commaIdx + 1);
      if (!meta.includes('base64')) {
        // URL-encoded data URL — decode and treat as utf8 (rare for images)
        return Buffer.from(decodeURIComponent(payload), 'binary');
      }
      return Buffer.from(payload, 'base64');
    }
    const url = ref.startsWith('http') ? ref : `${GATEWAY_URL}${ref.startsWith('/') ? '' : '/'}${ref}`;
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(res.data);
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Failed to load tenant logo for payslip');
    return null;
  }
}

export interface PayslipEmployee {
  employeeCode: string;
  displayName: string;
  designation: string | null;
  department: string | null;
  taxId: string | null;
}

export interface PayslipPeriod {
  month: number;      // 1-12
  year: number;
  periodLabel: string;
  totalWorkingDays: number;
  totalHolidays: number;
}

export interface PayslipAmounts {
  leaveTaken: number | string;
  totalSalary: number | string;
  basic: number | string;
  dearnessAllowance: number | string;
  houseRentAllowance: number | string;
  conveyanceAllowance: number | string;
  educationAllowance: number | string;
  costOfLivingAllowance: number | string;
  medicalAllowance: number | string;
  foodCanteenAllowance: number | string;
  appraisal: number | string;
  grossEarnings: number | string;
  professionalTax: number | string;
  incomeTax: number | string;
  mealVoucher: number | string;
  variableDeduction: number | string;
  grossDeductions: number | string;
  netPayable: number | string;
}

let browserPromise: Promise<any> | null = null;
async function getBrowser(): Promise<any> {
  // Deprecated: kept only to avoid touching imports during migration. PDFKit is used now.
  return null;
}

function formatMoney(value: number | string, currency: string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0.00';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function currencyPrefix(currency: string): string {
  // Standard PDF Helvetica does not include the rupee glyph, so use a safe text prefix.
  switch ((currency || '').toUpperCase()) {
    case 'INR': return 'Rs.';
    case 'USD': return '$';
    case 'EUR': return 'EUR';
    case 'GBP': return 'GBP';
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    default: return (currency || '').toUpperCase();
  }
}

function buildAddressLines(t: TenantProfile): string[] {
  return [
    t.addressLine1,
    t.addressLine2,
    [t.city, t.state, t.postalCode].filter(Boolean).join(', '),
    t.country,
  ].filter((l): l is string => !!l && String(l).trim().length > 0);
}

export async function generatePayslipPdf(opts: {
  tenant: TenantProfile;
  employee: PayslipEmployee;
  period: PayslipPeriod;
  amounts: PayslipAmounts;
}): Promise<Buffer> {
  const { tenant, employee, period, amounts } = opts;
  const currency = tenant.currency || 'USD';
  const prefix = currencyPrefix(currency);
  const fmt = (v: number | string) => `${prefix} ${formatMoney(v, currency)}`;
  const companyName = tenant.legalName || tenant.name;
  const primary = tenant.primaryColor || '#1E40AF';

  // Fetch the stationery (report) logo before we start streaming the PDF, since
  // PDFKit doesn't support async image loads mid-render.
  const logoBuffer = await fetchLogoBuffer(tenant.reportLogo || tenant.logoUrl || tenant.logo);

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = doc.page.margins.left;

      // ---- Header (stationery logo if available, else company name)
      const headerTop = doc.y;
      if (logoBuffer) {
        try {
          // 3:1 aspect ratio per Org settings; constrain by height for predictable layout.
          const logoH = 48;
          const logoW = logoH * 3;
          doc.image(logoBuffer, left, headerTop, { fit: [logoW, logoH] });
          doc.y = headerTop + logoH;
        } catch (err: any) {
          logger.warn({ err: err?.message }, 'Could not render tenant logo, falling back to text');
          doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text(companyName, left, headerTop);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text(companyName, left, headerTop);
      }

      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
      for (const line of buildAddressLines(tenant)) doc.text(line);

      // Underline rule
      doc.moveDown(0.5);
      const ruleY = doc.y;
      doc.strokeColor(primary).lineWidth(1.5).moveTo(left, ruleY).lineTo(left + pageWidth, ruleY).stroke();
      doc.moveDown(0.6);

      // ---- Title bar
      const titleY = doc.y;
      doc.rect(left, titleY, pageWidth, 22).fill(primary);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
        .text(`PAYSLIP - ${period.periodLabel}`, left, titleY + 6, { width: pageWidth, align: 'center' });
      doc.fillColor('#111827');
      doc.y = titleY + 22 + 8;

      // ---- Meta block (two columns)
      const metaTop = doc.y;
      const metaPadding = 8;
      const metaRows: Array<[string, string, string, string]> = [
        ['Employee Code', employee.employeeCode, 'Holidays', String(period.totalHolidays)],
        ['Name', employee.displayName, 'Total Working Days', String(period.totalWorkingDays)],
        ['Designation', employee.designation || '-', 'Leave Taken', String(formatMoney(amounts.leaveTaken, currency))],
        ['Department', employee.department || '-', 'Total Salary', fmt(amounts.totalSalary)],
        ['PAN', employee.taxId || '-', 'Month', period.periodLabel],
      ];
      const metaRowHeight = 14;
      const metaHeight = metaPadding * 2 + metaRows.length * metaRowHeight;
      doc.lineWidth(0.5).strokeColor('#e5e7eb').rect(left, metaTop, pageWidth, metaHeight).stroke();

      const colWidth = pageWidth / 2;
      doc.fontSize(9);
      metaRows.forEach((row, i) => {
        const y = metaTop + metaPadding + i * metaRowHeight;
        // Left pair
        doc.font('Helvetica-Bold').fillColor('#374151').text(row[0], left + 8, y, { width: 120 });
        doc.font('Helvetica').fillColor('#111827').text(row[1], left + 130, y, { width: colWidth - 140 });
        // Right pair
        doc.font('Helvetica-Bold').fillColor('#374151').text(row[2], left + colWidth + 8, y, { width: 130 });
        doc.font('Helvetica').fillColor('#111827').text(row[3], left + colWidth + 145, y, { width: colWidth - 155 });
      });
      doc.y = metaTop + metaHeight + 10;

      // ---- Earnings / Deductions table
      const tableTop = doc.y;
      const colDescW = pageWidth * 0.35;
      const colAmtW = pageWidth * 0.15;
      const c1 = left;                              // Earnings desc
      const c2 = left + colDescW;                   // Earnings amt
      const c3 = left + colDescW + colAmtW;         // Deductions desc
      const c4 = left + colDescW * 2 + colAmtW;     // Deductions amt
      const rowH = 16;

      // Header row
      doc.rect(left, tableTop, pageWidth, rowH).fill('#f3f4f6');
      doc.strokeColor('#e5e7eb').lineWidth(0.5).rect(left, tableTop, pageWidth, rowH).stroke();
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5);
      doc.text('Earnings', c1 + 6, tableTop + 4, { width: colDescW - 12 });
      doc.text('Amount', c2 + 6, tableTop + 4, { width: colAmtW - 12, align: 'right' });
      doc.text('Deductions', c3 + 6, tableTop + 4, { width: colDescW - 12 });
      doc.text('Amount', c4 + 6, tableTop + 4, { width: colAmtW - 12, align: 'right' });

      type Row = { label: string; value: string };
      const earnings: Row[] = [
        { label: 'Basic', value: fmt(amounts.basic) },
        { label: 'Dearness Allowance', value: fmt(amounts.dearnessAllowance) },
        { label: 'House Rent Allowance', value: fmt(amounts.houseRentAllowance) },
        { label: 'Conveyance Allowance', value: fmt(amounts.conveyanceAllowance) },
        { label: 'Education Allowance', value: fmt(amounts.educationAllowance) },
        { label: 'Cost of Living Allowance', value: fmt(amounts.costOfLivingAllowance) },
        { label: 'Medical Allowance', value: fmt(amounts.medicalAllowance) },
        { label: 'Food & Canteen Allowance', value: fmt(amounts.foodCanteenAllowance) },
        { label: 'Appraisal', value: fmt(amounts.appraisal) },
      ];
      const deductions: Row[] = [
        { label: 'Professional Tax (PT)', value: fmt(amounts.professionalTax) },
        { label: 'Income Tax (TDS)', value: fmt(amounts.incomeTax) },
        { label: 'Meal Voucher', value: fmt(amounts.mealVoucher) },
        { label: 'Variable Deduction', value: fmt(amounts.variableDeduction) },
      ];
      const bodyRowCount = Math.max(earnings.length, deductions.length);

      doc.font('Helvetica').fontSize(7.5).fillColor('#1f2937');
      for (let i = 0; i < bodyRowCount; i++) {
        const y = tableTop + rowH * (i + 1);
        // Row borders
        doc.strokeColor('#e5e7eb').lineWidth(0.5).rect(left, y, pageWidth, rowH).stroke();
        // vertical separators
        doc.moveTo(c2, y).lineTo(c2, y + rowH).stroke();
        doc.moveTo(c3, y).lineTo(c3, y + rowH).stroke();
        doc.moveTo(c4, y).lineTo(c4, y + rowH).stroke();

        const e = earnings[i];
        const d = deductions[i];
        if (e) {
          doc.font('Helvetica').fontSize(9).text(e.label, c1 + 6, y + 4, { width: colDescW - 12 });
          doc.fontSize(7.5).text(e.value, c2 + 6, y + 5, { width: colAmtW - 12, align: 'right' });
        }
        if (d) {
          doc.font('Helvetica').fontSize(9).text(d.label, c3 + 6, y + 4, { width: colDescW - 12 });
          doc.fontSize(7.5).text(d.value, c4 + 6, y + 5, { width: colAmtW - 12, align: 'right' });
        }
      }

      // Subtotal row
      const subY = tableTop + rowH * (bodyRowCount + 1);
      doc.rect(left, subY, pageWidth, rowH).fill('#f9fafb');
      doc.strokeColor('#e5e7eb').lineWidth(0.5).rect(left, subY, pageWidth, rowH).stroke();
      doc.moveTo(c2, subY).lineTo(c2, subY + rowH).stroke();
      doc.moveTo(c3, subY).lineTo(c3, subY + rowH).stroke();
      doc.moveTo(c4, subY).lineTo(c4, subY + rowH).stroke();
      doc.fillColor('#111827').font('Helvetica-Bold');
      doc.fontSize(9.5).text('Gross Earnings', c1 + 6, subY + 4, { width: colDescW - 12 });
      doc.fontSize(8).text(fmt(amounts.grossEarnings), c2 + 6, subY + 5, { width: colAmtW - 12, align: 'right' });
      doc.fontSize(9.5).text('Gross Deductions', c3 + 6, subY + 4, { width: colDescW - 12 });
      doc.fontSize(8).text(fmt(amounts.grossDeductions), c4 + 6, subY + 5, { width: colAmtW - 12, align: 'right' });

      // Net row — single row split 50/50: label left, amount right-aligned in right half
      const netY = subY + rowH;
      const netH = 22;
      const netLabelW = pageWidth / 2;
      const netAmtW = pageWidth / 2;
      doc.rect(left, netY, pageWidth, netH).fill(primary);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
      doc.text('Total Earning Salary (Net Payable)', left + 8, netY + 6, { width: netLabelW - 16 });
      doc.text(fmt(amounts.netPayable), left + netLabelW, netY + 6, { width: netAmtW - 8, align: 'right' });

      doc.y = netY + netH + 18;
      doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(8.5)
        .text('THIS IS A COMPUTER-GENERATED PAYSLIP AND DOES NOT REQUIRE ANY SIGNATURE.', left, doc.y, {
          width: pageWidth, align: 'center',
        });

      doc.end();
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to render payslip PDF');
      reject(err);
    }
  });
}

// Suppress unused-var warning for the legacy stub.
void getBrowser;
void browserPromise;
