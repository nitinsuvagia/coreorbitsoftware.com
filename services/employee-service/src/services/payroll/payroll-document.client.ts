/**
 * Payroll Document Client
 *
 * Talks to the document-service to:
 *  - Resolve / create the "Payslips/{Year}" subfolder under an employee's folder.
 *  - Upload generated payslip PDFs and the source Excel file.
 *
 * Returns { fileId, key } refs that we persist on SalaryRun / SalaryRunItem.
 */

import axios from 'axios';
import FormData from 'form-data';
import { getTenantDbManager } from '@oms/tenant-db-manager';
import { logger } from '../../utils/logger';

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007';

const tenantIdCache = new Map<string, string>();
async function resolveTenantId(slug: string): Promise<string> {
  const cached = tenantIdCache.get(slug);
  if (cached) return cached;
  const info = await getTenantDbManager().getTenantBySlug(slug);
  tenantIdCache.set(slug, info.id);
  return info.id;
}

export interface UploadedFileRef {
  fileId: string;
  key: string;
  url?: string;
}

interface FolderRef { id: string; name: string; parentId: string | null }

function headers(tenantId: string, tenantSlug: string, userId?: string) {
  // Send privileged roles so document-service permits listing/creating root-level folders.
  const h: Record<string, string> = {
    'x-tenant-id': tenantId,
    'x-tenant-slug': tenantSlug,
    'x-user-roles': 'tenant_admin,hr_manager',
  };
  if (userId) h['x-user-id'] = userId;
  return h;
}

async function listChildren(
  tenantSlug: string,
  userId: string | undefined,
  parentId: string | null,
): Promise<any[]> {
  const tenantId = await resolveTenantId(tenantSlug);
  if (parentId === null) {
    const res = await axios.get(`${DOCUMENT_SERVICE_URL}/api/documents/folders/root`, {
      headers: headers(tenantId, tenantSlug, userId),
      timeout: 10000,
    });
    return res.data?.data ?? [];
  }
  const res = await axios.get(
    `${DOCUMENT_SERVICE_URL}/api/documents/folders/${parentId}/contents`,
    { headers: headers(tenantId, tenantSlug, userId), timeout: 10000 },
  );
  return res.data?.data?.folders ?? [];
}

async function findOrCreateFolder(
  tenantSlug: string,
  userId: string | undefined,
  name: string,
  parentId: string | null,
): Promise<FolderRef> {
  // Look up children of parentId by name
  try {
    const list = await listChildren(tenantSlug, userId, parentId);
    const found = list.find((f: any) => f.name === name && !f.isDeleted);
    if (found) return { id: found.id, name: found.name, parentId: found.parentId ?? null };
  } catch (err: any) {
    logger.warn({ err: err.message, name, parentId }, 'Folder lookup failed; will attempt create');
  }

  const tenantId = await resolveTenantId(tenantSlug);
  const res = await axios.post(
    `${DOCUMENT_SERVICE_URL}/api/documents/folders`,
    { name, parentId: parentId ?? undefined },
    { headers: { ...headers(tenantId, tenantSlug, userId), 'Content-Type': 'application/json' }, timeout: 10000 },
  );
  const folder = res.data?.data;
  if (!folder?.id) throw new Error(`Failed to create folder ${name}`);
  return { id: folder.id, name: folder.name, parentId: folder.parentId ?? null };
}

/**
 * Resolve the per-employee "Payslips/{Year}" folder.
 * Assumes the employee folder already exists (created via createEmployeeFolders).
 */
export async function resolveEmployeePayslipFolder(opts: {
  tenantSlug: string;
  userId?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  year: number;
}): Promise<string> {
  const tenantId = await resolveTenantId(opts.tenantSlug);
  // Ensure the employee's folder structure exists (idempotent)
  try {
    await axios.post(
      `${DOCUMENT_SERVICE_URL}/api/documents/folders/employee-direct/${opts.employeeId}`,
      {},
      { headers: headers(tenantId, opts.tenantSlug, opts.userId), timeout: 15000 },
    );
  } catch (err: any) {
    // Non-fatal: folder may already exist, or endpoint may return 4xx if already initialized
    logger.debug({ err: err.message }, 'Employee folder ensure call returned non-2xx (likely already exists)');
  }

  // Find the Employee Documents root
  const roots = await listChildren(opts.tenantSlug, opts.userId, null);
  const employeeDocs = roots.find((f: any) => f.name === 'Employee Documents' && !f.isDeleted);
  if (!employeeDocs) throw new Error('Employee Documents root folder not found');

  // Find this employee's folder (name starts with "<code> - ")
  const empList = await listChildren(opts.tenantSlug, opts.userId, employeeDocs.id);
  const employeeFolder = empList.find(
    (f: any) => !f.isDeleted && (f.name === `${opts.employeeCode} - ${opts.employeeName}` || f.name.startsWith(`${opts.employeeCode} - `)),
  );
  if (!employeeFolder) {
    throw new Error(`Employee folder not found for ${opts.employeeCode}`);
  }

  const payslipsFolder = await findOrCreateFolder(opts.tenantSlug, opts.userId, 'Payslips', employeeFolder.id);
  const yearFolder = await findOrCreateFolder(opts.tenantSlug, opts.userId, String(opts.year), payslipsFolder.id);
  return yearFolder.id;
}

/**
 * Resolve the "Payroll/{Year}" folder under the Document Management root for storing the source Excel files.
 */
export async function resolvePayrollRunsFolder(opts: {
  tenantSlug: string;
  userId?: string;
  year: number;
}): Promise<string> {
  const roots = await listChildren(opts.tenantSlug, opts.userId, null);
  let payroll: FolderRef;
  const existing = roots.find((f: any) => f.name === 'Payroll' && !f.isDeleted);
  if (existing) {
    payroll = { id: existing.id, name: existing.name, parentId: existing.parentId ?? null };
  } else {
    payroll = await findOrCreateFolder(opts.tenantSlug, opts.userId, 'Payroll', null);
  }
  const yearFolder = await findOrCreateFolder(opts.tenantSlug, opts.userId, String(opts.year), payroll.id);
  return yearFolder.id;
}

export async function uploadFileToFolder(opts: {
  tenantSlug: string;
  userId?: string;
  folderId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
  entityType?: string;
  entityId?: string;
}): Promise<UploadedFileRef> {
  const tenantId = await resolveTenantId(opts.tenantSlug);
  const form = new FormData();
  form.append('file', opts.content, { filename: opts.filename, contentType: opts.mimeType });

  const params: Record<string, string> = { folderId: opts.folderId };
  if (opts.entityType) params.entityType = opts.entityType;
  if (opts.entityId) params.entityId = opts.entityId;

  const res = await axios.post(`${DOCUMENT_SERVICE_URL}/api/documents/files/upload`, form, {
    params,
    headers: { ...headers(tenantId, opts.tenantSlug, opts.userId), ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000,
  });

  const uploaded = res.data?.data?.uploaded?.[0];
  if (!uploaded?.id) {
    const errMsg = res.data?.data?.errors?.[0]?.error || 'Upload failed';
    throw new Error(errMsg);
  }
  return { fileId: uploaded.id, key: uploaded.key ?? uploaded.id, url: uploaded.url };
}
