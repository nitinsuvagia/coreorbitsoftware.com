# API Documentation

## Office Management SaaS Platform

**Version:** 2.0  
**Base URL:** `https://api.coreorbitsoftware.com`  
**Last Updated:** March 4, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Request/Response Format](#3-requestresponse-format)
4. [Rate Limiting](#4-rate-limiting)
5. [Error Handling](#5-error-handling)
6. [API Endpoints](#6-api-endpoints)
   - [Authentication API](#61-authentication-api)
   - [Organization API](#62-organization-api)
   - [Employee API](#63-employee-api)
   - [Attendance API](#64-attendance-api)
   - [Project API](#65-project-api)
   - [Task API](#66-task-api)
   - [Document API](#67-document-api)
   - [Notification API](#68-notification-api)
   - [Report API](#69-report-api)
7. [Webhooks](#7-webhooks)
8. [SDKs & Libraries](#8-sdks--libraries)

---

## 1. Overview

### 1.1 API Architecture

The Office Management API follows RESTful principles and uses JSON for request/response payloads.

```
┌───────────────────────────────────────────────────────────────┐
│                       API GATEWAY                              │
│                 api.coreorbitsoftware.com                      │
│                                                               │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │                    REQUEST FLOW                          │ │
│   │                                                         │ │
│   │   Client ──▶ Auth ──▶ Rate Limit ──▶ Route ──▶ Service  │ │
│   │                                                         │ │
│   └─────────────────────────────────────────────────────────┘ │
│                                                               │
│   Routes:                                                     │
│   /api/auth/*         ──▶  Auth Service                      │
│   /api/employees/*    ──▶  Employee Service                  │
│   /api/attendance/*   ──▶  Attendance Service                │
│   /api/projects/*     ──▶  Project Service                   │
│   /api/tasks/*        ──▶  Task Service                      │
│   /api/documents/*    ──▶  Document Service                  │
│   /api/notifications/*──▶  Notification Service              │
│   /api/reports/*      ──▶  Report Service                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 API Versioning

All APIs are versioned. Current version: `v1`

```
https://api.coreorbitsoftware.com/api/v1/employees
```

### 1.3 Multi-Tenant Access

Tenant identification is based on:
1. **Subdomain**: `acme.coreorbitsoftware.com` → Tenant: `acme`
2. **Header**: `X-Tenant-ID: acme` (for API clients)

---

## 2. Authentication

### 2.1 Authentication Methods

| Method | Use Case |
|--------|----------|
| **JWT Bearer Token** | Web/Mobile applications |
| **API Key** | Server-to-server integrations |
| **OAuth 2.0** | Third-party applications |

### 2.2 JWT Authentication

#### Login Request
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "your-password"
}
```

#### Login Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 604800
    }
  }
}
```

#### Using the Token
```http
GET /api/employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.4 JWT Token Structure

```json
// Decoded JWT Payload
{
  "sub": "user-uuid",
  "email": "user@company.com",
  "tenantId": "tenant-uuid",
  "tenantSlug": "acme",
  "roles": ["ADMIN"],
  "permissions": ["employees:read", "employees:write"],
  "iat": 1709568000,
  "exp": 1710172800
}
```

---

## 3. Request/Response Format

### 3.1 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token |
| `Content-Type` | Yes | `application/json` |
| `X-Tenant-ID` | Conditional | Required for API key auth |
| `X-Request-ID` | No | For request tracing |
| `Accept-Language` | No | Response language (default: en) |

### 3.2 Standard Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-04T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": {
    "timestamp": "2026-03-04T10:30:00Z"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-04T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.3 Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number | `?page=1` |
| `limit` | number | Items per page (max 100) | `?limit=20` |
| `sort` | string | Sort field | `?sort=createdAt` |
| `order` | string | Sort order (asc/desc) | `?order=desc` |
| `search` | string | Search query | `?search=john` |
| `filter[field]` | string | Filter by field | `?filter[status]=ACTIVE` |

---

## 4. Rate Limiting

### 4.1 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 1000 requests | 15 minutes |
| Authentication | 5 requests | 1 minute |
| File Upload | 100 requests | 1 hour |
| Export/Report | 10 requests | 1 hour |

### 4.2 Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1709568900
```

### 4.3 Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

---

## 5. Error Handling

### 5.1 HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `409` | Conflict |
| `422` | Validation Error |
| `429` | Rate Limited |
| `500` | Server Error |

### 5.2 Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `DUPLICATE_ENTRY` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## 6. API Endpoints

### 6.1 Authentication API

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@company.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 604800
    }
  }
}
```

---

#### POST /api/auth/register
Create a new tenant account.

**Request:**
```json
{
  "companyName": "Acme Corp",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acmecorp.com",
  "password": "SecurePassword123!",
  "subdomain": "acme"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "tenant-uuid",
      "name": "Acme Corp",
      "slug": "acme"
    },
    "user": {
      "id": "user-uuid",
      "email": "john@acmecorp.com"
    }
  }
}
```

---

#### POST /api/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

---

#### POST /api/auth/logout
Logout and invalidate tokens.

**Headers:**
```http
Authorization: Bearer access-token
```

---

#### POST /api/auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@company.com"
}
```

---

#### POST /api/auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset-token",
  "password": "NewPassword123!"
}
```

---

### 6.2 Organization API

#### GET /api/organization
Get current organization details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "name": "Acme Corp",
    "slug": "acme",
    "logo": "https://...",
    "email": "admin@acme.com",
    "settings": {
      "timezone": "America/New_York",
      "dateFormat": "MM/DD/YYYY",
      "currency": "USD"
    }
  }
}
```

---

#### PUT /api/organization
Update organization details.

**Request:**
```json
{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "website": "https://acme.com"
}
```

---

#### GET /api/organization/settings
Get organization settings.

---

#### PUT /api/organization/settings
Update organization settings.

**Request:**
```json
{
  "timezone": "UTC",
  "dateFormat": "YYYY-MM-DD",
  "workingDays": [1, 2, 3, 4, 5],
  "workStartTime": "09:00",
  "workEndTime": "18:00"
}
```

---

### 6.3 Employee API

#### GET /api/employees
List all employees.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status (ACTIVE, INACTIVE, etc.) |
| `departmentId` | Filter by department |
| `search` | Search by name or email |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp-uuid",
      "employeeCode": "EMP-001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com",
      "department": {
        "id": "dept-uuid",
        "name": "Engineering"
      },
      "designation": {
        "id": "des-uuid",
        "name": "Software Engineer"
      },
      "status": "ACTIVE",
      "joinDate": "2024-01-15"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

---

#### POST /api/employees
Create a new employee.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "phone": "+1234567890",
  "departmentId": "dept-uuid",
  "designationId": "des-uuid",
  "joinDate": "2026-03-01",
  "employmentType": "FULL_TIME",
  "baseSalary": 75000
}
```

---

#### GET /api/employees/:id
Get employee details.

---

#### PUT /api/employees/:id
Update employee.

---

#### DELETE /api/employees/:id
Delete/deactivate employee.

---

### 6.4 Attendance API

#### GET /api/attendance
Get attendance records.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `date` | Filter by date (YYYY-MM-DD) |
| `startDate` | Filter start date |
| `endDate` | Filter end date |
| `employeeId` | Filter by employee |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "att-uuid",
      "employeeId": "emp-uuid",
      "employee": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "date": "2026-03-04",
      "checkIn": "2026-03-04T09:00:00Z",
      "checkOut": "2026-03-04T18:00:00Z",
      "totalHours": 9,
      "status": "PRESENT"
    }
  ]
}
```

---

#### POST /api/attendance/check-in
Clock in.

**Request:**
```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "notes": "Working from office"
}
```

---

#### POST /api/attendance/check-out
Clock out.

---

#### GET /api/attendance/leaves
Get leave requests.

---

#### POST /api/attendance/leaves
Submit leave request.

**Request:**
```json
{
  "leaveTypeId": "lt-uuid",
  "startDate": "2026-03-10",
  "endDate": "2026-03-12",
  "reason": "Family vacation"
}
```

---

#### PUT /api/attendance/leaves/:id/approve
Approve leave request (manager only).

---

#### PUT /api/attendance/leaves/:id/reject
Reject leave request (manager only).

---

### 6.5 Project API

#### GET /api/projects
List all projects.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status (ACTIVE, COMPLETED, etc.) |
| `clientId` | Filter by client |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-uuid",
      "name": "Website Redesign",
      "code": "PRJ-001",
      "client": {
        "id": "client-uuid",
        "name": "TechCorp"
      },
      "status": "IN_PROGRESS",
      "startDate": "2026-01-01",
      "endDate": "2026-06-30",
      "budget": 50000,
      "progress": 35,
      "members": [
        {
          "id": "emp-uuid",
          "name": "John Doe",
          "role": "PROJECT_MANAGER"
        }
      ]
    }
  ]
}
```

---

#### POST /api/projects
Create a new project.

**Request:**
```json
{
  "name": "Mobile App",
  "clientId": "client-uuid",
  "description": "Develop mobile app for iOS and Android",
  "startDate": "2026-04-01",
  "endDate": "2026-12-31",
  "budget": 100000,
  "members": [
    {
      "employeeId": "emp-uuid",
      "role": "PROJECT_MANAGER"
    }
  ]
}
```

---

### 6.6 Task API

#### GET /api/tasks
List tasks.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `projectId` | Filter by project |
| `assigneeId` | Filter by assignee |
| `status` | Filter by status |
| `priority` | Filter by priority |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "title": "Design homepage",
      "description": "Create wireframes and mockups",
      "project": {
        "id": "proj-uuid",
        "name": "Website Redesign"
      },
      "assignees": [
        {
          "id": "emp-uuid",
          "name": "Jane Smith"
        }
      ],
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2026-03-15",
      "estimatedHours": 16,
      "loggedHours": 8
    }
  ]
}
```

---

#### POST /api/tasks
Create a new task.

**Request:**
```json
{
  "title": "Implement login page",
  "description": "Build login page with email/password",
  "projectId": "proj-uuid",
  "assigneeIds": ["emp-uuid"],
  "priority": "HIGH",
  "dueDate": "2026-03-20",
  "estimatedHours": 8
}
```

---

#### POST /api/tasks/:id/time-entries
Log time against task.

**Request:**
```json
{
  "date": "2026-03-04",
  "hours": 4,
  "description": "Worked on UI components"
}
```

---

### 6.7 Document API

#### GET /api/documents/folders
List folders.

---

#### POST /api/documents/folders
Create folder.

**Request:**
```json
{
  "name": "Project Files",
  "parentId": "folder-uuid"
}
```

---

#### GET /api/documents/files
List files.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `folderId` | Filter by folder |

---

#### POST /api/documents/files
Upload file.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload |
| `folderId` | string | Target folder ID |
| `description` | string | File description |

---

#### GET /api/documents/files/:id/download
Download file.

---

### 6.8 Notification API

#### GET /api/notifications
Get notifications.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `unread` | Filter unread only |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "type": "TASK_ASSIGNED",
      "title": "New task assigned",
      "message": "You have been assigned to 'Design homepage'",
      "read": false,
      "createdAt": "2026-03-04T10:00:00Z",
      "data": {
        "taskId": "task-uuid"
      }
    }
  ]
}
```

---

#### PUT /api/notifications/:id/read
Mark notification as read.

---

#### PUT /api/notifications/read-all
Mark all notifications as read.

---

### 6.9 Report API

#### GET /api/reports/attendance
Generate attendance report.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `startDate` | Report start date |
| `endDate` | Report end date |
| `departmentId` | Filter by department |
| `format` | Output format (json, csv, pdf) |

---

#### GET /api/reports/projects
Generate project report.

---

#### GET /api/reports/employees
Generate employee report.

---

#### GET /api/reports/timesheet
Generate timesheet report.

---

## 7. Webhooks

### 7.1 Webhook Events

| Event | Description |
|-------|-------------|
| `employee.created` | New employee added |
| `employee.updated` | Employee updated |
| `attendance.checkin` | Employee checked in |
| `attendance.checkout` | Employee checked out |
| `leave.requested` | Leave request submitted |
| `leave.approved` | Leave approved |
| `task.created` | New task created |
| `task.completed` | Task completed |

### 7.2 Webhook Payload

```json
{
  "id": "webhook-event-uuid",
  "event": "employee.created",
  "timestamp": "2026-03-04T10:30:00Z",
  "tenantId": "tenant-uuid",
  "data": {
    "id": "emp-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@company.com"
  }
}
```

### 7.3 Webhook Signature

Verify webhooks using the signature header:
```
X-Webhook-Signature: sha256=abc123...
```

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

---

## 8. SDKs & Libraries

### 8.1 Available SDKs

| Language | Package | Install |
|----------|---------|---------|
| JavaScript/Node.js | `@coreorbit/oms-sdk` | `npm install @coreorbit/oms-sdk` |
| Python | `coreorbit-oms` | `pip install coreorbit-oms` |

### 8.2 JavaScript SDK Example

```javascript
import { OmsClient } from '@coreorbit/oms-sdk';

const client = new OmsClient({
  baseUrl: 'https://api.coreorbitsoftware.com',
  apiKey: 'your-api-key',
  tenantId: 'acme'
});

// List employees
const employees = await client.employees.list({
  status: 'ACTIVE',
  page: 1,
  limit: 20
});

// Create employee
const newEmployee = await client.employees.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@company.com'
});
```

### 8.3 cURL Examples

```bash
# Login
curl -X POST https://api.coreorbitsoftware.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"password"}'

# List employees
curl https://api.coreorbitsoftware.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create employee
curl -X POST https://api.coreorbitsoftware.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@company.com"}'
```

---

## Appendix

### A. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Mar 2026 | Added AI endpoints, improved rate limiting |
| 1.5 | Jan 2026 | Added webhooks, file versioning |
| 1.0 | Oct 2025 | Initial release |

### B. Support

- **API Status:** https://status.coreorbitsoftware.com
- **Documentation:** https://docs.coreorbitsoftware.com
- **Support Email:** api-support@coreorbitsoftware.com

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 2025 | CoreOrbit Team | Initial release |
| 2.0 | Mar 2026 | CoreOrbit Team | Updated endpoints |
