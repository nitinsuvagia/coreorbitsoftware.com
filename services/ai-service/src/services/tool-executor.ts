/**
 * Tool Executor - Executes AI tool calls by making internal service API requests
 */

import { logger } from '../utils/logger';

interface ToolContext {
  tenantSlug: string;
  tenantId: string;
  userId: string;
  userRoles: string;
}

const EMPLOYEE_SERVICE = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const ATTENDANCE_SERVICE = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3003';
const PROJECT_SERVICE = process.env.PROJECT_SERVICE_URL || 'http://localhost:3004';

function buildHeaders(ctx: ToolContext): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-ID': ctx.tenantId,
    'X-Tenant-Slug': ctx.tenantSlug,
    'X-User-ID': ctx.userId,
    'X-User-Roles': ctx.userRoles,
  };
}

async function callService(url: string, ctx: ToolContext, options: { method?: string; body?: any } = {}): Promise<any> {
  const { method = 'GET', body } = options;
  const headers = buildHeaders(ctx);

  const fetchOptions: RequestInit = { method, headers };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as any)?.error || `Service returned ${response.status}`);
  }

  return data;
}

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<string> {
  try {
    logger.info({ toolName, args, tenantSlug: ctx.tenantSlug }, 'Executing tool');

    switch (toolName) {
      case 'get_employees_on_leave_today': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests?status=APPROVED&startDate=${todayStr()}&endDate=${todayStr()}&limit=50`,
          ctx
        );
        const leaves = data?.data || data?.leaves || [];
        if (!leaves.length) return 'No employees are on leave today.';
        const list = leaves.map((l: any) =>
          `- ${l.employee?.firstName || ''} ${l.employee?.lastName || ''} (${l.leaveType?.name || l.type || 'Leave'}): ${l.startDate} to ${l.endDate}${l.reason ? ` - ${l.reason}` : ''}`
        ).join('\n');
        return `Employees on leave today:\n${list}`;
      }

      case 'get_pending_leave_requests': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests?status=PENDING&limit=20`,
          ctx
        );
        const requests = data?.data || data?.requests || [];
        if (!requests.length) return 'No pending leave requests.';
        const list = requests.map((r: any) =>
          `- ID: ${r.id} | ${r.employee?.firstName || ''} ${r.employee?.lastName || ''} | ${r.leaveType?.name || r.type || 'Leave'} | ${r.startDate} to ${r.endDate} | Reason: ${r.reason || 'N/A'}`
        ).join('\n');
        return `Pending leave requests (${requests.length}):\n${list}`;
      }

      case 'approve_leave_request': {
        const { requestId, remarks } = args;
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests/approve`,
          ctx,
          { method: 'POST', body: { requestId, remarks } }
        );
        return data?.message || `Leave request ${requestId} has been approved.`;
      }

      case 'reject_leave_request': {
        const { requestId, reason } = args;
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests/reject`,
          ctx,
          { method: 'POST', body: { requestId, reason } }
        );
        return data?.message || `Leave request ${requestId} has been rejected.`;
      }

      case 'search_employees': {
        const params = new URLSearchParams();
        if (args.search) params.set('search', args.search);
        if (args.department) params.set('department', args.department);
        if (args.status) params.set('status', args.status);
        params.set('limit', '15');
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees?${params.toString()}`,
          ctx
        );
        const employees = data?.data || data?.employees || [];
        if (!employees.length) return 'No employees found matching your criteria.';
        const list = employees.map((e: any) =>
          `- ${e.firstName} ${e.lastName} | ${e.designation?.name || 'N/A'} | ${e.department?.name || 'N/A'} | ${e.email} | Status: ${e.status}`
        ).join('\n');
        return `Found ${employees.length} employee(s):\n${list}`;
      }

      case 'get_my_tasks': {
        const params = new URLSearchParams();
        if (args.status) params.set('status', args.status);
        params.set('limit', '20');
        const data = await callService(
          `${PROJECT_SERVICE}/api/v1/projects/my?${params.toString()}`,
          ctx
        );
        const projects = data?.data || data?.projects || [];
        if (!projects.length) return 'No tasks found.';
        // Flatten tasks from projects
        const tasks: string[] = [];
        for (const p of projects) {
          const projectTasks = p.tasks || [];
          for (const t of projectTasks) {
            tasks.push(`- [${t.status}] ${t.title} (Project: ${p.name}) | Priority: ${t.priority || 'N/A'} | Due: ${t.dueDate || 'N/A'}`);
          }
        }
        if (!tasks.length) return `You have ${projects.length} project(s) but no tasks assigned directly.`;
        return `Your tasks (${tasks.length}):\n${tasks.join('\n')}`;
      }

      case 'get_my_leave_balance': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/balances/me`,
          ctx
        );
        const balances = data?.data || data?.balances || [];
        if (!balances.length) return 'No leave balance information found.';
        const list = balances.map((b: any) =>
          `- ${b.leaveType?.name || b.type || 'Leave'}: ${b.remaining ?? b.balance ?? 0} remaining (used ${b.used ?? 0} of ${b.total ?? b.allocated ?? 0})`
        ).join('\n');
        return `Your leave balance:\n${list}`;
      }

      case 'get_attendance_overview': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/attendance/overview/today`,
          ctx
        );
        const overview = data?.data || data;
        return `Today's attendance overview:\n- Present: ${overview?.present ?? 'N/A'}\n- Absent: ${overview?.absent ?? 'N/A'}\n- Late: ${overview?.late ?? 'N/A'}\n- On Leave: ${overview?.onLeave ?? 'N/A'}\n- Total: ${overview?.total ?? 'N/A'}`;
      }

      case 'get_employee_stats': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees/stats`,
          ctx
        );
        const stats = data?.data || data;
        return `Employee statistics:\n- Total Employees: ${stats?.totalEmployees ?? stats?.total ?? 'N/A'}\n- Active: ${stats?.activeCount ?? stats?.active ?? 'N/A'}\n- Departments: ${stats?.departmentCount ?? 'N/A'}\n- New this month: ${stats?.newThisMonth ?? 'N/A'}`;
      }

      case 'generate_job_description': {
        // Use existing JD generation service
        const { generateJobContent } = await import('./job.service');
        const content = await generateJobContent(ctx.tenantSlug, {
          title: args.title,
          department: args.department,
          employmentType: args.employmentType,
          experienceMin: args.experienceMin,
          experienceMax: args.experienceMax,
        });
        return `Here's the generated job description for "${args.title}":\n\n**Description:**\n${content.description}\n\n**Requirements:**\n${(content.requirements || []).map((r: string) => `- ${r}`).join('\n')}\n\n**Responsibilities:**\n${(content.responsibilities || []).map((r: string) => `- ${r}`).join('\n')}\n\n**Benefits:**\n${(content.benefits || []).map((b: string) => `- ${b}`).join('\n')}`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    logger.error({ error: error.message, toolName }, 'Tool execution failed');
    return `I couldn't complete that action: ${error.message}`;
  }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
