'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
  Search,
  MoreVertical,
  Eye,
  Users,
  UserCheck,
  Video,
  Award,
  Calendar,
  Mail,
  Phone,
  Star,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Trash2,
  Briefcase,
} from 'lucide-react';
import { candidateApi, type JobCandidate } from '@/lib/api/candidates';
import { jobApi, type JobDescription } from '@/lib/api/jobs';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { formatDate, getAvatarColor } from '@/lib/format';

const statusColors: Record<string, string> = {
  APPLIED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SCREENING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SHORTLISTED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  INTERVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  OFFERED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  HIRED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  WITHDRAWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

export default function CandidatesPage() {
  const router = useRouter();
  const orgSettings = useOrgSettings();
  const [candidates, setCandidates] = useState<JobCandidate[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<{ id: string; jobId: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, jobFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [candidatesData, jobsData] = await Promise.all([
        candidateApi.getAllCandidates({
          status: statusFilter,
          search: searchTerm,
          jobId: jobFilter,
        }),
        jobApi.getJobs({}),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (candidate: JobCandidate, status: string) => {
    try {
      await candidateApi.updateCandidate(candidate.jobId, candidate.id, { status });
      toast.success('Candidate status updated');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = (candidate: JobCandidate) => {
    setCandidateToDelete({ id: candidate.id, jobId: candidate.jobId });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (candidateToDelete) {
      try {
        await candidateApi.deleteCandidate(candidateToDelete.jobId, candidateToDelete.id);
        toast.success('Candidate deleted successfully');
        loadData();
      } catch (error) {
        console.error('Failed to delete candidate:', error);
        toast.error('Failed to delete candidate');
      }
    }
    setDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const handleViewDetails = (candidate: JobCandidate) => {
    router.push(`/hr/jobs/${candidate.jobId}`);
  };

  // Stats
  const stats = {
    total: candidates.length,
    screening: candidates.filter(c => c.status === 'SCREENING').length,
    shortlisted: candidates.filter(c => c.status === 'SHORTLISTED').length,
    interviewed: candidates.filter(c => c.status === 'INTERVIEWED').length,
    hired: candidates.filter(c => c.status === 'HIRED').length,
    rejected: candidates.filter(c => c.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground mt-2">
            Manage all candidates across job openings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full" />
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
                    <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.total}</h3>
                  </div>
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Screening</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.screening}</h3>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Eye className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.shortlisted}</h3>
                  </div>
                  <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Interviewed</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.interviewed}</h3>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Video className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Hired</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.hired}</h3>
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
                    <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.rejected}</h3>
                  </div>
                  <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                    <XCircle className="h-6 w-6" />
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
            placeholder="Search candidates by name, email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === 'all' ? 'All Status' : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter('APPLIED')}>
              Applied
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('SCREENING')}>
              Screening
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('SHORTLISTED')}>
              Shortlisted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('INTERVIEWED')}>
              Interviewed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('OFFERED')}>
              Offered
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('HIRED')}>
              Hired
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('REJECTED')}>
              Rejected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Briefcase className="mr-2 h-4 w-4" />
              {jobFilter === 'all' ? 'All Jobs' : jobs.find(j => j.id === jobFilter)?.title || 'Job'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setJobFilter('all')}>
              All Jobs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {jobs.map((job) => (
              <DropdownMenuItem key={job.id} onClick={() => setJobFilter(job.id)}>
                {job.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Candidates Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Candidate</th>
                  <th className="text-left p-4 font-medium">Job Position</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Applied</th>
                  <th className="text-left p-4 font-medium">Rating</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-36" /></td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Users className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Candidates Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {searchTerm || statusFilter !== 'all' || jobFilter !== 'all'
                  ? 'No candidates match your current filters. Try adjusting your search criteria.'
                  : 'Candidates will appear here when they apply to your job openings.'}
              </p>
              {(searchTerm || statusFilter !== 'all' || jobFilter !== 'all') && (
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setJobFilter('all');
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Candidate</th>
                  <th className="text-left p-4 font-medium">Job Position</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Applied</th>
                  <th className="text-left p-4 font-medium">Rating</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`${getAvatarColor(candidate.email || candidate.firstName + candidate.lastName).className} font-semibold`}>
                            {candidate.firstName[0]}{candidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
                          {candidate.currentRole && (
                            <p className="text-xs text-muted-foreground">{candidate.currentRole}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{candidate.job?.title || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{candidate.job?.department}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {candidate.email}
                        </p>
                        {candidate.phone && (
                          <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {candidate.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(candidate.appliedAt, orgSettings)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {candidate.rating ? (
                          <>
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">{candidate.rating}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={statusColors[candidate.status]}>
                        {candidate.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(candidate)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Job
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(candidate, 'SCREENING')}>
                            Move to Screening
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(candidate, 'SHORTLISTED')}>
                            Shortlist
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(candidate, 'INTERVIEWED')}>
                            Mark as Interviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(candidate, 'OFFERED')}>
                            Send Offer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(candidate, 'HIRED')}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Hired
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(candidate, 'REJECTED')}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(candidate)}
                            className="text-red-600"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
