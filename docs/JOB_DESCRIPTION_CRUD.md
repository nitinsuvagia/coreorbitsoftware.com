# Job Description CRUD System

## Overview
Complete job description management system for recruitment with CRUD operations, status tracking, and hiring statistics.

## Features

### 1. **Job Listing** (`/hr/jobs`)
- **Status-based filtering**: Default shows "open" positions
- **Search functionality**: Search by job title, department, or location
- **Department filter**: Filter jobs by department
- **Statistics cards**:
  - Open Positions count
  - Completed Hires (total hired from all completed positions)
  - Total Applications (across all positions)
  - On Hold positions count

### 2. **CRUD Operations**

#### Create
- Click "Create Job Opening" button
- Fill in comprehensive job form with:
  - Basic Information (title, department, location, employment type)
  - Compensation (salary range, currency)
  - Position Details (openings, status, closing date, experience range)
  - Job Description
  - Requirements (dynamic list)
  - Responsibilities (dynamic list)
  - Benefits (dynamic list)

#### Read
- View job listings in table format
- Click "View Details" to see full job description with:
  - Complete job information
  - Recruitment funnel visualization (for completed jobs)
  - Conversion rates at each stage
  - All requirements, responsibilities, and benefits

#### Update
- Click "Edit" from actions menu
- Pre-populated form with existing job data
- Save changes to update job

#### Delete
- Click "Delete" from actions menu
- Confirmation dialog before deletion
- Permanent removal of job description

### 3. **Job Statuses**

| Status | Description | Statistics |
|--------|-------------|------------|
| **Open** | Active recruitment | No statistics |
| **On-Hold** | Temporarily paused | No statistics |
| **Closed** | Cancelled/Withdrawn | No statistics |
| **Completed** | Hiring finished | Shows full recruitment funnel |

### 4. **Recruitment Statistics** (Completed Jobs Only)

For completed/hired positions, the system tracks:
- **Total Applied**: Number of candidates who applied
- **Shortlisted**: Candidates moved to review stage
- **Interviewed**: Candidates who had interviews
- **Hired**: Final hires made

#### Funnel Visualization
- Visual progress bars showing conversion at each stage
- Percentage conversion rates:
  - Applied → Shortlisted
  - Shortlisted → Interviewed
  - Interviewed → Hired
  - Overall offer acceptance rate

## Components

### `/apps/web/src/app/(dashboard)/hr/jobs/page.tsx`
Main listing page with:
- Job table with all columns
- Filters and search
- Statistics cards
- Action menu integration
- State management for all dialogs

### `/apps/web/src/app/(dashboard)/hr/jobs/_components/JobDescriptionForm.tsx`
Form dialog component:
- Create and Edit modes
- Comprehensive form sections
- Dynamic list management for requirements/responsibilities/benefits
- Form validation

### `/apps/web/src/app/(dashboard)/hr/jobs/_components/JobDetailsDialog.tsx`
Details view dialog:
- Full job information display
- Statistics cards for completed jobs
- Recruitment funnel visualization with progress bars
- Conversion rate calculations
- All job details (requirements, responsibilities, benefits)

## Data Structure

```typescript
interface JobDescription {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'open' | 'closed' | 'on-hold' | 'completed';
  postedDate: string;
  closingDate: string;
  openings: number;
  experience: {
    min: number;
    max: number;
  };
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  statistics?: {
    totalApplied: number;
    shortlisted: number;
    interviewed: number;
    hired: number;
  };
}
```

## User Workflow

### Posting a New Job
1. Click "Create Job Opening"
2. Fill in basic information (title, department, location, type)
3. Set compensation (salary range and currency)
4. Define position details (openings, closing date, experience)
5. Add job description
6. Add requirements (press Enter after each)
7. Add responsibilities (press Enter after each)
8. Add benefits (press Enter after each)
9. Click "Create Job Description"

### Managing Active Jobs
1. View all open positions (default filter)
2. Search or filter as needed
3. Edit job details if requirements change
4. Put on hold if recruitment paused
5. Close if position cancelled

### Recording Completed Hires
1. When hiring completes, change status to "completed"
2. Add statistics:
   - Total candidates who applied
   - Number shortlisted for review
   - Number interviewed
   - Number hired
3. Statistics appear in:
   - Job listing table (inline summary)
   - Detail view (full funnel visualization)
   - Dashboard statistics cards

### Viewing Recruitment Analytics
1. Click "View Details" on completed jobs
2. See recruitment funnel with:
   - Visual progress bars
   - Exact numbers at each stage
   - Conversion percentages
   - Hiring efficiency metrics

## Future Enhancements

### Backend Integration
- API endpoints for CRUD operations
- Database persistence
- Real-time updates

### Candidate Management
- "View Candidates" functionality
- Candidate pipeline tracking
- Application review workflow
- Interview scheduling

### Advanced Features
- Job posting templates
- Automated job board posting
- Email notifications for new applications
- Integration with ATS (Applicant Tracking System)
- Hiring manager assignment
- Interview panel management
- Offer letter generation

### Analytics
- Time-to-hire metrics
- Source tracking (where candidates came from)
- Cost-per-hire calculation
- Department hiring trends
- Hiring manager performance

### Reporting
- Monthly recruitment reports
- Diversity hiring reports
- Salary benchmarking
- Funnel conversion analysis
- Export to PDF/Excel

## Access Control

Current access: HR Dashboard users (`/hr/*` routes)

Recommended future roles:
- **HR Manager**: Full CRUD access
- **Hiring Manager**: View and create jobs for their department
- **Recruiter**: Full access to jobs and candidates
- **Employee**: View only (for internal job postings)

## Navigation

Access from:
- Main navigation: HR → Jobs
- HR Dashboard: Click on recruitment metrics
- Direct URL: `/hr/jobs`

## Notes

- Default listing shows only "open" positions (as per requirements)
- Statistics only appear for "completed" status jobs
- Form validates required fields before submission
- Delete requires confirmation to prevent accidental removal
- Mock data included for demonstration purposes
