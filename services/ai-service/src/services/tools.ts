/**
 * AI Chat Tools - Tool definitions for OpenAI function calling
 * These map to internal service API calls
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export const AI_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_employees_on_leave_today',
      description: 'Get a list of employees who are on leave today. Useful for answering "who is on leave today?", "who is absent?", etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_leave_requests',
      description: 'Get pending leave requests awaiting approval. Use when someone asks about pending approvals or leave requests to review.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
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
          requestId: {
            type: 'string',
            description: 'The ID of the leave request to approve',
          },
          remarks: {
            type: 'string',
            description: 'Optional remarks/reason for approval',
          },
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
          requestId: {
            type: 'string',
            description: 'The ID of the leave request to reject',
          },
          reason: {
            type: 'string',
            description: 'Reason for rejection (required)',
          },
        },
        required: ['requestId', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'Search for employees by name, department, designation, or status. Use for questions like "find employees in engineering", "who is the CTO?", etc.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term (name, email, employee code)',
          },
          department: {
            type: 'string',
            description: 'Filter by department name',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'],
            description: 'Filter by employee status',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_tasks',
      description: 'Get tasks assigned to the current user. Use for "what are my tasks?", "my pending work", "my overdue tasks", etc.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            description: 'Filter by task status',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_leave_balance',
      description: 'Get the current user\'s leave balance. Use for "how many leaves do I have?", "my leave balance", etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_attendance_overview',
      description: 'Get today\'s attendance overview: who checked in, who is late, total present/absent. Use for attendance-related questions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_stats',
      description: 'Get organization employee statistics: total count, department breakdown, status counts. Use for "how many employees?", "team stats", etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_job_description',
      description: 'Generate a job description. Use when someone asks to create or write a JD.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Job title (e.g., "Senior Frontend Developer")',
          },
          department: {
            type: 'string',
            description: 'Department name',
          },
          employmentType: {
            type: 'string',
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
            description: 'Type of employment',
          },
          experienceMin: {
            type: 'number',
            description: 'Minimum years of experience',
          },
          experienceMax: {
            type: 'number',
            description: 'Maximum years of experience',
          },
        },
        required: ['title'],
      },
    },
  },
];

export const TOOL_NAMES = AI_TOOLS.map(t => t.function.name);
