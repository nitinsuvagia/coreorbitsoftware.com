/**
 * Tool Executor - Executes AI tool calls by making internal service API requests
 * Covers: Employees, Attendance, Leaves, Holidays, Interviews, Jobs, Candidates,
 *         Performance, Documents, Notifications, Projects/Tasks
 */

import { logger } from '../utils/logger';

interface ToolContext {
  tenantSlug: string;
  tenantId: string;
  userId: string;
  userRoles: string;
  userEmail: string;
  userPermissions: string;
}

// ---------------------------------------------------------------------------
// Service URLs
// ---------------------------------------------------------------------------
const EMPLOYEE_SERVICE = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const ATTENDANCE_SERVICE = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3003';
const PROJECT_SERVICE = process.env.PROJECT_SERVICE_URL || 'http://localhost:3004';
const DOCUMENT_SERVICE = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    const errObj = (data as any)?.error;
    const errMsg = typeof errObj === 'string' ? errObj
      : typeof errObj === 'object' && errObj?.message ? errObj.message
      : (data as any)?.message || `Service returned ${response.status}`;
    throw new Error(errMsg);
  }

  return data;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string | null | undefined): string {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
}

/** Check if user has a specific permission */
function hasPermission(ctx: ToolContext, perm: string): boolean {
  if (!ctx.userPermissions) return false;
  const perms = ctx.userPermissions.split(',');
  return perms.includes(perm) || perms.includes('*') || perms.includes('admin');
}

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<string> {
  try {
    logger.info({ toolName, args, tenantSlug: ctx.tenantSlug }, 'Executing tool');

    switch (toolName) {

      // ====================================================================
      // EMPLOYEE TOOLS
      // ====================================================================

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
        const employees = data?.data?.items || data?.data || data?.employees || [];
        if (!Array.isArray(employees) || !employees.length) {
          return args.search
            ? `No employees found matching "${args.search}". Try a different name, department, or check the spelling.`
            : 'No employees found matching your criteria. The employee directory may be empty or the filter doesn\'t match any records.';
        }
        const total = data?.data?.total || employees.length;
        const list = employees.map((e: any) =>
          `- **${e.firstName} ${e.lastName}** (${e.employeeCode || 'N/A'}) | ${e.designation?.name || 'N/A'} | ${e.department?.name || 'N/A'} | ${e.email} | Status: ${e.status} | Joined: ${formatDate(e.joinDate)}`
        ).join('\n');
        return `Found ${total} employee(s)${total > employees.length ? ` (showing first ${employees.length})` : ''}:\n${list}`;
      }

      case 'get_employee_stats': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees/stats`,
          ctx
        );
        const stats = data?.data || data;
        let result = `Employee statistics:\n- Total Employees: ${stats?.total ?? stats?.totalEmployees ?? 'N/A'}\n- Active: ${stats?.active ?? stats?.activeCount ?? 'N/A'}\n- On Leave: ${stats?.onLeave ?? 'N/A'}`;
        if (Array.isArray(stats?.byDepartment) && stats.byDepartment.length) {
          result += `\n- Departments: ${stats.byDepartment.length}`;
          result += `\n\nDepartment breakdown:\n${stats.byDepartment.map((d: any) => `- ${d.name || 'Unassigned'}: ${d.count ?? d._count ?? 0} employees`).join('\n')}`;
          // Chart: employees per department
          const deptChartData = stats.byDepartment.map((d: any) => ({ name: d.name || 'Unassigned', value: d.count ?? d._count ?? 0 }));
          result += `\n\n:::chart{type="bar" title="Employees by Department" xKey="name" yKey="value" color="#6366f1" data=${JSON.stringify(deptChartData)}}:::`;
        }
        return result;
      }

      case 'get_employee_details': {
        const { employeeId } = args;
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees/${employeeId}`,
          ctx
        );
        const e = data?.data || data;
        if (!e || !e.firstName) return 'Employee not found. The ID may be invalid or the employee record is no longer available.';
        let result = `**${e.firstName} ${e.lastName}**\n`;
        result += `- Employee Code: ${e.employeeCode || 'N/A'}\n`;
        result += `- Email: ${e.email || 'N/A'}\n`;
        result += `- Phone: ${e.phone || 'N/A'}\n`;
        result += `- Department: ${e.department?.name || 'N/A'}\n`;
        result += `- Designation: ${e.designation?.name || 'N/A'}\n`;
        result += `- Status: ${e.status || 'N/A'}\n`;
        result += `- Join Date: ${formatDate(e.joinDate)}\n`;
        result += `- Date of Birth: ${formatDate(e.dateOfBirth)}\n`;
        result += `- Gender: ${e.gender || 'N/A'}\n`;
        result += `- Employment Type: ${e.employmentType || 'N/A'}\n`;
        result += `- Reporting Manager: ${e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}` : 'N/A'}\n`;
        if (Array.isArray(e.skills) && e.skills.length) {
          result += `- Skills: ${e.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill).join(', ')}\n`;
        }
        return result;
      }

      case 'get_department_list': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/departments`,
          ctx
        );
        const departments = data?.data?.items || data?.data || [];
        if (!Array.isArray(departments) || !departments.length) return 'No departments configured yet. Departments can be set up in **Settings → Departments**.';
        const list = departments.map((d: any) =>
          `- **${d.name}**${d.description ? `: ${d.description}` : ''}${d._count?.employees != null ? ` (${d._count.employees} employees)` : ''}`
        ).join('\n');
        // Chart: employees per department
        const deptCountData = departments
          .filter((d: any) => d._count?.employees != null)
          .map((d: any) => ({ name: d.name, value: d._count.employees }));
        const deptChart = deptCountData.length > 0
          ? `\n\n:::chart{type="bar" title="Employees per Department" xKey="name" yKey="value" color="#3b82f6" data=${JSON.stringify(deptCountData)}}:::`
          : '';
        return `Departments (${departments.length}):\n${list}${deptChart}`;
      }

      case 'get_celebrations_today': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees/celebrations/today`,
          ctx
        );
        const celebrations = data?.data || data;
        const birthdays = celebrations?.birthdaysToday || [];
        const anniversaries = celebrations?.anniversariesToday || [];
        if (!birthdays.length && !anniversaries.length) return 'No birthdays or work anniversaries to celebrate today. 🎉';
        let result = '🎉 **Today\'s Celebrations:**\n';
        if (birthdays.length) {
          result += '\n**Birthdays:**\n';
          result += birthdays.map((e: any) => `- 🎂 ${e.firstName} ${e.lastName} (${e.department?.name || e.department || 'N/A'})`).join('\n');
        }
        if (anniversaries.length) {
          result += '\n\n**Work Anniversaries:**\n';
          result += anniversaries.map((e: any) => `- 🥳 ${e.firstName} ${e.lastName} — ${e.years || '?'} year(s) (${e.department?.name || e.department || 'N/A'})`).join('\n');
        }
        return result;
      }

      // ====================================================================
      // ATTENDANCE TOOLS
      // ====================================================================

      case 'get_attendance_overview': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/attendance/overview/today`,
          ctx
        );
        const overview = data?.data || data;
        let attendanceResult = `Today's attendance overview:\n- Total Employees: ${overview?.totalEmployees ?? overview?.total ?? 'N/A'}\n- Present: ${overview?.present ?? 'N/A'}\n- Absent: ${overview?.absent ?? 'N/A'}\n- Late: ${overview?.late ?? 'N/A'}\n- On Leave: ${overview?.onLeave ?? 'N/A'}\n- Work From Home: ${overview?.workFromHome ?? 'N/A'}\n- Present Rate: ${overview?.presentRate != null ? overview.presentRate + '%' : 'N/A'}`;
        // Chart: attendance status breakdown
        const attendanceChartData = [
          { name: 'Present', value: overview?.present ?? 0 },
          { name: 'Absent', value: overview?.absent ?? 0 },
          { name: 'Late', value: overview?.late ?? 0 },
          { name: 'On Leave', value: overview?.onLeave ?? 0 },
          { name: 'WFH', value: overview?.workFromHome ?? 0 },
        ].filter(d => d.value > 0);
        if (attendanceChartData.length > 0) {
          attendanceResult += `\n\n:::chart{type="doughnut" title="Today's Attendance Breakdown" xKey="name" yKey="value" color="#10b981" data=${JSON.stringify(attendanceChartData)}}:::`;
        }
        return attendanceResult;
      }

      case 'get_my_attendance': {
        const now = new Date();
        const month = args.month || (now.getMonth() + 1);
        const year = args.year || now.getFullYear();
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/attendance/me?month=${month}&year=${year}`,
          ctx
        );
        const records = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
        if (!records.length) return `No attendance records found for ${month}/${year}. You may not have checked in yet this period.`;
        const list = records.slice(0, 20).map((r: any) =>
          `- ${formatDate(r.date)}: Check-in ${r.checkIn ? formatDateTime(r.checkIn) : '—'} | Check-out ${r.checkOut ? formatDateTime(r.checkOut) : '—'} | ${r.status || 'N/A'}${r.workHours ? ` | ${r.workHours}h` : ''}`
        ).join('\n');
        // Chart: work hours over the month
        const hoursData = records
          .filter((r: any) => r.workHours != null)
          .map((r: any) => {
            const d = new Date(r.date);
            return { name: `${d.getDate()}/${d.getMonth() + 1}`, value: parseFloat(r.workHours) || 0 };
          });
        const hoursChart = hoursData.length > 0
          ? `\n\n:::chart{type="area" title="Work Hours (${month}/${year})" xKey="name" yKey="value" color="#6366f1" data=${JSON.stringify(hoursData)}}:::`
          : '';
        return `Your attendance for ${month}/${year} (${records.length} records):\n${list}${hoursChart}`;
      }

      // ====================================================================
      // LEAVE TOOLS
      // ====================================================================

      case 'get_employees_on_leave_today': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests?status=approved&dateFrom=${todayStr()}&dateTo=${todayStr()}&pageSize=50`,
          ctx
        );
        const leaves = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
        if (!leaves.length) return 'No employees are on leave today. Everyone is expected to be available!';
        const list = leaves.map((l: any) =>
          `- **${l.employee?.firstName || ''} ${l.employee?.lastName || ''}** (${l.leaveType?.name || l.type || 'Leave'}): ${formatDate(l.fromDate)} to ${formatDate(l.toDate)}${l.reason ? ` — ${l.reason}` : ''}`
        ).join('\n');
        // Chart: on-leave by leave type
        const leaveTypeCount: Record<string, number> = {};
        for (const l of leaves) {
          const lt = l.leaveType?.name || l.type || 'Leave';
          leaveTypeCount[lt] = (leaveTypeCount[lt] || 0) + 1;
        }
        const onLeaveChartData = Object.entries(leaveTypeCount).map(([name, value]) => ({ name, value }));
        const onLeaveChart = onLeaveChartData.length > 0
          ? `\n\n:::chart{type="pie" title="On Leave Today by Type" xKey="name" yKey="value" color="#ef4444" data=${JSON.stringify(onLeaveChartData)}}:::`
          : '';
        return `Employees on leave today (${leaves.length}):\n${list}${onLeaveChart}`;
      }

      case 'get_pending_leave_requests': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests?status=pending&pageSize=20`,
          ctx
        );
        const requests = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
        if (!requests.length) return 'No pending leave requests to review. All caught up! ✅';
        const list = requests.map((r: any) => {
          const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim();
          const leaveType = r.leaveType?.name || r.type || 'Leave';
          const lines = `- **${empName}** | ${leaveType} | ${formatDate(r.fromDate)} to ${formatDate(r.toDate)} | Reason: ${r.reason || 'N/A'}`;
          // Add approve/reject action buttons per request
          const approveData = JSON.stringify({ requestId: r.id, employeeName: empName, leaveType, fromDate: r.fromDate, toDate: r.toDate });
          const rejectData = JSON.stringify({ requestId: r.id, employeeName: empName, leaveType, fromDate: r.fromDate, toDate: r.toDate });
          return `${lines}\n:::action{type="approve_leave" label="\u2705 Approve" data=${approveData}}:::\n:::action{type="reject_leave" label="\u274C Reject" data=${rejectData}}:::`;
        }).join('\n');
        // Chart: pending requests by leave type
        const pendingTypeCount: Record<string, number> = {};
        for (const r of requests) {
          const lt = r.leaveType?.name || r.type || 'Leave';
          pendingTypeCount[lt] = (pendingTypeCount[lt] || 0) + 1;
        }
        const pendingChartData = Object.entries(pendingTypeCount).map(([name, value]) => ({ name, value }));
        const pendingChart = pendingChartData.length > 1
          ? `\n\n:::chart{type="bar" title="Pending Requests by Leave Type" xKey="name" yKey="value" color="#f97316" data=${JSON.stringify(pendingChartData)}}:::`
          : '';
        return `Pending leave requests (${requests.length}):\n${list}${pendingChart}`;
      }

      case 'approve_leave_request': {
        const { requestId, remarks } = args;
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests/approve`,
          ctx,
          { method: 'POST', body: { leaveRequestId: requestId, approverId: ctx.userId, comments: remarks } }
        );
        return data?.message || `✅ Leave request has been approved successfully.`;
      }

      case 'reject_leave_request': {
        const { requestId, reason } = args;
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/requests/reject`,
          ctx,
          { method: 'POST', body: { leaveRequestId: requestId, approverId: ctx.userId, reason } }
        );
        return data?.message || `❌ Leave request has been rejected. Reason: ${reason}`;
      }

      case 'get_my_leave_balance': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/balances/me`,
          ctx
        );
        const balances = Array.isArray(data?.data) ? data.data : data?.data?.items || data?.balances || [];
        if (!Array.isArray(balances) || !balances.length) return 'No leave balance information found. You may not have an employee record linked to your account. Please contact HR or your administrator to set up your leave entitlements.';
        const list = balances.map((b: any) =>
          `- **${b.leaveType?.name || b.type || 'Leave'}**: ${b.remaining ?? b.balance ?? 0} remaining (used ${b.used ?? 0} of ${b.total ?? b.allocated ?? 0})`
        ).join('\n');
        // Chart: leave balance by type
        const leaveChartData = balances.map((b: any) => ({ name: b.leaveType?.name || b.type || 'Leave', value: b.remaining ?? b.balance ?? 0 }));
        const leaveChart = leaveChartData.length > 0
          ? `\n\n:::chart{type="bar" title="Leave Balance (Remaining)" xKey="name" yKey="value" color="#f59e0b" data=${JSON.stringify(leaveChartData)}}:::`
          : '';
        return `Your leave balance:\n${list}${leaveChart}`;
      }

      case 'get_leave_balance_for_employee': {
        const { employeeId } = args;
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/leaves/balances/${employeeId}`,
          ctx
        );
        const balances = Array.isArray(data?.data) ? data.data : data?.data?.items || data?.balances || [];
        if (!Array.isArray(balances) || !balances.length) return 'No leave balance found for this employee. Their leave entitlements may not be configured yet.';
        const list = balances.map((b: any) =>
          `- **${b.leaveType?.name || b.type || 'Leave'}**: ${b.remaining ?? b.balance ?? 0} remaining (used ${b.used ?? 0} of ${b.total ?? b.allocated ?? 0})`
        ).join('\n');
        // Chart: leave balance by type
        const empLeaveChartData = balances.map((b: any) => ({ name: b.leaveType?.name || b.type || 'Leave', value: b.remaining ?? b.balance ?? 0 }));
        const empLeaveChart = empLeaveChartData.length > 0
          ? `\n\n:::chart{type="bar" title="Leave Balance (Remaining)" xKey="name" yKey="value" color="#f59e0b" data=${JSON.stringify(empLeaveChartData)}}:::`
          : '';
        return `Leave balance:\n${list}${empLeaveChart}`;
      }

      // ====================================================================
      // HOLIDAY TOOLS
      // ====================================================================

      case 'get_upcoming_holidays': {
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/holidays/upcoming`,
          ctx
        );
        const holidays = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
        if (!holidays.length) return 'No upcoming holidays found. The holiday calendar may not be configured yet for your organization. An admin can set holidays in **Settings → Holidays**.';
        const list = holidays.map((h: any) =>
          `- **${formatDate(h.date)}** — ${h.name || h.title || 'Holiday'}${h.type ? ` (${h.type})` : ''}${h.isOptional ? ' ⭐ Optional' : ''}`
        ).join('\n');
        return `Upcoming holidays:\n${list}`;
      }

      case 'get_holidays_list': {
        const year = args.year || new Date().getFullYear();
        const data = await callService(
          `${ATTENDANCE_SERVICE}/api/v1/holidays?year=${year}&limit=50`,
          ctx
        );
        const holidays = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
        if (!holidays.length) return `No holidays configured for ${year}. An admin can add holidays in **Settings → Holidays**.`;
        const list = holidays.map((h: any) =>
          `- **${formatDate(h.date)}** — ${h.name || h.title || 'Holiday'}${h.type ? ` (${h.type})` : ''}${h.isOptional ? ' ⭐ Optional' : ''}`
        ).join('\n');

        // Build monthly breakdown chart
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyCounts = new Array(12).fill(0);
        for (const h of holidays) {
          try {
            const month = new Date(h.date).getMonth();
            monthlyCounts[month]++;
          } catch { /* skip invalid dates */ }
        }
        const chartData = monthNames.map((name, i) => ({ name, value: monthlyCounts[i] }));
        const chart = `\n\n:::chart{type="bar" title="Holidays by Month (${year})" xKey="name" yKey="value" color="#f59e0b" data=${JSON.stringify(chartData)}}:::`;

        return `Holiday list for ${year} (${holidays.length} holidays):\n${list}${chart}`;
      }
      case 'create_holiday': {
        const holidayData = JSON.stringify({
          name: args.name,
          date: args.date,
          type: args.type || 'public',
          description: args.description || '',
        });
        return `I've prepared the holiday details:\n\n- **Name:** ${args.name}\n- **Date:** ${args.date}\n- **Type:** ${args.type || 'public'}${args.description ? `\n- **Description:** ${args.description}` : ''}\n\nClick below to create it:\n\n:::action{type="create_holiday" label="\ud83c\udf89 Create Holiday" data=${holidayData}}:::`;
      }
      // ====================================================================
      // INTERVIEW & RECRUITMENT TOOLS
      // ====================================================================

      case 'get_interviews_today': {
        const today = todayStr();
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/interviews/today`,
          ctx
        );
        // This endpoint returns raw array
        const interviews = Array.isArray(data) ? data : data?.data || [];
        if (!interviews.length) return 'No interviews scheduled for today. The recruitment pipeline is clear for now.';
        const list = interviews.map((i: any) =>
          `- **${i.candidate?.name || i.candidateName || 'Unknown'}** — ${i.jobTitle || i.job?.title || 'N/A'} | ${formatDateTime(i.scheduledAt || i.scheduledDate)} | Interviewer: ${i.interviewer?.name || i.interviewerName || 'N/A'} | Status: ${i.status || 'scheduled'}`
        ).join('\n');
        return `Today's interviews (${interviews.length}):\n${list}`;
      }

      case 'search_interviews': {
        const params = new URLSearchParams();
        if (args.status) params.set('status', args.status);
        if (args.fromDate) params.set('fromDate', args.fromDate);
        if (args.toDate) params.set('toDate', args.toDate);
        params.set('limit', '15');
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/interviews?${params.toString()}`,
          ctx
        );
        // This endpoint returns raw array
        const interviews = Array.isArray(data) ? data : data?.data?.items || data?.data || [];
        if (!interviews.length) {
          return args.status
            ? `No interviews found with status "${args.status}". Try a different filter or check if interviews have been scheduled.`
            : 'No interviews found. No interviews have been scheduled yet. You can schedule interviews from the **Recruitment** module.';
        }
        const list = interviews.map((i: any) =>
          `- **${i.candidate?.name || i.candidateName || 'Unknown'}** for ${i.jobTitle || i.job?.title || 'N/A'} | ${formatDateTime(i.scheduledAt || i.scheduledDate)} | Interviewer: ${i.interviewer?.name || i.interviewerName || 'N/A'} | Status: ${i.status}`
        ).join('\n');
        return `Interviews (${interviews.length}):\n${list}`;
      }

      case 'get_interview_stats': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/interviews/stats`,
          ctx
        );
        // Returns direct object (no wrapper)
        const s = data?.data || data;
        return `Interview & Recruitment Statistics:\n- Total Scheduled: ${s.totalScheduled ?? 'N/A'}\n- Completed: ${s.totalCompleted ?? 'N/A'}\n- Cancelled: ${s.totalCancelled ?? 'N/A'}\n- No-shows: ${s.totalNoShow ?? 'N/A'}\n- Pass Rate: ${s.passRate != null ? s.passRate + '%' : 'N/A'}\n- Avg Feedback Time: ${s.avgFeedbackTime != null ? s.avgFeedbackTime + ' days' : 'N/A'}\n- Upcoming Today: ${s.upcomingToday ?? 'N/A'}\n- Upcoming This Week: ${s.upcomingWeek ?? 'N/A'}\n- Total Upcoming: ${s.upcomingAll ?? 'N/A'}\n\n` +
          (() => {
            const interviewChartData = [
              { name: 'Scheduled', value: s.totalScheduled ?? 0 },
              { name: 'Completed', value: s.totalCompleted ?? 0 },
              { name: 'Cancelled', value: s.totalCancelled ?? 0 },
              { name: 'No-show', value: s.totalNoShow ?? 0 },
            ].filter(d => d.value > 0);
            return interviewChartData.length > 0
              ? `:::chart{type="bar" title="Interview Status Overview" xKey="name" yKey="value" color="#8b5cf6" data=${JSON.stringify(interviewChartData)}}:::`
              : '';
          })();
      }

      case 'get_candidate_interviews': {
        const { candidateId } = args;
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/interviews?candidateId=${candidateId}`,
          ctx
        );
        const interviews = Array.isArray(data) ? data : data?.data || [];
        if (!interviews.length) return 'No interviews found for this candidate.';
        const list = interviews.map((i: any) =>
          `- ${formatDateTime(i.scheduledAt || i.scheduledDate)} | ${i.jobTitle || i.job?.title || 'N/A'} | Interviewer: ${i.interviewer?.name || i.interviewerName || 'N/A'} | Status: ${i.status} | ${i.feedback ? 'Feedback: ' + i.feedback : 'No feedback yet'}`
        ).join('\n');
        return `Interviews for this candidate (${interviews.length}):\n${list}`;
      }

      case 'schedule_interview': {
        const interviewData = JSON.stringify({
          candidateId: args.candidateId,
          candidateName: args.candidateName,
          jobId: args.jobId || '',
          jobTitle: args.jobTitle || '',
        });
        return `I'll help you schedule an interview for **${args.candidateName}**${args.jobTitle ? ` for the **${args.jobTitle}** position` : ''}.\n\nClick below to open the scheduling form where you can set the date, time, interviewers, and more:\n\n:::action{type="schedule_interview" label="\ud83d\udcc5 Schedule Interview" data=${interviewData}}:::`;
      }

      // ====================================================================
      // JOB DESCRIPTION TOOLS
      // ====================================================================

      case 'search_jobs': {
        const params = new URLSearchParams();
        if (args.status) params.set('status', args.status);
        if (args.search) params.set('search', args.search);
        params.set('limit', '15');
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/jobs?${params.toString()}`,
          ctx
        );
        // Returns raw array
        const jobs = Array.isArray(data) ? data : data?.data?.items || data?.data || [];
        if (!jobs.length) {
          return args.search
            ? `No job openings found matching "${args.search}".`
            : 'No job descriptions found. No positions have been created yet. You can create them in the **Recruitment → Job Descriptions** section.';
        }
        const list = jobs.map((j: any) =>
          `- **${j.title}** | ${j.department || 'N/A'} | ${j.employmentType || 'N/A'} | Status: ${j.status || 'draft'} | Experience: ${j.experienceMin ?? '?'}–${j.experienceMax ?? '?'} yrs | Posted: ${formatDate(j.createdAt)}`
        ).join('\n');
        // Chart: jobs by status
        const jobStatusCount: Record<string, number> = {};
        for (const j of jobs) {
          const st = j.status || 'draft';
          jobStatusCount[st] = (jobStatusCount[st] || 0) + 1;
        }
        const jobChartData = Object.entries(jobStatusCount).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
        const jobChart = jobChartData.length > 1
          ? `\n\n:::chart{type="bar" title="Jobs by Status" xKey="name" yKey="value" color="#ec4899" data=${JSON.stringify(jobChartData)}}:::`
          : '';
        return `Job Openings (${jobs.length}):\n${list}${jobChart}`;
      }

      case 'generate_job_description': {
        const { generateJobContent } = await import('./job.service');
        const content = await generateJobContent(ctx.tenantSlug, {
          title: args.title,
          department: args.department,
          employmentType: args.employmentType,
          experienceMin: args.experienceMin,
          experienceMax: args.experienceMax,
        });
        const requirements = (content.requirements || []).map((r: string) => `- ${r}`).join('\n');
        const responsibilities = (content.responsibilities || []).map((r: string) => `- ${r}`).join('\n');
        const benefits = (content.benefits || []).map((b: string) => `- ${b}`).join('\n');
        
        // Build the action data for the Create Job button
        const actionData = JSON.stringify({
          title: args.title,
          department: args.department || '',
          employmentType: args.employmentType || 'FULL_TIME',
          experienceMin: args.experienceMin || 0,
          experienceMax: args.experienceMax || 0,
          description: content.description || '',
          requirements: content.requirements || [],
          responsibilities: content.responsibilities || [],
          benefits: content.benefits || [],
        });
        
        return `Here's the generated job description for **"${args.title}"**:\n\n**Description:**\n${content.description}\n\n**Requirements:**\n${requirements}\n\n**Responsibilities:**\n${responsibilities}\n\n**Benefits:**\n${benefits}\n\n:::action{type="create_job" label="Create this Job" data=${actionData}}:::`;
      }

      case 'get_compensation_stats': {
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/employees/compensation-stats`,
          ctx
        );
        const stats = data?.data || data;
        if (!stats || (!stats.employeesWithSalary && !stats.totalPayroll)) {
          return 'No compensation data available. Employee salary information has not been set up yet. You can add salary details in each employee\'s profile.';
        }

        let result = `**Compensation Overview:**\n`;
        result += `- Total Payroll: **${stats.currency || '₹'}${(stats.totalPayroll || 0).toLocaleString()}**/month\n`;
        result += `- Average Salary: **${stats.currency || '₹'}${(stats.avgSalary || 0).toLocaleString()}**/month\n`;
        result += `- Employees with salary data: **${stats.employeesWithSalary || 0}**\n`;
        if (stats.employeesWithoutSalary) result += `- Employees without salary data: ${stats.employeesWithoutSalary}\n`;

        // Build chart data for salary bands
        if (Array.isArray(stats.salaryBands) && stats.salaryBands.length) {
          const chartData = stats.salaryBands
            .filter((b: any) => b.count > 0)
            .map((b: any) => ({ name: b.range, value: b.count }));
          if (chartData.length > 0) {
            result += `\n:::chart{type="bar" title="Salary Distribution" xKey="name" yKey="value" color="#8b5cf6" data=${JSON.stringify(chartData)}}:::`;
          }
        }

        // Build chart data for department-wise salaries
        if (Array.isArray(stats.departmentSalaries) && stats.departmentSalaries.length) {
          result += `\n\n**Department-wise Compensation:**\n`;
          const deptChartData = stats.departmentSalaries.map((d: any) => ({
            name: d.department,
            value: d.avgSalary,
            employees: d.employeeCount,
          }));
          result += `\n:::chart{type="bar" title="Avg Salary by Department" xKey="name" yKey="value" color="#ec4899" data=${JSON.stringify(deptChartData)}}:::`;
          
          result += `\n\n| Department | Employees | Avg Salary | Total |\n|---|---|---|---|\n`;
          result += stats.departmentSalaries.map((d: any) =>
            `| ${d.department} | ${d.employeeCount} | ${stats.currency || '₹'}${(d.avgSalary || 0).toLocaleString()} | ${stats.currency || '₹'}${(d.totalSalary || 0).toLocaleString()} |`
          ).join('\n');
        }

        return result;
      }

      // ====================================================================
      // CANDIDATE TOOLS
      // ====================================================================

      case 'search_candidates': {
        const params = new URLSearchParams();
        if (args.search) params.set('search', args.search);
        if (args.status) params.set('status', args.status);
        params.set('limit', '15');
        const data = await callService(
          `${EMPLOYEE_SERVICE}/api/v1/candidates?${params.toString()}`,
          ctx
        );
        // Returns raw array
        const candidates = Array.isArray(data) ? data : data?.data?.items || data?.data || [];
        if (!candidates.length) {
          return args.search
            ? `No candidates found matching "${args.search}". Try searching by name, email, or skills.`
            : 'No candidates found. The candidate pipeline is currently empty. Candidates can be added from the **Recruitment** module.';
        }
        const list = candidates.map((c: any) => {
          const skills = Array.isArray(c.skills) ? c.skills.map((s: any) => typeof s === 'string' ? s : s.name).join(', ') : '';
          return `- **${c.name || `${c.firstName || ''} ${c.lastName || ''}`}** | ${c.email || 'N/A'} | Status: ${c.status || 'new'} | Experience: ${c.experience ?? 'N/A'} yrs${skills ? ` | Skills: ${skills}` : ''}${c.jobTitle || c.job?.title ? ` | Applied for: ${c.jobTitle || c.job?.title}` : ''}`;
        }).join('\n');
        // Chart: candidates by pipeline status
        const statusCount: Record<string, number> = {};
        for (const c of candidates) {
          const st = c.status || 'new';
          statusCount[st] = (statusCount[st] || 0) + 1;
        }
        const candidateChartData = Object.entries(statusCount).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
        const candidateChart = candidateChartData.length > 1
          ? `\n\n:::chart{type="pie" title="Candidates by Status" xKey="name" yKey="value" color="#8b5cf6" data=${JSON.stringify(candidateChartData)}}:::`
          : '';
        return `Candidates (${candidates.length}):\n${list}${candidateChart}`;
      }

      // ====================================================================
      // PERFORMANCE TOOLS
      // ====================================================================

      case 'get_employee_performance': {
        const { employeeId } = args;
        try {
          const data = await callService(
            `${EMPLOYEE_SERVICE}/api/v1/performance-reviews?employeeId=${employeeId}&limit=5`,
            ctx
          );
          const reviews = Array.isArray(data) ? data : data?.data?.items || data?.data || [];
          if (!reviews.length) return 'No performance reviews found for this employee. Performance reviews may not have been conducted yet, or this feature is not configured.';
          const list = reviews.map((r: any) =>
            `- **${r.reviewPeriod || r.period || 'Review'}** | Rating: ${r.rating ?? r.overallRating ?? 'N/A'}/5 | Status: ${r.status || 'N/A'} | Reviewer: ${r.reviewer?.name || r.reviewerName || 'N/A'} | Date: ${formatDate(r.reviewDate || r.createdAt)}`
          ).join('\n');
          // Chart: performance ratings over time
          const ratingData = reviews
            .filter((r: any) => (r.rating ?? r.overallRating) != null)
            .map((r: any) => ({ name: r.reviewPeriod || r.period || formatDate(r.reviewDate || r.createdAt), value: r.rating ?? r.overallRating }));
          const ratingChart = ratingData.length > 0
            ? `\n\n:::chart{type="line" title="Performance Ratings Over Time" xKey="name" yKey="value" color="#10b981" data=${JSON.stringify(ratingData)}}:::`
            : '';
          return `Performance reviews (${reviews.length}):\n${list}${ratingChart}`;
        } catch (err: any) {
          // Performance reviews table may have schema issues
          logger.warn({ err: err.message, employeeId }, 'Performance review query failed');
          return 'The performance review module is currently being updated. Performance data is temporarily unavailable. Please try again later or check the **Performance** section in the app.';
        }
      }

      case 'create_performance_review': {
        const reviewData = JSON.stringify({
          employeeId: args.employeeId,
          employeeName: args.employeeName,
          reviewPeriod: args.reviewPeriod || '',
          reviewType: args.reviewType || 'quarterly',
        });
        return `I'll help you create a performance review for **${args.employeeName}**.\n\n- **Review Period:** ${args.reviewPeriod || 'Not specified'}\n- **Type:** ${args.reviewType || 'quarterly'}\n\nClick below to open the review form with full rating criteria:\n\n:::action{type="create_performance_review" label="\ud83d\udcdd Write Performance Review" data=${reviewData}}:::`;
      }

      // ====================================================================
      // DOCUMENT TOOLS
      // ====================================================================

      case 'get_employee_documents': {
        const { employeeId } = args;
        const data = await callService(
          `${DOCUMENT_SERVICE}/api/documents/files?employeeId=${employeeId}&limit=20`,
          ctx
        );
        const files = data?.data || [];
        if (!Array.isArray(files) || !files.length) return 'No documents found for this employee. Documents can be uploaded from the employee profile or the **Documents** module.';
        const list = files.map((f: any) =>
          `- 📄 **${f.originalName || f.name || 'Untitled'}** | Type: ${f.documentType || f.mimeType || 'N/A'} | Uploaded: ${formatDate(f.createdAt || f.uploadedAt)} | Size: ${f.size ? Math.round(f.size / 1024) + ' KB' : 'N/A'}`
        ).join('\n');
        return `Documents (${files.length}):\n${list}`;
      }

      case 'get_recent_documents': {
        const data = await callService(
          `${DOCUMENT_SERVICE}/api/documents/files/recent?limit=15`,
          ctx
        );
        const files = data?.data || [];
        if (!Array.isArray(files) || !files.length) return 'No recent documents found. Documents can be uploaded in the **Documents** section of the app.';
        const list = files.map((f: any) =>
          `- 📄 **${f.originalName || f.name || 'Untitled'}** | Uploaded by: ${f.uploadedBy?.name || f.createdByName || 'N/A'} | ${formatDate(f.createdAt || f.uploadedAt)} | Size: ${f.size ? Math.round(f.size / 1024) + ' KB' : 'N/A'}`
        ).join('\n');
        return `Recently uploaded documents:\n${list}`;
      }

      // ====================================================================
      // NOTIFICATION TOOLS
      // ====================================================================

      case 'get_my_notifications': {
        const params = new URLSearchParams();
        params.set('limit', '15');
        if (args.unreadOnly) params.set('unread', 'true');
        const data = await callService(
          `${NOTIFICATION_SERVICE}/api/notifications?${params.toString()}`,
          ctx
        );
        const notifications = data?.data || [];
        const unreadCount = data?.unreadCount ?? 0;
        if (!Array.isArray(notifications) || !notifications.length) return 'You have no notifications. You\'re all caught up! 🎉';
        const list = notifications.map((n: any) =>
          `- ${n.read ? '📖' : '🔔'} **${n.title || n.type || 'Notification'}**: ${n.message || n.body || 'N/A'} — ${formatDateTime(n.createdAt)}${n.actionUrl ? ` | [View](${n.actionUrl})` : ''}`
        ).join('\n');
        return `Your notifications (${unreadCount} unread):\n${list}`;
      }

      // ====================================================================
      // PROJECT / TASK TOOLS
      // ====================================================================

      case 'get_my_tasks': {
        const params = new URLSearchParams();
        if (args.status) params.set('status', args.status);
        params.set('limit', '20');
        const data = await callService(
          `${PROJECT_SERVICE}/api/v1/projects/my?${params.toString()}`,
          ctx
        );
        const projects = data?.data || data?.projects || [];
        if (!projects.length) return 'No projects or tasks found assigned to you. Tasks can be created in the **Projects** module.';
        const tasks: string[] = [];
        for (const p of projects) {
          const projectTasks = p.tasks || [];
          for (const t of projectTasks) {
            tasks.push(`- [**${t.status}**] ${t.title} (Project: ${p.name}) | Priority: ${t.priority || 'N/A'} | Due: ${formatDate(t.dueDate)}`);
          }
        }
        if (!tasks.length) return `You have ${projects.length} project(s) but no tasks assigned directly. Tasks can be assigned in the project board.`;
        return `Your tasks (${tasks.length}):\n${tasks.join('\n')}`;
      }

      // ====================================================================

      default:
        return `I don't recognize the action "${toolName}". This may be a feature that hasn't been set up yet.`;
    }
  } catch (error: any) {
    logger.error({ error: error.message, toolName, stack: error.stack }, 'Tool execution failed');

    // Provide user-friendly error messages
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('unauthorized') || msg.includes('403') || msg.includes('forbidden')) {
      return `You don't have permission to perform this action. Please contact your administrator to check your access rights.`;
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return `The requested resource was not found. It may have been deleted or doesn't exist in your organization.`;
    }
    if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network')) {
      return `The service is currently unavailable. Please try again in a moment, or contact your system administrator if the issue persists.`;
    }
    return `I couldn't complete that action: ${error.message}. Please try again or contact support if the issue persists.`;
  }
}
