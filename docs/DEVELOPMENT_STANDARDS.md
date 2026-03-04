# Development & Project Management Standards

## Office Management SaaS Platform

**Version:** 1.0  
**Last Updated:** March 4, 2026

---

## Table of Contents

1. [Development Workflow](#1-development-workflow)
2. [Coding Standards](#2-coding-standards)
3. [Git Workflow](#3-git-workflow)
4. [Code Review Process](#4-code-review-process)
5. [Testing Standards](#5-testing-standards)
6. [Release Management](#6-release-management)
7. [Project Management](#7-project-management)
8. [Documentation Standards](#8-documentation-standards)

---

## 1. Development Workflow

### 1.1 Development Environment Setup

#### Prerequisites
```bash
# Required software
- Node.js 18.x or 20.x LTS
- pnpm 8.x (package manager)
- Docker & Docker Compose
- PostgreSQL 16 (local or Docker)
- Redis 7 (local or Docker)
- Git 2.40+
- VS Code (recommended IDE)
```

#### Initial Setup
```bash
# Clone repository
git clone git@github.com:coreorbit/office-management.git
cd office-management

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Run database migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Start development servers
pnpm dev
```

### 1.2 Monorepo Structure

```
office-management/
├── apps/
│   ├── web/                 # Next.js portal application
│   └── public-website/      # Next.js public website
├── services/
│   ├── api-gateway/         # API Gateway service
│   ├── auth-service/        # Authentication service
│   ├── employee-service/    # Employee management
│   ├── attendance-service/  # Attendance tracking
│   ├── project-service/     # Project management
│   ├── task-service/        # Task management
│   ├── document-service/    # Document management
│   ├── notification-service/# Notifications
│   ├── report-service/      # Reporting
│   └── ai-service/          # AI features
├── packages/
│   ├── database/            # Prisma schemas & clients
│   ├── shared-types/        # TypeScript types
│   ├── shared-utils/        # Shared utilities
│   ├── event-bus/           # Event bus (Redis pub/sub)
│   └── tenant-db-manager/   # Tenant database manager
├── scripts/                 # Build & deployment scripts
├── docs/                    # Documentation
└── infrastructure/          # Terraform & K8s configs
```

### 1.3 Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and services |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed development data |
| `pnpm clean` | Clean build artifacts |

---

## 2. Coding Standards

### 2.1 TypeScript Guidelines

#### Type Safety
```typescript
// ✅ Good: Explicit types
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  createdAt: Date;
}

async function getEmployee(id: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { id } });
}

// ❌ Bad: Using any
async function getEmployee(id: any): Promise<any> {
  return prisma.employee.findUnique({ where: { id } });
}
```

#### Null Handling
```typescript
// ✅ Good: Explicit null checks
function getEmployeeName(employee: Employee | null): string {
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }
  return `${employee.firstName} ${employee.lastName}`;
}

// ✅ Good: Optional chaining with defaults
const departmentName = employee?.department?.name ?? 'Unassigned';
```

#### Enums and Constants
```typescript
// ✅ Good: Use const enums for better performance
const enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

// ✅ Good: Use as const for string literals
const STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

type StatusType = typeof STATUS[keyof typeof STATUS];
```

### 2.2 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | kebab-case | `employee-service.ts` |
| **Classes** | PascalCase | `EmployeeService` |
| **Interfaces** | PascalCase | `IEmployeeRepository` |
| **Functions** | camelCase | `getEmployeeById` |
| **Variables** | camelCase | `employeeCount` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| **Enums** | PascalCase | `EmployeeStatus` |
| **Database Tables** | snake_case | `employee_documents` |

### 2.3 File Organization

#### Service File Structure
```
services/employee-service/
├── src/
│   ├── controllers/
│   │   └── employee.controller.ts
│   ├── services/
│   │   └── employee.service.ts
│   ├── repositories/
│   │   └── employee.repository.ts
│   ├── routes/
│   │   └── employee.routes.ts
│   ├── validators/
│   │   └── employee.validator.ts
│   ├── types/
│   │   └── employee.types.ts
│   ├── utils/
│   │   └── employee.utils.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

#### Component File Structure (React)
```
components/
├── employees/
│   ├── EmployeeList/
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeList.test.tsx
│   │   ├── EmployeeListItem.tsx
│   │   ├── useEmployeeList.ts        # Custom hook
│   │   └── index.ts
│   └── EmployeeForm/
│       ├── EmployeeForm.tsx
│       ├── EmployeeForm.schema.ts    # Validation
│       └── index.ts
```

### 2.4 Error Handling

```typescript
// ✅ Good: Custom error classes
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

// Usage in controller
async function getEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.findById(req.params.id);
    if (!employee) {
      throw new NotFoundError('Employee', req.params.id);
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
}
```

### 2.5 API Response Format

```typescript
// Standard success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Paginated response
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

### 2.6 React/Next.js Guidelines

#### Component Structure
```tsx
// ✅ Good: Functional component with proper typing
import { FC, useState, useCallback } from 'react';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EmployeeCard: FC<EmployeeCardProps> = ({
  employee,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit(employee.id);
  }, [employee.id, onEdit]);

  return (
    <Card>
      <CardHeader>
        <h3>{employee.displayName}</h3>
      </CardHeader>
      <CardBody>
        {/* Content */}
      </CardBody>
      <CardFooter>
        <Button onClick={handleEdit}>Edit</Button>
      </CardFooter>
    </Card>
  );
};
```

#### Custom Hooks
```tsx
// ✅ Good: Reusable data fetching hook
function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeeApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Usage
function EmployeesPage() {
  const { data, isLoading, error } = useEmployees({ status: 'ACTIVE' });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <EmployeeList employees={data} />;
}
```

---

## 3. Git Workflow

### 3.1 Branch Strategy

```
main (production)
│
├── develop (integration)
│   │
│   ├── feature/OMS-123-employee-import
│   ├── feature/OMS-124-attendance-report
│   └── feature/OMS-125-project-templates
│
├── release/v2.5.0
│
├── hotfix/OMS-999-login-fix
│
└── bugfix/OMS-456-date-picker-issue
```

| Branch Type | Naming Convention | Base Branch | Merge To |
|-------------|-------------------|-------------|----------|
| **main** | `main` | - | - |
| **develop** | `develop` | main | main |
| **feature** | `feature/OMS-{ticket}-{description}` | develop | develop |
| **bugfix** | `bugfix/OMS-{ticket}-{description}` | develop | develop |
| **hotfix** | `hotfix/OMS-{ticket}-{description}` | main | main, develop |
| **release** | `release/v{version}` | develop | main, develop |

### 3.2 Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies |
| `ci` | CI/CD changes |

#### Examples
```bash
# Feature
feat(employee): add bulk import from Excel

# Bug fix
fix(attendance): correct timezone calculation for check-in

# Breaking change
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /api/auth/login response now returns tokens 
in a nested 'tokens' object instead of top-level.

# With ticket reference
fix(task): resolve due date validation issue

Fixes OMS-456
```

### 3.3 Pull Request Process

#### PR Title Format
```
[OMS-123] feat(employee): Add bulk import functionality
```

#### PR Template
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Ticket
Link: [OMS-123](https://jira.company.com/browse/OMS-123)

## Changes Made
- Added bulk import endpoint
- Created Excel parser utility
- Added validation for imported data

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added necessary documentation
- [ ] No new warnings generated
- [ ] Dependent changes merged
```

### 3.4 Merge Requirements

| Requirement | Description |
|-------------|-------------|
| **Approvals** | Minimum 1 approval (2 for main) |
| **CI Passing** | All checks must pass |
| **Up to Date** | Branch must be up to date with target |
| **No Conflicts** | All conflicts resolved |
| **Tests** | All tests passing |
| **Lint** | No lint errors |

---

## 4. Code Review Process

### 4.1 Review Checklist

#### Functionality
- [ ] Code accomplishes the intended task
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] No security vulnerabilities

#### Code Quality
- [ ] Follows coding standards
- [ ] No code duplication
- [ ] Appropriate abstraction level
- [ ] Clear naming conventions

#### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] Edge cases tested

#### Performance
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] No memory leaks

#### Documentation
- [ ] Complex logic documented
- [ ] API changes documented
- [ ] README updated if needed

### 4.2 Review Feedback Guidelines

#### Constructive Feedback
```markdown
# ✅ Good feedback
Consider using `useMemo` here to prevent recalculating on every render:
```tsx
const sortedEmployees = useMemo(
  () => employees.sort((a, b) => a.name.localeCompare(b.name)),
  [employees]
);
```

# ❌ Bad feedback
This is wrong, use useMemo.
```

#### Severity Levels
| Prefix | Meaning | Required |
|--------|---------|----------|
| `[blocking]` | Must fix before merge | Yes |
| `[suggestion]` | Consider changing | No |
| `[question]` | Clarification needed | Depends |
| `[nit]` | Minor style issue | No |

### 4.3 Review Response Time

| Priority | Initial Review | Follow-up |
|----------|----------------|-----------|
| **Critical** | 2 hours | 1 hour |
| **High** | 4 hours | 2 hours |
| **Normal** | 24 hours | 12 hours |
| **Low** | 48 hours | 24 hours |

---

## 5. Testing Standards

### 5.1 Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  10%
                    │  Tests  │
                   ─┴─────────┴─
                  ┌─────────────┐
                  │ Integration │  20%
                  │    Tests    │
                 ─┴─────────────┴─
                ┌─────────────────┐
                │   Unit Tests    │  70%
                │                 │
               ─┴─────────────────┴─
```

### 5.2 Unit Tests

```typescript
// employee.service.test.ts
describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepository: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new EmployeeService(mockRepository);
  });

  describe('getById', () => {
    it('should return employee when found', async () => {
      const mockEmployee = { id: '1', firstName: 'John' };
      mockRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getById('1');

      expect(result).toEqual(mockEmployee);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('1')).rejects.toThrow(NotFoundError);
    });
  });
});
```

### 5.3 Integration Tests

```typescript
// employee.integration.test.ts
describe('Employee API', () => {
  let app: Express;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    app = createApp({ database: testDb.url });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('GET /api/employees', () => {
    it('should return paginated employees', async () => {
      // Seed test data
      await testDb.seed([
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ]);

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });
  });
});
```

### 5.4 Test Coverage Requirements

| Type | Minimum Coverage |
|------|------------------|
| **Services** | 80% |
| **Controllers** | 70% |
| **Utilities** | 90% |
| **Components** | 70% |
| **Overall** | 75% |

### 5.5 Test Naming Convention

```typescript
// Pattern: should_[expected behavior]_when_[condition]
describe('EmployeeService', () => {
  it('should return employee when valid id provided', () => {});
  it('should throw NotFoundError when employee does not exist', () => {});
  it('should create employee when valid data provided', () => {});
  it('should throw ValidationError when email is invalid', () => {});
});
```

---

## 6. Release Management

### 6.1 Versioning

Follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

v2.5.3
│ │ └── Patch: Bug fixes
│ └──── Minor: New features (backward compatible)
└────── Major: Breaking changes
```

#### Pre-release Versions
```
v2.5.0-alpha.1   # Alpha release
v2.5.0-beta.1    # Beta release
v2.5.0-rc.1      # Release candidate
```

### 6.2 Release Process

```
┌─────────────────────────────────────────────────────────────┐
│                    RELEASE WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Feature Freeze                                          │
│     └── No new features in release branch                   │
│                                                             │
│  2. Create Release Branch                                   │
│     └── git checkout -b release/v2.5.0 develop             │
│                                                             │
│  3. Testing Phase                                           │
│     ├── QA testing on staging                              │
│     ├── Bug fixes only                                      │
│     └── Update CHANGELOG.md                                 │
│                                                             │
│  4. Release Approval                                        │
│     ├── QA sign-off                                        │
│     ├── Product owner approval                              │
│     └── Security review (if needed)                         │
│                                                             │
│  5. Merge & Tag                                             │
│     ├── Merge to main                                       │
│     ├── Create tag: v2.5.0                                  │
│     └── Merge back to develop                               │
│                                                             │
│  6. Deploy                                                  │
│     ├── Deploy to production                                │
│     ├── Smoke tests                                         │
│     └── Monitor metrics                                     │
│                                                             │
│  7. Post-Release                                            │
│     ├── Update documentation                                │
│     ├── Notify stakeholders                                 │
│     └── Close release ticket                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Changelog Format

```markdown
# Changelog

## [2.5.0] - 2026-03-04

### Added
- Employee bulk import from Excel (#123)
- Project templates feature (#124)
- Attendance geolocation tracking (#125)

### Changed
- Improved task list performance (#130)
- Updated dashboard charts (#131)

### Fixed
- Date picker timezone issue (#140)
- Login redirect loop (#141)

### Deprecated
- Legacy report endpoint (use /api/v2/reports)

### Security
- Fixed XSS vulnerability in comments (#150)
```

### 6.4 Hotfix Process

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/OMS-999-critical-fix

# 2. Fix the issue
# ... make changes ...

# 3. Test thoroughly
pnpm test

# 4. Create PR to main
# 5. After merge, tag the release
git tag v2.5.1

# 6. Merge hotfix to develop
git checkout develop
git merge hotfix/OMS-999-critical-fix
```

---

## 7. Project Management

### 7.1 Agile Methodology

We follow a modified Scrum framework:

| Event | Frequency | Duration |
|-------|-----------|----------|
| **Sprint** | 2 weeks | - |
| **Sprint Planning** | Start of sprint | 2 hours |
| **Daily Standup** | Daily | 15 minutes |
| **Sprint Review** | End of sprint | 1 hour |
| **Retrospective** | End of sprint | 1 hour |
| **Backlog Grooming** | Weekly | 1 hour |

### 7.2 Issue Tracking

#### Issue Types
| Type | Description | Example |
|------|-------------|---------|
| **Epic** | Large feature | Employee Onboarding Module |
| **Story** | User-facing feature | As a HR, I want to import employees |
| **Task** | Technical task | Create import API endpoint |
| **Bug** | Defect | Date picker shows wrong date |
| **Subtask** | Child of Story/Task | Write unit tests |

#### Issue Status Flow
```
BACKLOG → TODO → IN PROGRESS → CODE REVIEW → QA → DONE
```

#### Priority Levels
| Priority | Description | Response Time |
|----------|-------------|---------------|
| **P0** | Critical/Blocker | Immediate |
| **P1** | High/Urgent | Same day |
| **P2** | Medium | This sprint |
| **P3** | Low | Next sprint |
| **P4** | Trivial | Backlog |

### 7.3 Story Point Estimation

Using Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21

| Points | Complexity | Example |
|--------|------------|---------|
| **1** | Trivial | Fix typo |
| **2** | Simple | Add form field |
| **3** | Small | New API endpoint |
| **5** | Medium | CRUD feature |
| **8** | Large | New module |
| **13** | Very Large | Major refactoring |
| **21** | Epic-sized | Should be broken down |

### 7.4 Definition of Done

A story is "Done" when:

- [ ] Code complete and pushed
- [ ] Tests written and passing (>80% coverage)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA verified
- [ ] No critical bugs
- [ ] Product owner accepted

---

## 8. Documentation Standards

### 8.1 Code Documentation

#### JSDoc Comments
```typescript
/**
 * Creates a new employee in the system.
 * 
 * @param data - Employee creation data
 * @param tenantId - The tenant context
 * @returns The created employee with generated fields
 * @throws {ValidationError} When required fields are missing
 * @throws {DuplicateError} When email already exists
 * 
 * @example
 * ```typescript
 * const employee = await createEmployee({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@company.com'
 * }, tenantId);
 * ```
 */
async function createEmployee(
  data: CreateEmployeeDto,
  tenantId: string
): Promise<Employee> {
  // Implementation
}
```

#### README Structure
```markdown
# Service/Package Name

Brief description.

## Installation

```bash
pnpm add @oms/package-name
```

## Usage

```typescript
import { something } from '@oms/package-name';
```

## API Reference

### `functionName(param: Type): ReturnType`

Description of the function.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option1` | string | - | Description |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)
```

### 8.2 API Documentation

All API endpoints must be documented with:
- Endpoint URL and method
- Request parameters/body
- Response format
- Error codes
- Example requests

### 8.3 Architecture Decision Records (ADR)

For significant technical decisions:

```markdown
# ADR-001: Use PostgreSQL for Multi-Tenant Database

## Status
Accepted

## Context
We need to choose a database strategy for multi-tenant data isolation.

## Decision
We will use PostgreSQL with database-per-tenant isolation.

## Consequences
### Positive
- Complete data isolation
- Independent backup/restore
- Better security

### Negative
- More complex connection management
- Higher resource usage
- Migration complexity
```

---

## Appendix

### A. VS Code Extensions

Recommended extensions:
- ESLint
- Prettier
- GitLens
- Prisma
- Thunder Client
- Error Lens
- Auto Import
- Path Intellisense

### B. Useful Commands

```bash
# Database
pnpm db:studio          # Open Prisma Studio
pnpm db:reset           # Reset database
pnpm db:generate        # Generate Prisma client

# Testing
pnpm test:coverage      # Run tests with coverage
pnpm test:watch         # Watch mode

# Development
pnpm dev:web           # Start only web portal
pnpm dev:services      # Start only backend services
pnpm logs              # View service logs
```

### C. Environment Variables Reference

See `.env.example` for full list of environment variables with descriptions.

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Mar 2026 | CoreOrbit Team | Initial release |
