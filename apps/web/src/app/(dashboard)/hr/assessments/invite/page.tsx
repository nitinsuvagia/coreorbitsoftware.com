'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { getAvatarColor } from '@/lib/format';
import { 
  assessmentApi, 
  TestForSelection, 
  CandidateForInvite,
  BulkInvitationDto 
} from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Search,
  Send,
  Users,
  ClipboardList,
  X,
  AlertCircle,
  Loader2,
  FileQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Time slots for scheduling
const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
];

// Convert 12-hour time to 24-hour for Date
function parseTime12to24(time12: string): { hours: number; minutes: number } {
  const [time, period] = time12.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InviteCandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTestId = searchParams.get('testId') || '';
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data states
  const [candidates, setCandidates] = useState<CandidateForInvite[]>([]);
  const [tests, setTests] = useState<TestForSelection[]>([]);
  
  // Form state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>(preselectedTestId);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState(() => {
    // Default to next available time slot
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (const slot of timeSlots) {
      const { hours, minutes } = parseTime12to24(slot);
      if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
        return slot;
      }
    }
    return timeSlots[0]; // Default to first slot if all have passed
  });
  const [expiryDays, setExpiryDays] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Update selectedTestId when preselectedTestId changes
  useEffect(() => {
    if (preselectedTestId) {
      setSelectedTestId(preselectedTestId);
    }
  }, [preselectedTestId]);

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [candidatesData, testsData] = await Promise.all([
          assessmentApi.getCandidatesForInvite(),
          assessmentApi.getPublishedTests(),
        ]);
        setCandidates(candidatesData);
        setTests(testsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load candidates and tests');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query) ||
      candidate.jobTitle.toLowerCase().includes(query)
    );
  });

  // Toggle candidate selection
  const toggleCandidate = (candidateId: string) => {
    if (selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== candidateId));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, candidateId]);
    }
  };

  // Select all filtered candidates
  const selectAllCandidates = () => {
    const filteredIds = filteredCandidates.map(c => c.id);
    setSelectedCandidateIds(filteredIds);
  };

  // Clear all selections
  const clearAllCandidates = () => {
    setSelectedCandidateIds([]);
  };

  // Get selected test details
  const selectedTest = tests.find(t => t.id === selectedTestId);

  // Get selected candidates
  const selectedCandidates = candidates.filter(c => selectedCandidateIds.includes(c.id));

  // Check if form is valid
  const isFormValid = selectedCandidateIds.length > 0 && selectedTestId && scheduledDate;

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || !scheduledDate) return;

    setIsSubmitting(true);
    
    try {
      // Calculate valid from and until dates
      const { hours, minutes } = parseTime12to24(scheduledTime);
      const validFrom = new Date(scheduledDate);
      validFrom.setHours(hours, minutes, 0, 0);
      
      const validUntil = addDays(validFrom, expiryDays);

      const invitationData: BulkInvitationDto = {
        testId: selectedTestId,
        candidateIds: selectedCandidateIds,
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
        sendEmail: true,
      };

      await assessmentApi.bulkCreateInvitations(invitationData);

      toast.success(
        `Successfully sent ${selectedCandidateIds.length} invitation(s)!`,
        {
          description: 'Assessment codes have been generated for each candidate.',
        }
      );

      router.push('/hr/assessments?tab=current');
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      toast.error(error.message || 'Failed to send invitations');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skeleton Loading UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="border rounded-lg">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border-b last:border-0 p-3 flex items-center gap-4">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-full" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/hr/assessments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Invite Candidates to Assessment</h1>
        <p className="text-muted-foreground mt-2">
          Select candidates, choose a test, and schedule the assessment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Candidate Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Search & Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Candidates
              </CardTitle>
              <CardDescription>
                {candidates.length} candidates available for assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or position..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={selectAllCandidates}>
                  Select All
                </Button>
                {selectedCandidateIds.length > 0 && (
                  <Button variant="ghost" onClick={clearAllCandidates}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Candidate List */}
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">No candidates available</p>
                  <p className="text-muted-foreground text-sm">
                    Add candidates through the recruitment module first
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[350px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate) => {
                        const isSelected = selectedCandidateIds.includes(candidate.id);
                        const hasExistingInvitation = candidate.existingInvitations.some(
                          inv => inv.testId === selectedTestId && inv.status !== 'EXPIRED' && inv.status !== 'CANCELLED'
                        );
                        
                        return (
                          <TableRow
                            key={candidate.id}
                            className={cn(
                              'cursor-pointer transition-colors',
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                              hasExistingInvitation && 'opacity-50'
                            )}
                            onClick={() => !hasExistingInvitation && toggleCandidate(candidate.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                disabled={hasExistingInvitation}
                                onCheckedChange={() => !hasExistingInvitation && toggleCandidate(candidate.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`${getAvatarColor(candidate.email).className} text-xs font-semibold`}>
                                    {candidate.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{candidate.name}</p>
                                  <p className="text-xs text-muted-foreground">{candidate.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{candidate.jobTitle}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                candidate.status === 'SHORTLISTED' && 'bg-green-50 text-green-700 border-green-200',
                                candidate.status === 'SCREENING' && 'bg-blue-50 text-blue-700 border-blue-200',
                                candidate.status === 'APPLIED' && 'bg-gray-50 text-gray-700 border-gray-200',
                              )}>
                                {candidate.status}
                              </Badge>
                              {hasExistingInvitation && (
                                <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Already Invited
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredCandidates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No candidates found matching your search
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {/* Selected Count */}
              {selectedCandidateIds.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">
                    {selectedCandidateIds.length} candidate(s) selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Test & Schedule */}
        <div className="space-y-6">
          {/* Test Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Select Test
              </CardTitle>
              <CardDescription>
                Choose a published assessment test
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-sm font-medium">No published tests</p>
                  <p className="text-xs text-muted-foreground">
                    Publish a test first to send invitations
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => router.push('/hr/assessments/tests')}
                  >
                    Go to Tests
                  </Button>
                </div>
              ) : (
                <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        <div className="flex flex-col">
                          <span>{test.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {test.duration} min • {test.questionsCount} questions • {test.passingScore}% pass
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedTest && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">{selectedTest.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {selectedTest.duration} min
                    </span>
                    <span>{selectedTest.questionsCount} questions</span>
                    <span>Pass: {selectedTest.passingScore}%</span>
                  </div>
                  {selectedTest.category && (
                    <Badge variant="outline" className="text-xs">
                      {selectedTest.category}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Set the start date and validity period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !scheduledDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(date) => {
                        setScheduledDate(date);
                        // Close the popover after date selection
                        setTimeout(() => setDatePickerOpen(false), 0);
                        // If switching to today, ensure time is valid
                        if (date && isToday(date)) {
                          const now = new Date();
                          const currentHour = now.getHours();
                          const currentMinute = now.getMinutes();
                          const { hours, minutes } = parseTime12to24(scheduledTime);
                          
                          // If current selected time has passed, find next available
                          if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
                            for (const slot of timeSlots) {
                              const slotTime = parseTime12to24(slot);
                              if (slotTime.hours > currentHour || (slotTime.hours === currentHour && slotTime.minutes > currentMinute)) {
                                setScheduledTime(slot);
                                break;
                              }
                            }
                          }
                        }
                      }}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => {
                      // If today is selected, disable past time slots
                      if (scheduledDate && isToday(scheduledDate)) {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();
                        const { hours, minutes } = parseTime12to24(time);
                        const isPast = hours < currentHour || (hours === currentHour && minutes <= currentMinute);
                        
                        if (isPast) {
                          return (
                            <SelectItem key={time} value={time} disabled className="text-muted-foreground">
                              {time}
                            </SelectItem>
                          );
                        }
                      }
                      return (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Days */}
              <div className="space-y-2">
                <Label>Valid For</Label>
                <Select value={String(expiryDays)} onValueChange={(v) => setExpiryDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduledDate && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  Expires: {format(addDays(scheduledDate, expiryDays), 'PPP')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary & Submit */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Candidates</span>
                  <span className="font-medium">{selectedCandidateIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Test</span>
                  <span className="font-medium">{selectedTest?.name || 'None'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Invitations</span>
                  <span className="text-lg font-bold">{selectedCandidateIds.length}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!isFormValid || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {selectedCandidateIds.length} Invitation(s)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
