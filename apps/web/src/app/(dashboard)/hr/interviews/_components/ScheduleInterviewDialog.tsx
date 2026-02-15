'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  CalendarIcon,
  Clock,
  Video,
  Phone,
  MapPin,
  Search,
  X,
  Loader2,
  Link as LinkIcon,
  Users,
  FileText,
} from 'lucide-react';
import { cn, getAvatarColor } from '@/lib/utils';
import {
  Interview,
  InterviewType,
  InterviewMode,
  interviewTypeLabels,
  interviewApi,
} from '@/lib/api/interviews';
import { candidateApi, type JobCandidate } from '@/lib/api/candidates';
import { get } from '@/lib/api/client';
import { assessmentApi, type TestForSelection } from '@/lib/api/assessments';

// ============================================================================
// SCHEMA
// ============================================================================

const scheduleFormSchema = z.object({
  candidateId: z.string().min(1, 'Please select a candidate'),
  jobId: z.string().min(1, 'Job is required'),
  type: z.enum(['PHONE_SCREEN', 'TECHNICAL', 'HR', 'MANAGER', 'FINAL', 'ASSIGNMENT', 'ASSESSMENT']),
  roundNumber: z.number().min(1).max(10),
  date: z.date({ required_error: 'Please select a date' }),
  time: z.string().min(1, 'Please select a time'),
  duration: z.number().min(15).max(240),
  mode: z.enum(['VIDEO', 'PHONE', 'IN_PERSON']),
  meetingLink: z.string().optional(),
  location: z.string().optional(),
  instructions: z.string().optional(),
  panelistIds: z.array(z.string()),
  sendCalendarInvite: z.boolean(),
  sendEmailNotification: z.boolean(),
  // Assessment-specific fields
  assessmentTestId: z.string().optional(),
  assessmentValidDays: z.number().min(1).max(30).optional(),
}).refine((data) => {
  // Date must be today or in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(data.date);
  selectedDate.setHours(0, 0, 0, 0);
  return selectedDate >= today;
}, {
  message: 'Interview date must be today or in the future',
  path: ['date'],
}).refine((data) => {
  // If date is today, time must be greater than current time
  const today = new Date();
  const selectedDate = new Date(data.date);
  
  // Check if selected date is today
  if (
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate()
  ) {
    // Parse the selected time
    const [hours, minutes] = data.time.split(':').map(Number);
    const currentHours = today.getHours();
    const currentMinutes = today.getMinutes();
    
    // Selected time must be greater than current time
    if (hours < currentHours || (hours === currentHours && minutes <= currentMinutes)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Interview time must be in the future for today\'s date',
  path: ['time'],
}).refine((data) => {
  // For non-ASSESSMENT types, require at least one panelist
  if (data.type !== 'ASSESSMENT' && data.panelistIds.length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Please select at least one interviewer',
  path: ['panelistIds'],
}).refine((data) => {
  // For ASSESSMENT type, require test selection
  if (data.type === 'ASSESSMENT' && !data.assessmentTestId) {
    return false;
  }
  return true;
}, {
  message: 'Please select an assessment test',
  path: ['assessmentTestId'],
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

// ============================================================================
// TYPES FOR DROPDOWNS
// ============================================================================

interface CandidateOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobId: string;
  jobTitle: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  avatar: string;
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

const durations = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data?: { type: string; candidateId: string }) => void;
  interview?: Interview | null;
  mode?: 'schedule' | 'reschedule';
  preSelectedCandidate?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    jobId: string;
    jobTitle: string;
  };
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  onSuccess,
  interview,
  mode = 'schedule',
  preSelectedCandidate,
}: ScheduleInterviewDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateOption | null>(null);
  const [selectedPanelists, setSelectedPanelists] = useState<EmployeeOption[]>([]);
  const [panelistSearch, setPanelistSearch] = useState('');
  const [panelistOpen, setPanelistOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // API data states
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Assessment state
  const [assessmentTests, setAssessmentTests] = useState<TestForSelection[]>([]);
  const [loadingAssessmentTests, setLoadingAssessmentTests] = useState(false);

  const isReschedule = mode === 'reschedule' && interview;

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      candidateId: '',
      jobId: '',
      type: 'TECHNICAL',
      roundNumber: 1,
      date: undefined,
      time: '10:00',
      duration: 60,
      mode: 'VIDEO',
      meetingLink: '',
      location: '',
      instructions: '',
      panelistIds: [],
      sendCalendarInvite: true,
      sendEmailNotification: true,
      assessmentTestId: '',
      assessmentValidDays: 7,
    },
  });

  // Load candidates from API
  const loadCandidates = useCallback(async (search?: string) => {
    try {
      setLoadingCandidates(true);
      const data = await candidateApi.getAllCandidates({ 
        search, 
        // Only show candidates that are in hiring pipeline (not rejected/withdrawn)
        status: undefined 
      });
      const candidateOptions: CandidateOption[] = data
        .filter(c => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(c.status))
        .map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          jobId: c.jobId,
          jobTitle: c.job?.title || 'Unknown Position',
        }));
      setCandidates(candidateOptions);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  // Load employees from API
  const loadEmployees = useCallback(async (search?: string) => {
    try {
      setLoadingEmployees(true);
      const params: Record<string, string> = { pageSize: '100' };
      if (search) {
        params.search = search;
      }
      const response = await get<{ items: any[]; total: number }>('/api/v1/employees', params);
      const employeeOptions: EmployeeOption[] = (response.items || []).map(e => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        designation: e.designation?.name || e.designation || '',
        department: e.department?.name || e.department || '',
        avatar: e.avatar || '',
      }));
      setEmployees(employeeOptions);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Load assessment tests from API
  const loadAssessmentTests = useCallback(async () => {
    try {
      setLoadingAssessmentTests(true);
      const tests = await assessmentApi.getPublishedTests();
      setAssessmentTests(tests);
    } catch (error) {
      console.error('Failed to load assessment tests:', error);
      setAssessmentTests([]);
    } finally {
      setLoadingAssessmentTests(false);
    }
  }, []);

  // Load initial data when dialog opens
  useEffect(() => {
    if (open) {
      loadCandidates();
      loadEmployees();
      loadAssessmentTests();
    }
  }, [open, loadCandidates, loadEmployees, loadAssessmentTests]);

  // Debounced search for candidates
  useEffect(() => {
    if (!candidateOpen) return;
    const timer = setTimeout(() => {
      loadCandidates(candidateSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [candidateSearch, candidateOpen, loadCandidates]);

  // Debounced search for employees
  useEffect(() => {
    if (!panelistOpen) return;
    const timer = setTimeout(() => {
      loadEmployees(panelistSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [panelistSearch, panelistOpen, loadEmployees]);

  // Pre-populate for reschedule
  useEffect(() => {
    if (isReschedule && interview) {
      const scheduledDate = new Date(interview.scheduledAt);
      form.reset({
        candidateId: interview.candidateId,
        jobId: interview.jobId,
        type: interview.type,
        roundNumber: interview.roundNumber,
        date: scheduledDate,
        time: format(scheduledDate, 'HH:mm'),
        duration: interview.duration,
        mode: interview.mode,
        meetingLink: interview.meetingLink || '',
        location: interview.location || '',
        instructions: interview.instructions || '',
        panelistIds: interview.panelists?.map(p => p.employeeId) || [],
        sendCalendarInvite: true,
        sendEmailNotification: true,
      });
      
      // Set selected candidate
      if (interview.candidate) {
        setSelectedCandidate({
          id: interview.candidate.id,
          firstName: interview.candidate.firstName,
          lastName: interview.candidate.lastName,
          email: interview.candidate.email,
          jobId: interview.jobId,
          jobTitle: interview.job?.title || '',
        });
      }
      
      // Set selected panelists
      if (interview.panelists) {
        const panelists = interview.panelists
          .filter(p => p.employee)
          .map(p => ({
            id: p.employeeId,
            firstName: p.employee!.firstName,
            lastName: p.employee!.lastName,
            email: p.employee!.email,
            designation: p.employee!.designation || '',
            department: p.employee!.department || '',
            avatar: p.employee!.avatar || '',
          }));
        setSelectedPanelists(panelists);
      }
    }
  }, [isReschedule, interview, form]);

  // Pre-select candidate if provided
  useEffect(() => {
    if (preSelectedCandidate) {
      // Handle both name formats
      const firstName = preSelectedCandidate.firstName || preSelectedCandidate.name?.split(' ')[0] || '';
      const lastName = preSelectedCandidate.lastName || preSelectedCandidate.name?.split(' ').slice(1).join(' ') || '';
      
      const normalizedCandidate = {
        id: preSelectedCandidate.id,
        firstName,
        lastName,
        email: preSelectedCandidate.email,
        jobId: preSelectedCandidate.jobId,
        jobTitle: preSelectedCandidate.jobTitle,
      };
      setSelectedCandidate(normalizedCandidate);
      form.setValue('candidateId', preSelectedCandidate.id);
      form.setValue('jobId', preSelectedCandidate.jobId);
    }
  }, [preSelectedCandidate, form]);

  // Filter employees to exclude already selected panelists
  const filteredEmployees = employees.filter(e =>
    !selectedPanelists.find(p => p.id === e.id)
  );

  // Handle candidate selection
  const handleSelectCandidate = (candidate: CandidateOption) => {
    setSelectedCandidate(candidate);
    form.setValue('candidateId', candidate.id);
    form.setValue('jobId', candidate.jobId);
    setCandidateOpen(false);
    setCandidateSearch('');
  };

  // Handle panelist selection
  const handleAddPanelist = (employee: EmployeeOption) => {
    setSelectedPanelists(prev => [...prev, employee]);
    const currentPanelists = form.getValues('panelistIds') || [];
    form.setValue('panelistIds', [...currentPanelists, employee.id]);
    setPanelistOpen(false);
    setPanelistSearch('');
  };

  // Handle panelist removal
  const handleRemovePanelist = (employeeId: string) => {
    setSelectedPanelists(prev => prev.filter(p => p.id !== employeeId));
    const currentPanelists = form.getValues('panelistIds') || [];
    form.setValue('panelistIds', currentPanelists.filter(id => id !== employeeId));
  };

  // Handle form submission
  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setSubmitting(true);
      
      // Validate assessment test for ASSESSMENT type
      if (data.type === 'ASSESSMENT' && !data.assessmentTestId) {
        toast.error('Please select an assessment test');
        setSubmitting(false);
        return;
      }
      
      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number);
      const scheduledAt = new Date(data.date);
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      // Calculate valid until date for assessment
      const assessmentValidUntil = data.type === 'ASSESSMENT' && data.assessmentValidDays
        ? new Date(scheduledAt.getTime() + data.assessmentValidDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      
      if (isReschedule) {
        await interviewApi.rescheduleInterview(interview!.id, scheduledAt.toISOString(), data.duration);
        toast.success('Interview rescheduled successfully');
        onSuccess();
      } else {
        await interviewApi.createInterview({
          ...data,
          scheduledAt: scheduledAt.toISOString(),
          assessmentTestId: data.type === 'ASSESSMENT' ? data.assessmentTestId : undefined,
          assessmentValidUntil,
        } as any);
        toast.success(data.type === 'ASSESSMENT' ? 'Assessment scheduled successfully' : 'Interview scheduled successfully');
        // Pass interview type and candidate ID to onSuccess for status update
        onSuccess({ type: data.type, candidateId: data.candidateId });
      }
      
      // Close dialog and reset form
      form.reset();
      setSelectedCandidate(null);
      setSelectedPanelists([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to schedule interview:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to schedule interview';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form validation errors
  const onFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(firstError.message);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const watchMode = form.watch('mode');
  const watchType = form.watch('type');
  const isAssessmentType = watchType === 'ASSESSMENT';

  // When switching to ASSESSMENT type, auto-set mode to IN_PERSON and set roundNumber
  useEffect(() => {
    if (isAssessmentType) {
      form.setValue('mode', 'IN_PERSON');
      // For assessments, set roundNumber to 1 (required field)
      form.setValue('roundNumber', 1);
    }
  }, [isAssessmentType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? 'Update the interview date, time, and details.'
              : 'Schedule a new interview with a candidate.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Candidate Selection */}
            {!isReschedule && (
              <FormField
                control={form.control}
                name="candidateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate *</FormLabel>
                    <Popover open={candidateOpen} onOpenChange={setCandidateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !selectedCandidate && 'text-muted-foreground'
                            )}
                          >
                            {selectedCandidate ? (
                              <div className="flex items-center gap-2">
                                <span>
                                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                                </span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm text-muted-foreground">
                                  {selectedCandidate.jobTitle}
                                </span>
                              </div>
                            ) : (
                              'Select candidate...'
                            )}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search candidates..."
                            value={candidateSearch}
                            onValueChange={setCandidateSearch}
                          />
                          <div className="max-h-[200px] overflow-y-auto">
                            <CommandList>
                              {loadingCandidates ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Searching...</span>
                                </div>
                              ) : candidates.length === 0 ? (
                                <CommandEmpty>
                                  {candidateSearch ? 'No candidates found.' : 'No candidates in pipeline.'}
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {candidates.map((candidate) => (
                                    <CommandItem
                                      key={candidate.id}
                                      value={candidate.id}
                                      onSelect={() => handleSelectCandidate(candidate)}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {candidate.firstName} {candidate.lastName}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {candidate.email} • {candidate.jobTitle}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Show selected candidate for reschedule */}
            {isReschedule && selectedCandidate && (
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Candidate</div>
                <div className="font-medium">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedCandidate.email} • {selectedCandidate.jobTitle}
                </div>
              </div>
            )}

            {/* Interview Type & Round */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interview Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(interviewTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show Test dropdown for ASSESSMENT type, Round for other types */}
              {isAssessmentType ? (
                <FormField
                  control={form.control}
                  name="assessmentTestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Test *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingAssessmentTests ? "Loading..." : "Select test"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assessmentTests.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No published tests available
                            </div>
                          ) : (
                            assessmentTests.map((test) => (
                              <SelectItem key={test.id} value={test.id}>
                                <div className="flex flex-col">
                                  <span>{test.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {test.questionsCount} questions • {test.duration} mins
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="roundNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round *</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select round" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              Round {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Assessment Valid Days (only for ASSESSMENT type) */}
            {isAssessmentType && (
              <FormField
                control={form.control}
                name="assessmentValidDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment Valid For</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString() || '7'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select validity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 5, 7, 14, 21, 30].map((days) => (
                          <SelectItem key={days} value={days.toString()}>
                            {days} {days === 1 ? 'day' : 'days'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Candidate can complete the assessment within this period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date, Time & Duration */}
            <div className="grid grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal h-10',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'MMM dd, yyyy')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => {
                  const selectedDate = form.watch('date');
                  const now = new Date();
                  const isToday = selectedDate && 
                    selectedDate.getFullYear() === now.getFullYear() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getDate() === now.getDate();
                  
                  // Filter time slots if today is selected
                  const availableTimeSlots = isToday 
                    ? timeSlots.filter((time) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        const currentHours = now.getHours();
                        const currentMinutes = now.getMinutes();
                        // Only show times that are in the future
                        return hours > currentHours || (hours === currentHours && minutes > currentMinutes);
                      })
                    : timeSlots;
                  
                  return (
                    <FormItem>
                      <FormLabel>Time *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTimeSlots.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No available time slots for today
                            </div>
                          ) : (
                            availableTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration *</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durations.map((d) => (
                          <SelectItem key={d.value} value={d.value.toString()}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Interview Mode - Hidden for Assessment type */}
            {!isAssessmentType && (
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interview Mode *</FormLabel>
                    <div className="flex gap-2">
                      {[
                        { value: 'VIDEO', icon: Video, label: 'Video Call' },
                        { value: 'PHONE', icon: Phone, label: 'Phone' },
                        { value: 'IN_PERSON', icon: MapPin, label: 'In-Person' },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => field.onChange(option.value)}
                        >
                          <option.icon className="h-4 w-4 mr-2" />
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assessment Info Banner */}
            {isAssessmentType && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">Online Assessment</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
                      The candidate will receive an email with a unique assessment link. 
                      They can complete the test online anytime within the validity period.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Meeting Link, Phone Number, or Location based on mode */}
            {watchMode === 'IN_PERSON' && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., Meeting Room 3, Floor 2"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {watchMode === 'PHONE' && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dial-in Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., +1 (555) 123-4567 or Conference Line"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Conference line or interviewer&apos;s direct number (candidate&apos;s phone is in their profile)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {watchMode === 'VIDEO' && (
              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://meet.google.com/..."
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Paste your Google Meet, Zoom, or Teams link
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Interviewers / Panelists - Hidden for Assessment type */}
            {!isAssessmentType && (
              <FormField
                control={form.control}
                name="panelistIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interviewers *</FormLabel>
                    <div className="space-y-2">
                      {/* Selected Panelists */}
                      {selectedPanelists.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedPanelists.map((panelist) => (
                            <Badge
                              key={panelist.id}
                              variant="secondary"
                              className="py-1 px-2 flex items-center gap-2"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={panelist.avatar} />
                                <AvatarFallback className={`${getAvatarColor((panelist.email || '') + panelist.firstName + panelist.lastName).className} text-xs font-semibold`}>
                                  {panelist.firstName[0]}{panelist.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{panelist.firstName} {panelist.lastName}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePanelist(panelist.id)}
                                className="hover:bg-muted rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    
                      {/* Add Panelist Button */}
                      <Popover open={panelistOpen} onOpenChange={setPanelistOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Add Interviewer
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search employees..."
                              value={panelistSearch}
                              onValueChange={setPanelistSearch}
                            />
                            <div className="max-h-[200px] overflow-y-auto">
                              <CommandList>
                                {loadingEmployees ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-sm text-muted-foreground">Searching...</span>
                                  </div>
                                ) : filteredEmployees.length === 0 ? (
                                  <CommandEmpty>
                                    {panelistSearch ? 'No employees found.' : 'No employees available.'}
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredEmployees.map((employee) => (
                                      <CommandItem
                                        key={employee.id}
                                        value={employee.id}
                                        onSelect={() => handleAddPanelist(employee)}
                                      >
                                        <Avatar className="h-8 w-8 mr-2">
                                          <AvatarImage src={employee.avatar} />
                                          <AvatarFallback>
                                            {employee.firstName[0]}{employee.lastName[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {employee.firstName} {employee.lastName}
                                          </span>
                                          <span className="text-sm text-muted-foreground">
                                            {employee.designation || 'N/A'} • {employee.department || 'N/A'}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Instructions */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions / Topics to Cover</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., System Design questions, React deep dive, Past project discussion..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These instructions will be visible to all interviewers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Options */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="sendCalendarInvite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Send calendar invite to all participants
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sendEmailNotification"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Send email notification
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
