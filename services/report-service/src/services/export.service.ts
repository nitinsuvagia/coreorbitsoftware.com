/**
 * Export Service - Generate Excel and PDF exports
 */

import { Workbook, Worksheet } from 'exceljs';
import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import { getTenantPrisma } from '@oms/database';
import { publishEvent } from '@oms/event-bus';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as storageService from './storage.service';

export type ExportFormat = 'excel' | 'pdf' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  title?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  columns?: string[];
}

export interface ExportResult {
  id: string;
  filename: string;
  format: ExportFormat;
  size: number;
  downloadUrl: string;
  expiresAt: Date;
}

/**
 * Export employees to Excel
 */
export async function exportEmployeesToExcel(
  tenantSlug: string,
  options: ExportOptions
): Promise<ExportResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const employees = await prisma.employee.findMany({
    include: {
      department: true,
      designation: true,
      team: true,
    },
    orderBy: { lastName: 'asc' },
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Employees');
  
  // Add header row
  sheet.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'First Name', key: 'firstName', width: 15 },
    { header: 'Last Name', key: 'lastName', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Team', key: 'team', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Hire Date', key: 'hireDate', width: 15 },
  ];
  
  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  // Add data rows
  for (const emp of employees) {
    sheet.addRow({
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department?.name || '',
      designation: emp.designation?.title || '',
      team: emp.team?.name || '',
      status: emp.status,
      hireDate: emp.hireDate ? DateTime.fromJSDate(emp.hireDate).toFormat('yyyy-MM-dd') : '',
    });
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  return saveExport(
    tenantSlug,
    Buffer.from(buffer),
    'employees',
    'xlsx',
    options.title || 'Employee List'
  );
}

/**
 * Export attendance to Excel
 */
