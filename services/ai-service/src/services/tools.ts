/**
 * AI Chat Tools - Tool definitions for OpenAI function calling
 * These map to internal service API calls across all modules
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// ============================================================================
// EMPLOYEE MODULE
// ============================================================================

const employeeTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'Search for employees by name, department, designation, or status. Use for "list all employees", "find employees in engineering", "who is the CTO?", "show me all active employees", etc.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by name, email, or employee code' },
          department: { type: 'string', description: 'Filter by department name' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'], description: 'Filter by employee status' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_stats',
      description: 'Get organization-wide employee statistics: total count, active count, department breakdown. Use for "how many employees?", "team size", "org stats", etc.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_details',
      description: 'Get detailed information about a specific employee by their ID. Use after searching for an employee to get full details like personal info, designation, department, skills, etc.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'The employee ID (UUID)' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_department_list',
      description: 'Get the list of all departments in the organization. Use for "which departments exist?", "show departments", "org structure".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_skills',
      description: 'Get the technical skills of a specific employee. Use for "what skills does [name] have?", "show skills for employee", "technical skills of [name]". Requires employeeId — search for the employee first if you only have a name.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'The employee ID (UUID)' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_celebrations_today',
      description: 'Get today\'s birthdays and work anniversaries. Use for "any birthdays today?", "who is celebrating today?", "anniversaries".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ============================================================================
// ATTENDANCE MODULE
// ============================================================================

const attendanceTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_attendance_overview',
      description: 'Get company-wide attendance overview for today OR a specific date: present, absent, late, on leave, work from home counts. Use for "who is present?", "attendance today", "how many absent?", "who was present yesterday?", "attendance on March 17th", "who was present on 2026-03-15?". Pass a date in YYYY-MM-DD format for historical queries; omit for today.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Omit for today.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_attendance',
      description: 'Get the current user\'s own attendance records. Use for "my attendance", "my check-in history", "when did I check in?".',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'number', description: 'Month number (1-12)' },
          year: { type: 'number', description: 'Year (e.g. 2026)' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// LEAVE MODULE
// ============================================================================

const leaveTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_employees_on_leave_today',
      description: 'Get a list of employees who are on approved leave today. Use for "who is on leave today?", "who is absent on leave?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_leave_requests',
      description: 'Get leave requests that are pending approval. Use for "pending leave requests", "leaves to approve", "pending approvals".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_leave_request',
      description: 'Approve a specific leave request by its ID. Only use when the user explicitly asks to approve a leave.',
      parameters: {
        type: 'object',
        properties: {
          requestId: { type: 'string', description: 'The leave request ID' },
          remarks: { type: 'string', description: 'Optional remarks for approval' },
        },
        required: ['requestId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reject_leave_request',
      description: 'Reject a specific leave request by its ID. Only use when the user explicitly asks to reject a leave.',
      parameters: {
        type: 'object',
        properties: {
          requestId: { type: 'string', description: 'The leave request ID' },
          reason: { type: 'string', description: 'Reason for rejection (required)' },
        },
        required: ['requestId', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_leave_balance',
      description: 'Get the current user\'s leave balance breakdown. Use for "how many leaves do I have?", "my leave balance", "remaining leaves".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leave_balance_for_employee',
      description: 'Get leave balance for a specific employee. Use for "how many leaves does [name] have?", "[name]\'s leave balance". Requires employeeId from a search.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'The employee ID (UUID)' },
        },
        required: ['employeeId'],
      },
    },
  },
];

// ============================================================================
// HOLIDAY MODULE
// ============================================================================

const holidayTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_upcoming_holidays',
      description: 'Get upcoming holidays for the organization. Use for "next holiday", "upcoming holidays", "when is the next day off?", "holiday calendar".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_holidays_list',
      description: 'Get the full holiday list with optional year filter. Use for "all holidays this year", "holiday list 2026", "how many holidays?".',
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'number', description: 'Year to filter (e.g. 2026). Defaults to current year if omitted.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_holiday',
      description: 'Create a new holiday / day-off for the organization. Use when someone says "add a holiday", "create holiday for Diwali", "add day off on March 14". After collecting details, provide an action button so the user can confirm creation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Holiday name (e.g., "Diwali", "Christmas", "Republic Day")' },
          date: { type: 'string', description: 'Holiday date in YYYY-MM-DD format' },
          type: { type: 'string', enum: ['public', 'optional', 'restricted'], description: 'Holiday type: public (mandatory), optional, or restricted' },
          description: { type: 'string', description: 'Optional description of the holiday' },
        },
        required: ['name', 'date'],
      },
    },
  },
];

// ============================================================================
// INTERVIEW & RECRUITMENT MODULE
// ============================================================================

const interviewTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_interviews_today',
      description: 'Get interviews scheduled for today. Use for "any interviews today?", "today\'s interview schedule", "who has interviews?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_interviews',
      description: 'Search and list interviews with filters. Use for "upcoming interviews", "all scheduled interviews", "interviews this week", "interview list".',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'], description: 'Filter by interview status' },
          fromDate: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
          toDate: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_interview_stats',
      description: 'Get interview/recruitment statistics: total scheduled, completed, pass rate, upcoming counts. Use for "interview stats", "recruitment metrics", "how many interviews?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_candidate_interviews',
      description: 'Get all interviews for a specific candidate. Use for "interviews for [candidate name]", "what interviews does [name] have?". Requires candidateId from a candidate search.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'Candidate ID (UUID)' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_interview',
      description: 'Schedule a new interview for a candidate. Use when someone says "schedule interview for [candidate]", "set up interview", "book interview slot". Requires candidateId from search_candidates. After collecting details, provides an action button to open the scheduling form.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'Candidate ID (UUID) — must be obtained from search_candidates first' },
          candidateName: { type: 'string', description: 'Candidate name for display' },
          jobId: { type: 'string', description: 'Job ID the candidate is being interviewed for' },
          jobTitle: { type: 'string', description: 'Job title for display' },
        },
        required: ['candidateId', 'candidateName'],
      },
    },
  },
];

// ============================================================================
// JOB DESCRIPTION MODULE
// ============================================================================

const jobTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_jobs',
      description: 'Search and list job descriptions/openings. Use for "open positions", "job openings", "active jobs", "what roles are we hiring for?".',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'on_hold', 'closed', 'completed'], description: 'Filter by job status (open, on_hold, closed, completed)' },
          search: { type: 'string', description: 'Search by job title or keyword' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_job_description',
      description: 'Generate a new job description using AI. Use when someone asks to create or write a JD for a specific role. After generation, offer the user a button to create it in the system.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Job title (e.g., "Senior Frontend Developer")' },
          department: { type: 'string', description: 'Department name' },
          employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], description: 'Employment type' },
          experienceMin: { type: 'number', description: 'Minimum years of experience' },
          experienceMax: { type: 'number', description: 'Maximum years of experience' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_compensation_stats',
      description: 'Get salary/compensation statistics including department-wise breakdown, salary bands, total payroll, and average salary. Use for "salary chart", "compensation overview", "payroll stats", "department-wise salary", "salary distribution".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ============================================================================
// CANDIDATE MODULE
// ============================================================================

const candidateTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_candidates',
      description: 'Search for candidates across all jobs. Use for "list candidates", "candidates with React skills", "find candidate [name]", "how many candidates?".',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by candidate name, email, or skills' },
          status: { type: 'string', enum: ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn'], description: 'Filter by candidate pipeline status' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// PERFORMANCE MODULE
// ============================================================================

const performanceTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_employee_performance',
      description: 'Get performance review summary for a specific employee. Use for "how is [name] performing?", "[name]\'s performance review", "performance of [name]". Requires employeeId from search.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'Employee ID (UUID)' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_performance_review',
      description: 'Create/write a performance review for an employee. Use when someone asks to "write a review for [name]", "create performance review for [name]", "rate [name]\'s performance". Requires employeeId from a search. After collecting details, provides an action button to open the review form.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'Employee ID (UUID) — must be obtained from search_employees first' },
          employeeName: { type: 'string', description: 'Employee full name for display' },
          reviewPeriod: { type: 'string', description: 'Review period (e.g., "Mar 2026", "Q1 2026")' },
          reviewType: { type: 'string', enum: ['monthly', 'quarterly', 'annual', '360', 'probation'], description: 'Type of review' },
        },
        required: ['employeeId', 'employeeName'],
      },
    },
  },
];

// ============================================================================
// DOCUMENT MODULE
// ============================================================================

const documentTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_employee_documents',
      description: 'Get documents for a specific employee. Use for "documents of [name]", "show [name]\'s files", "[name]\'s uploaded documents". Requires employeeId.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'Employee ID (UUID)' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_documents',
      description: 'Get recently uploaded or modified documents across the organization. Use for "recent files", "latest documents", "what was uploaded recently?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ============================================================================
// NOTIFICATION MODULE
// ============================================================================

const notificationTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_notifications',
      description: 'Get the current user\'s recent notifications. Use for "my notifications", "what notifications do I have?", "any new alerts?", "what should I look at?".',
      parameters: {
        type: 'object',
        properties: {
          unreadOnly: { type: 'boolean', description: 'If true, show only unread notifications' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// PROJECT / TASK MODULE
// ============================================================================

const projectTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_tasks',
      description: 'Get tasks assigned to the current user from their projects. Use for "my tasks", "my pending work", "what am I working on?".',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'], description: 'Filter by task status' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const AI_TOOLS: ToolDefinition[] = [
  ...employeeTools,
  ...attendanceTools,
  ...leaveTools,
  ...holidayTools,
  ...interviewTools,
  ...jobTools,
  ...candidateTools,
  ...performanceTools,
  ...documentTools,
  ...notificationTools,
  ...projectTools,
];

export const TOOL_NAMES = AI_TOOLS.map(t => t.function.name);
