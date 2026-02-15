'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { PhoneInput, PhoneDisplay } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  Users,
  Mail,
  Phone,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  Building2,
  Clock,
  CircleDollarSign,
  GraduationCap,
  Linkedin,
  Globe,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCheck,
  Video,
  Award,
  Send,
  Eye,
  Sparkles,
  Upload,
  X,
  File,
} from 'lucide-react';
import { candidateApi, type JobCandidate } from '@/lib/api/candidates';
import { jobApi, type JobDescription } from '@/lib/api/jobs';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { formatDate, getAvatarColor } from '@/lib/format';
import { ScheduleInterviewDialog } from '../../../interviews/_components/ScheduleInterviewDialog';
import { SendOfferDialog } from '@/components/hr/SendOfferDialog';

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

const stageProgress: Record<string, number> = {
  APPLIED: 10,
  SCREENING: 25,
  SHORTLISTED: 40,
  INTERVIEWED: 60,
  OFFERED: 80,
  HIRED: 100,
  REJECTED: 0,
  WITHDRAWN: 0,
};

const sourceLabels: Record<string, string> = {
  DIRECT: 'Direct Application',
  LINKEDIN: 'LinkedIn',
  REFERRAL: 'Employee Referral',
  JOB_PORTAL: 'Job Portal',
  CAREER_PAGE: 'Career Page',
  OTHER: 'Other',
};

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const candidateId = params.candidateId as string;
  const orgSettings = useOrgSettings();

  const [candidate, setCandidate] = useState<JobCandidate | null>(null);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [editResumeFile, setEditResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [sendOfferOpen, setSendOfferOpen] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rating: 0,
    notes: '',
    interviewNotes: '',
    source: 'DIRECT',
  });

  useEffect(() => {
    loadData();
  }, [jobId, candidateId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [candidateData, jobData] = await Promise.all([
        candidateApi.getCandidate(jobId, candidateId),
        jobApi.getJob(jobId),
      ]);
      setCandidate(candidateData);
      setJob(jobData);
      setEditForm({
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        email: candidateData.email,
        phone: candidateData.phone || '',
        rating: candidateData.rating || 0,
        notes: candidateData.notes || '',
        interviewNotes: candidateData.interviewNotes || '',
        source: candidateData.source || 'DIRECT',
      });
    } catch (error) {
      console.error('Failed to load candidate:', error);
      toast.error('Failed to load candidate details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!candidate) return;
    try {
      setSaving(true);
      await candidateApi.updateCandidate(jobId, candidateId, { status });
      toast.success('Status updated successfully');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsHired = async () => {
    if (!candidate) return;
    
    // Only allow hiring if candidate has been offered
    if (candidate.status !== 'OFFERED') {
      toast.error('Candidate must be in OFFERED status before being marked as hired');
      return;
    }
    
    try {
      setSaving(true);
      const result = await candidateApi.markAsHired(candidateId);
      toast.success(result.message || 'Employee created successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to mark as hired:', error);
      toast.error(error.response?.data?.error || 'Failed to mark as hired');
    } finally {
      setSaving(false);
    }
  };

  const handleInterviewScheduled = async (data?: { type: string; candidateId: string }) => {
    if (!data || !candidate) {
      setScheduleDialogOpen(false);
      return;
    }

    // Map interview type to candidate status
    const statusMap: Record<string, string> = {
      PHONE_SCREEN: 'SCREENING',
      TECHNICAL: 'SHORTLISTED',
      HR: 'INTERVIEWED',
      MANAGER: 'INTERVIEWED',
      FINAL: 'INTERVIEWED',
      ASSIGNMENT: 'SHORTLISTED',
    };

    const newStatus = statusMap[data.type];
    
    if (newStatus) {
      try {
        await candidateApi.updateCandidate(jobId, candidateId, { status: newStatus });
        toast.success(`Interview scheduled! Status updated to ${newStatus.replace('_', ' ').toLowerCase()}`);
        loadData();
      } catch (error) {
        console.error('Failed to update candidate status:', error);
      }
    }
    
    setScheduleDialogOpen(false);
  };

  const handleEditResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setEditResumeFile(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!candidate) return;
    try {
      setSaving(true);
      setUploadingResume(!!editResumeFile);
      
      // Prepare update data
      const updateData: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        source: editForm.source,
        notes: editForm.notes,
      };
      
      // Handle resume upload if new file selected
      if (editResumeFile) {
        const reader = new FileReader();
        const base64Content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(editResumeFile);
        });
        
        updateData.resumeData = {
          filename: editResumeFile.name,
          content: base64Content,
          mimeType: editResumeFile.type,
        };
      }
      
      await candidateApi.updateCandidate(jobId, candidateId, updateData);
      toast.success('Candidate updated successfully');
      setEditDialogOpen(false);
      setEditResumeFile(null);
      loadData();
    } catch (error) {
      console.error('Failed to update candidate:', error);
      toast.error('Failed to update candidate');
    } finally {
      setSaving(false);
      setUploadingResume(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!candidate) return;
    try {
      setSaving(true);
      await candidateApi.updateCandidate(jobId, candidateId, {
        notes: editForm.notes,
        interviewNotes: editForm.interviewNotes,
      });
      toast.success('Notes saved successfully');
      setNotesDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await candidateApi.deleteCandidate(jobId, candidateId);
      toast.success('Candidate deleted successfully');
      router.push('/hr/candidates');
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      toast.error('Failed to delete candidate');
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!candidate?.resumeUrl) return;
    try {
      const fullUrl = candidate.resumeUrl.startsWith('http') 
        ? candidate.resumeUrl 
        : `${window.location.origin}${candidate.resumeUrl}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const extension = candidate.resumeUrl.split('.').pop() || 'pdf';
      const filename = `${candidate.firstName}_${candidate.lastName}_Resume.${extension}`;
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Resume downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download resume');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const handleUpdateRating = async (rating: number) => {
    if (!candidate) return;
    try {
      setSavingRating(true);
      await candidateApi.updateCandidate(jobId, candidateId, { rating });
      toast.success('Rating updated');
      loadData();
    } catch (error) {
      console.error('Failed to update rating:', error);
      toast.error('Failed to update rating');
    } finally {
      setSavingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" className="mb-2 -ml-2 opacity-50" disabled>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between mt-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-18" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Professional Information Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-48" />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-28 mb-1" />
                      <Skeleton className="h-5 w-36" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skills Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-6 w-16 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes Skeleton */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Separator />
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Resume Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg border bg-muted/30 flex items-center gap-3 mb-3">
                  <Skeleton className="h-8 w-8" />
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* Job Details Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Separator />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-9 w-full mt-2" />
              </CardContent>
            </Card>

            {/* Timeline Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-2 h-2 mt-2 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rating Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-6" />
                  ))}
                  <Skeleton className="h-4 w-12 ml-2" />
                </div>
                <Skeleton className="h-3 w-36 mt-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Candidate not found</p>
            <p className="text-muted-foreground mb-4">
              The candidate you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Button onClick={() => router.push('/hr/candidates')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/candidates')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-xl">
              <AvatarFallback className={`${getAvatarColor((candidate.email || '') + candidate.firstName + candidate.lastName).className} font-semibold`}>
                {getInitials(candidate.firstName, candidate.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {candidate.firstName} {candidate.lastName}
                </h1>
                <Badge className={statusColors[candidate.status]}>
                  {candidate.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Applied for <span className="font-medium text-foreground">{job.title}</span>
                {' · '}{job.department}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Final Decision
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setSendOfferOpen(true)}
                disabled={candidate.status === 'HIRED' || candidate.status === 'REJECTED'}
              >
                <Award className="h-4 w-4 mr-2 text-amber-500" />
                Send Offer
              </DropdownMenuItem>
              {candidate.status === 'OFFERED' && (
                <DropdownMenuItem
                  onClick={handleMarkAsHired}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Mark as Hired
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={candidate.status === 'REJECTED'}
                className="text-red-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => setScheduleDialogOpen(true)}>
            <Video className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setNotesDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Notes
              </DropdownMenuItem>
              {candidate.resumeUrl && (
                <DropdownMenuItem onClick={handleDownloadResume}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Resume
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Candidate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Hiring Progress</span>
            <span className="text-sm text-muted-foreground">{stageProgress[candidate.status]}%</span>
          </div>
          <Progress value={stageProgress[candidate.status]} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Applied</span>
            <span>Screening</span>
            <span>Shortlisted</span>
            <span>Interviewed</span>
            <span>Offered</span>
            <span>Hired</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${candidate.email}`} className="text-sm font-medium hover:underline">
                    {candidate.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  {candidate.phone ? (
                    <a href={`tel:${candidate.phone}`} className="text-sm font-medium hover:underline">
                      <PhoneDisplay value={candidate.phone} />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">Not provided</span>
                  )}
                </div>
              </div>
              {candidate.linkedinUrl && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LinkedIn</p>
                    <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline flex items-center gap-1">
                      View Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              {candidate.portfolioUrl && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Globe className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Portfolio</p>
                    <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline flex items-center gap-1">
                      View Portfolio <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Company</p>
                  <p className="font-medium">{candidate.currentCompany || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Role</p>
                  <p className="font-medium">{candidate.currentRole || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                  <p className="font-medium">
                    {candidate.experienceYears ? `${candidate.experienceYears} years` : 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Expected Salary</p>
                  <p className="font-medium">
                    {candidate.expectedSalary 
                      ? `₹${candidate.expectedSalary.toLocaleString('en-IN')} LPA`
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Notice Period</p>
                  <p className="font-medium">{candidate.noticePeriod || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Source</p>
                  <p className="font-medium">{sourceLabels[candidate.source || 'OTHER']}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes & Feedback
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setNotesDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Notes
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Application Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {candidate.notes || 'No notes added yet.'}
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Interview Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {candidate.interviewNotes || 'No interview notes yet.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter */}
          {candidate.coverLetter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Cover Letter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {candidate.coverLetter}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Resume Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.resumeUrl ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Resume</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.resumeUrl.split('/').pop()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleDownloadResume}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setResumeDialogOpen(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No resume uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Applied Position
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{job.title}</p>
                <p className="text-sm text-muted-foreground">{job.department}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{job.employmentType.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>₹{job.salaryRange.min.toLocaleString('en-IN')} - ₹{job.salaryRange.max.toLocaleString('en-IN')} LPA</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-2" 
                onClick={() => router.push(`/hr/jobs/${job.id}`)}
              >
                View Job Details
              </Button>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="text-sm font-medium">Applied to {job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(candidate.appliedAt, orgSettings)}
                    </p>
                  </div>
                </div>
                {candidate.screenedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="text-sm font-medium">Screened</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(candidate.screenedAt, orgSettings)}
                      </p>
                    </div>
                  </div>
                )}
                {candidate.interviewedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                    <div>
                      <p className="text-sm font-medium">Interviewed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(candidate.interviewedAt, orgSettings)}
                      </p>
                    </div>
                  </div>
                )}
                {candidate.offeredAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-amber-500"></div>
                    <div>
                      <p className="text-sm font-medium">Offer Extended</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(candidate.offeredAt, orgSettings)}
                      </p>
                    </div>
                  </div>
                )}
                {candidate.hiredAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium">Hired</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(candidate.hiredAt, orgSettings)}
                      </p>
                    </div>
                  </div>
                )}
                {candidate.rejectedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className="text-sm font-medium">Rejected</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(candidate.rejectedAt, orgSettings)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleUpdateRating(star)}
                    disabled={savingRating}
                    className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`h-6 w-6 cursor-pointer ${
                        star <= (candidate.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {candidate.rating || 0} / 5
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click stars to update rating</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditResumeFile(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update candidate information
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name *</Label>
                  <Input
                    id="editFirstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name *</Label>
                  <Input
                    id="editLastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <PhoneInput
                  value={editForm.phone}
                  onChange={(value) => setEditForm({ ...editForm, phone: value })}
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSource">Source</Label>
                <Select 
                  value={editForm.source} 
                  onValueChange={(value) => setEditForm({ ...editForm, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                    <SelectItem value="REFERRAL">Referral</SelectItem>
                    <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                    <SelectItem value="CAREER_PAGE">Career Page</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CV/Resume</Label>
                {editResumeFile ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <File className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{editResumeFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(editResumeFile.size / 1024).toFixed(1)} KB (New)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditResumeFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : candidate?.resumeUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <File className="h-5 w-5 text-primary" />
                      <button
                        type="button"
                        onClick={() => setResumeDialogOpen(true)}
                        className="text-sm text-primary hover:underline truncate flex-1 text-left"
                      >
                        View Current Resume
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadResume}
                        className="text-muted-foreground hover:text-foreground"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="flex items-center justify-center w-full h-10 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Click to replace</span> resume
                        </span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleEditResumeFileChange}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Click to upload</span> CV/Resume
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX (Max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleEditResumeFileChange}
                    />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Additional notes about the candidate..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditResumeFile(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editForm.firstName || !editForm.lastName || !editForm.email || saving || uploadingResume}
            >
              {uploadingResume ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Application Notes</Label>
              <Textarea
                placeholder="Add notes about the candidate's application..."
                rows={4}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Interview Notes</Label>
              <Textarea
                placeholder="Add interview feedback and observations..."
                rows={4}
                value={editForm.interviewNotes}
                onChange={(e) => setEditForm({ ...editForm, interviewNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {candidate.firstName} {candidate.lastName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume View Dialog */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 border-b p-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume - {candidate.firstName} {candidate.lastName}
              </DialogTitle>
              {candidate.resumeUrl && (
                <Button variant="default" size="sm" onClick={handleDownloadResume}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted">
            {candidate.resumeUrl ? (
              <>
                {candidate.resumeUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={candidate.resumeUrl}
                    className="w-full h-[85vh] border-0"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Preview not available</p>
                    <p className="text-muted-foreground mb-4">This file type cannot be previewed in the browser.</p>
                    <Button onClick={handleDownloadResume}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg">No resume uploaded</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleInterviewScheduled}
        preSelectedCandidate={{
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          jobId: jobId,
          jobTitle: job.title,
        }}
      />

      {/* Send Offer Dialog */}
      <SendOfferDialog
        open={sendOfferOpen}
        onOpenChange={setSendOfferOpen}
        candidate={candidate}
        job={job}
        currency={orgSettings.currency}
        onSuccess={loadData}
      />
    </div>
  );
}
