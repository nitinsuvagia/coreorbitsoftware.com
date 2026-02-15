'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jobApi, type JobDescription } from '@/lib/api/jobs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Briefcase,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Video,
  Award,
  Calendar,
  MapPin,
  Filter,
  Download,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { JobDescriptionForm } from './_components/JobDescriptionForm';
import type { JobFormData } from './_components/JobDescriptionForm';
import { JobDetailsDialog } from './_components/JobDetailsDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { formatSalaryRange, formatDate } from '@/lib/format';

export default function JobDescriptionsPage() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const orgSettings = useOrgSettings();
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobDescription | null>(null);
  const [viewingJob, setViewingJob] = useState<JobDescription | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Load jobs on mount and when filters change
  useEffect(() => {
    loadJobs();
  }, [statusFilter, departmentFilter, searchTerm]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobApi.getJobs({
        status: statusFilter,
        department: departmentFilter,
        search: searchTerm,
      });
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments
  const departments = Array.from(new Set(jobs.map((job) => job.department)));

  // Filter jobs (client-side filtering as backup)
  const filteredJobs = jobs;

  // Form submit handler
  const handleFormSubmit = async (data: JobFormData) => {
    try {
      if (editingJob) {
        // Update existing job
        await jobApi.updateJob(editingJob.id, {
          title: data.title,
          department: data.department,
          location: data.location,
          employmentType: data.employmentType,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          currency: data.currency,
          status: data.status,
          closingDate: data.closingDate,
          openings: data.openings,
          experienceMin: data.experienceMin,
          experienceMax: data.experienceMax,
          description: data.description,
          requirements: data.requirements,
          responsibilities: data.responsibilities,
          benefits: data.benefits,
          techStack: data.techStack,
        });
      } else {
        // Create new job
        await jobApi.createJob({
          title: data.title,
          department: data.department,
          location: data.location,
          employmentType: data.employmentType,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          currency: data.currency,
          status: data.status,
          closingDate: data.closingDate,
          openings: data.openings,
          experienceMin: data.experienceMin,
          experienceMax: data.experienceMax,
          description: data.description,
          requirements: data.requirements,
          responsibilities: data.responsibilities,
          benefits: data.benefits,
          techStack: data.techStack,
        });
      }
      setFormOpen(false);
      setEditingJob(null);
      toast.success(
        editingJob ? 'Job Updated Successfully' : 'Job Created Successfully',
        {
          description: editingJob 
            ? 'The job description has been updated.' 
            : 'The new job opening has been created and is now active.',
        }
      );
      loadJobs(); // Reload jobs
    } catch (error) {
      console.error('Failed to save job:', error);
      toast.error('Failed to Save Job', {
        description: 'An error occurred while saving the job. Please try again.',
      });
    }
  };

  // Edit handler
  const handleEdit = (job: JobDescription) => {
    setEditingJob(job);
    setFormOpen(true);
  };

  // Status change handler
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await jobApi.updateJob(jobId, { status: newStatus as any });
      toast.success('Status Updated', {
        description: `Job status changed to ${newStatus.replace('-', ' ')}.`,
      });
      loadJobs();
    } catch (error) {
      console.error('Failed to update job status:', error);
      toast.error('Failed to Update Status');
    }
  };

  // Delete handler
  const handleDelete = (jobId: string) => {
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (jobToDelete) {
      try {
        await jobApi.deleteJob(jobToDelete);
        setJobToDelete(null);
        toast.success('Job Deleted Successfully', {
          description: 'The job description has been permanently removed.',
        });
        loadJobs(); // Reload jobs
      } catch (error) {
        console.error('Failed to delete job:', error);
        toast.error('Failed to Delete Job', {
          description: 'An error occurred while deleting the job. Please try again.',
        });
      }
    }
    setDeleteDialogOpen(false);
  };

  const router = useRouter();

  // View details handler - navigate to full detail page
  const handleViewDetails = (job: JobDescription) => {
    router.push(`/hr/jobs/${job.id}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      closed: { variant: 'secondary', label: 'Closed' },
      'on-hold': { variant: 'outline', label: 'On Hold' },
      completed: { variant: 'success', label: 'Completed' },
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getEmploymentTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      contract: 'Contract',
      internship: 'Internship',
    };
    return (
      <Badge variant="outline" className="font-normal">
        {labels[type] || type}
      </Badge>
    );
  };

  const formatSalary = (range: JobDescription['salaryRange'], type: string) => {
    return formatSalaryRange(range.min, range.max, orgSettings, type);
  };

  const calculateDaysOpen = (postedDate: string) => {
    const posted = new Date(postedDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - posted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Descriptions</h1>
          <p className="text-muted-foreground mt-2">
            Manage job openings and track recruitment progress
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingJob(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Job Opening
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-20 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-14 w-14 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {jobs.filter((j) => j.status === 'open').length}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {jobs.filter((j) => j.status === 'open').reduce((sum, j) => sum + j.openings, 0)}{' '}
                      total openings
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Briefcase className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Completed Hires</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {jobs
                          .filter((j) => j.status === 'completed')
                          .reduce((sum, j) => sum + (j.statistics?.hired || 0), 0)}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {jobs.filter((j) => j.status === 'completed').length} positions
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {jobs.reduce((sum, j) => sum + (j.statistics?.totalApplied || 0), 0)}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Across all positions</p>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">On Hold</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {jobs.filter((j) => j.status === 'on-hold').length}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Paused positions</p>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job titles, departments, locations..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('-', ' ')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('open')}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('on-hold')}>
              On Hold
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('closed')}>
              Closed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDepartmentFilter('all')}>
              All Departments
            </DropdownMenuItem>
            {departments.map((dept) => (
              <DropdownMenuItem key={dept} onClick={() => setDepartmentFilter(dept)}>
                {dept}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Job Title</th>
                  <th className="text-left p-4 font-medium">Department</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Salary</th>
                  <th className="text-left p-4 font-medium">Candidates</th>
                  <th className="text-left p-4 font-medium">Tech Stack</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Posted</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium"><Skeleton className="h-4 w-36 inline-block" /></div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 opacity-30" />
                            <Skeleton className="h-3 w-12 inline-block" />
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3 opacity-30" />
                            <Skeleton className="h-3 w-16 inline-block" />
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3 opacity-30" />
                            <Skeleton className="h-3 w-16 inline-block" />
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3 opacity-30" />
                            <Skeleton className="h-3 w-10 inline-block" />
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-20 inline-block" /></td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-normal opacity-50">
                        <Skeleton className="h-3 w-14 inline-block" />
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-20 inline-block" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs opacity-50">
                          <Users className="h-3 w-3 mr-1 opacity-30" />
                          <Skeleton className="h-3 w-4 inline-block" />
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        <Badge variant="secondary" className="text-xs opacity-50">
                          <Skeleton className="h-3 w-10 inline-block" />
                        </Badge>
                        <Badge variant="secondary" className="text-xs opacity-50">
                          <Skeleton className="h-3 w-8 inline-block" />
                        </Badge>
                        <Badge variant="outline" className="text-xs opacity-50">
                          <Skeleton className="h-3 w-4 inline-block" />
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="default" className="opacity-50">
                        <Skeleton className="h-3 w-10 inline-block" />
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-sm"><Skeleton className="h-3 w-20 inline-block" /></div>
                        <div className="text-xs text-muted-foreground"><Skeleton className="h-2 w-16 inline-block" /></div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" disabled className="opacity-50">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Briefcase className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Job Openings Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create your first job description to start attracting talented candidates. 
                Define roles, requirements, and benefits to build your team.
              </p>
              <Button onClick={() => {
                setEditingJob(null);
                setFormOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Job Opening
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Job Title</th>
                  <th className="text-left p-4 font-medium">Department</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Salary</th>
                  <th className="text-left p-4 font-medium">Candidates</th>
                  <th className="text-left p-4 font-medium">Tech Stack</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Posted</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewDetails(job)}
                  >
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{job.title}</div>
                        {job.statistics && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.statistics.totalApplied} applied
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {job.statistics.shortlisted} shortlisted
                            </span>
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {job.statistics.interviewed} interviewed
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3 text-green-600" />
                              {job.statistics.hired} hired
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{job.department}</td>
                    <td className="p-4">{getEmploymentTypeBadge(job.employmentType)}</td>
                    <td className="p-4">
                      <div className="flex items-center">
                        {formatSalary(job.salaryRange, job.employmentType)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {job.statistics?.totalApplied || 0}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {job.techStack && job.techStack.length > 0 ? (
                          job.techStack.slice(0, 3).map((tech, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {job.techStack && job.techStack.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.techStack.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(job.status)}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-sm">{formatDate(job.postedDate, orgSettings)}</div>
                        <div className="text-xs text-muted-foreground">
                          {calculateDaysOpen(job.postedDate)} days ago
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(job)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          {job.status !== 'open' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'open')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Mark as Open
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'on-hold' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'on-hold')}>
                              <Calendar className="h-4 w-4 mr-2 text-yellow-500" />
                              Put On Hold
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'closed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'closed')}>
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                              Close Job
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'completed')}>
                              <Award className="h-4 w-4 mr-2 text-blue-500" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(job.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Job Description Form Dialog */}
      <JobDescriptionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingJob(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={
          editingJob
            ? {
                title: editingJob.title,
                department: editingJob.department,
                location: editingJob.location,
                employmentType: editingJob.employmentType,
                salaryMin: editingJob.salaryRange.min,
                salaryMax: editingJob.salaryRange.max,
                currency: editingJob.salaryRange.currency,
                openings: editingJob.openings,
                status: editingJob.status,
                closingDate: editingJob.closingDate,
                experienceMin: editingJob.experience.min,
                experienceMax: editingJob.experience.max,
                description: editingJob.description || '',
                requirements: editingJob.requirements || [],
                responsibilities: editingJob.responsibilities || [],
                benefits: editingJob.benefits || [],
                techStack: editingJob.techStack || [],
              }
            : undefined
        }
        mode={editingJob ? 'edit' : 'create'}
      />

      {/* Job Details Dialog */}
      {viewingJob && (
        <JobDetailsDialog
          open={!!viewingJob}
          onOpenChange={(open) => !open && setViewingJob(null)}
          job={viewingJob}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job description and
              all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