export async function exportAttendanceToExcel(
  tenantSlug: string,
  options: ExportOptions
): Promise<ExportResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const where: any = {};
  if (options.dateRange) {
    where.date = {
      gte: options.dateRange.start,
      lte: options.dateRange.end,
    };
  }
  
  const attendance = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ date: 'desc' }, { employee: { lastName: 'asc' } }],
    take: config.reports.maxRowsExcel,
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Attendance');
  
  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 25 },
    { header: 'Check In', key: 'checkIn', width: 12 },
    { header: 'Check Out', key: 'checkOut', width: 12 },
    { header: 'Work Hours', key: 'workHours', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  for (const record of attendance) {
    sheet.addRow({
      date: DateTime.fromJSDate(record.date).toFormat('yyyy-MM-dd'),
      employeeId: record.employee.employeeId,
      employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
      checkIn: record.checkIn ? DateTime.fromJSDate(record.checkIn).toFormat('HH:mm') : '',
      checkOut: record.checkOut ? DateTime.fromJSDate(record.checkOut).toFormat('HH:mm') : '',
      workHours: record.workHours?.toFixed(2) || '',
      status: record.status,
      notes: record.notes || '',
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  
  return saveExport(
    tenantSlug,
    Buffer.from(buffer),
    'attendance',
    'xlsx',
    options.title || 'Attendance Report'
  );
}

/**
 * Export projects to Excel
 */
export async function exportProjectsToExcel(
  tenantSlug: string,
  options: ExportOptions
): Promise<ExportResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      manager: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Projects');
  
  sheet.columns = [
    { header: 'Project Code', key: 'code', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Manager', key: 'manager', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Start Date', key: 'startDate', width: 12 },
    { header: 'End Date', key: 'endDate', width: 12 },
    { header: 'Progress', key: 'progress', width: 10 },
    { header: 'Budget', key: 'budget', width: 15 },
    { header: 'Tasks', key: 'tasks', width: 10 },
  ];
  
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  for (const project of projects) {
    sheet.addRow({
      code: project.code,
      name: project.name,
      client: project.client?.name || '',
      manager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '',
      status: project.status,
      startDate: project.startDate ? DateTime.fromJSDate(project.startDate).toFormat('yyyy-MM-dd') : '',
      endDate: project.endDate ? DateTime.fromJSDate(project.endDate).toFormat('yyyy-MM-dd') : '',
      progress: `${project.progress || 0}%`,
      budget: project.budget?.toString() || '',
      tasks: project._count.tasks,
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  
  return saveExport(
    tenantSlug,
    Buffer.from(buffer),
    'projects',
    'xlsx',
    options.title || 'Projects Report'
  );
}

/**
 * Export tasks to Excel
 */
export async function exportTasksToExcel(
  tenantSlug: string,
  options: ExportOptions
): Promise<ExportResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const where: any = {};
  if (options.filters?.projectId) {
    where.projectId = options.filters.projectId;
  }
  if (options.filters?.status) {
    where.status = options.filters.status;
  }
  
  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: true,
      assignee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: config.reports.maxRowsExcel,
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Tasks');
  
  sheet.columns = [
    { header: 'Task ID', key: 'taskNumber', width: 12 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Project', key: 'project', width: 25 },
    { header: 'Assignee', key: 'assignee', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Due Date', key: 'dueDate', width: 12 },
    { header: 'Estimated Hours', key: 'estimatedHours', width: 15 },
    { header: 'Actual Hours', key: 'actualHours', width: 12 },
  ];
  
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  for (const task of tasks) {
    sheet.addRow({
      taskNumber: task.taskNumber,
      title: task.title,
      project: task.project?.name || '',
      assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? DateTime.fromJSDate(task.dueDate).toFormat('yyyy-MM-dd') : '',
      estimatedHours: task.estimatedHours || '',
      actualHours: task.actualHours || '',
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  
  return saveExport(
    tenantSlug,
    Buffer.from(buffer),
    'tasks',
    'xlsx',
    options.title || 'Tasks Report'
  );
}

/**
 * Export leaves to Excel
 */
export async function exportLeavesToExcel(
  tenantSlug: string,
  options: ExportOptions
): Promise<ExportResult> {
  const prisma = await getTenantPrisma(tenantSlug);
  
  const where: any = {};
  if (options.dateRange) {
    where.startDate = { gte: options.dateRange.start, lte: options.dateRange.end };
  }
  
  const leaves = await prisma.leave.findMany({
    where,
    include: {
      employee: {
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
    take: config.reports.maxRowsExcel,
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Leaves');
  
  sheet.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 25 },
    { header: 'Leave Type', key: 'leaveType', width: 15 },
    { header: 'Start Date', key: 'startDate', width: 12 },
    { header: 'End Date', key: 'endDate', width: 12 },
    { header: 'Days', key: 'days', width: 8 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Reason', key: 'reason', width: 40 },
  ];
  
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  for (const leave of leaves) {
    sheet.addRow({
      employeeId: leave.employee.employeeId,
      employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
      leaveType: leave.leaveType,
      startDate: DateTime.fromJSDate(leave.startDate).toFormat('yyyy-MM-dd'),
      endDate: DateTime.fromJSDate(leave.endDate).toFormat('yyyy-MM-dd'),
      days: leave.days,
      status: leave.status,
      reason: leave.reason || '',
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  
  return saveExport(
    tenantSlug,
    Buffer.from(buffer),
    'leaves',
    'xlsx',
    options.title || 'Leave Report'
  );
}

/**
 * Generate PDF report
 */
export async function generatePdfReport(
  tenantSlug: string,
  reportType: string,
  data: any,
  options: ExportOptions
): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const result = await saveExport(
          tenantSlug,
          buffer,
          reportType,
          'pdf',
          options.title || 'Report'
        );
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    doc.on('error', reject);
    
    // Header
    doc.fontSize(20).text(options.title || 'Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Content based on report type
    if (reportType === 'overview') {
      addOverviewSection(doc, data);
    } else if (reportType === 'attendance_summary') {
      addAttendanceSummarySection(doc, data);
    } else if (reportType === 'project_status') {
      addProjectStatusSection(doc, data);
    }
    
    doc.end();
  });
}

function addOverviewSection(doc: PDFKit.PDFDocument, data: any): void {
  doc.fontSize(14).text('Overview Metrics', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11);
  
  if (data.employees) {
    doc.text(`Total Employees: ${data.employees.total}`);
    doc.text(`Active Employees: ${data.employees.active}`);
    doc.text(`On Leave: ${data.employees.onLeave}`);
    doc.moveDown();
  }
  
  if (data.projects) {
    doc.text(`Total Projects: ${data.projects.total}`);
    doc.text(`Active Projects: ${data.projects.active}`);
    doc.text(`Completed: ${data.projects.completed}`);
    doc.moveDown();
  }
  
  if (data.tasks) {
    doc.text(`Total Tasks: ${data.tasks.total}`);
    doc.text(`Completed: ${data.tasks.completed}`);
    doc.text(`Completion Rate: ${data.tasks.completionRate}%`);
  }
}

function addAttendanceSummarySection(doc: PDFKit.PDFDocument, data: any): void {
  doc.fontSize(14).text('Attendance Summary', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11);
  doc.text(`Present Today: ${data.presentToday || 0}`);
  doc.text(`Absent Today: ${data.absentToday || 0}`);
  doc.text(`On-Time Percentage: ${data.onTimePercentage || 0}%`);
  doc.text(`Average Work Hours: ${data.avgWorkHours || 0}`);
}

function addProjectStatusSection(doc: PDFKit.PDFDocument, data: any): void {
  doc.fontSize(14).text('Project Status', { underline: true });
  doc.moveDown();
  
  if (data.projects && Array.isArray(data.projects)) {
    for (const project of data.projects.slice(0, 20)) {
      doc.fontSize(11).text(`${project.name}: ${project.status} (${project.progress || 0}%)`);
    }
  }
}

/**
 * Save export to S3
 */
async function saveExport(
  tenantSlug: string,
  buffer: Buffer,
  reportType: string,
  extension: string,
  title: string
): Promise<ExportResult> {
  const now = DateTime.now();
  const id = uuid();
  const filename = `${reportType}-${now.toFormat('yyyyMMdd-HHmmss')}.${extension}`;
  const key = config.reports.storagePath
    .replace('{tenantSlug}', tenantSlug)
    .replace('{year}', now.year.toString())
    .replace('{month}', now.month.toString().padStart(2, '0'));
  
  const fullKey = `${key}/${filename}`;
  
  // Upload to S3
  await storageService.uploadFile(fullKey, buffer, getMimeType(extension));
  
  // Get download URL
  const downloadUrl = await storageService.getDownloadUrl(fullKey);
  
  // Note: exportRecord model may not exist in the schema yet
  // When available, uncomment and use masterPrisma.exportRecord.create
  
  await publishEvent('report.exported', {
    tenantSlug,
    reportType,
    format: extension,
    filename,
  });
  
  logger.info({
    tenantSlug,
    reportType,
    format: extension,
    filename,
    size: buffer.length,
  }, 'Export created');
  
  return {
    id,
    filename,
    format: extension as ExportFormat,
    size: buffer.length,
    downloadUrl,
    expiresAt: now.plus({ hours: 1 }).toJSDate(),
  };
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    csv: 'text/csv',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
