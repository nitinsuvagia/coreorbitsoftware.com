'use client';

import { useState, useEffect } from 'react';
import { format, startOfDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { getAvatarColor } from '@/lib/format';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Mail,
  Send,
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Edit,
  Save,
  Link,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledTest {
  id: string;
  testName: string;
  testId: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: string;
  startedAt?: Date;
  timeRemaining?: number;
  isToday: boolean;
  assessmentCode: string;
  score?: number;
  passed?: boolean;
}

// ============================================================================
// SEND REMINDER DIALOG
// ============================================================================

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ScheduledTest | null;
}

// Skeleton component for SendReminderDialog
function SendReminderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Candidate Info Skeleton */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Assessment Details Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <Separator />

      {/* Email Message Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-md" />
      </div>
    </div>
  );
}

export function SendReminderDialog({ open, onOpenChange, test }: SendReminderDialogProps) {
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!test) return null;

  const handleSendReminder = async () => {
    setSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    toast.success(`Reminder sent to ${test.candidateEmail}`);
    onOpenChange(false);
    setCustomMessage('');
  };

  const defaultMessage = `Dear ${test.candidateName},

This is a friendly reminder about your upcoming assessment:

📝 Assessment: ${test.testName}
📅 Date: ${format(test.scheduledDate, 'EEEE, MMMM d, yyyy')}
⏰ Time: ${test.scheduledTime}
⏱️ Duration: ${test.duration} minutes

Please ensure you have a stable internet connection and a quiet environment.

Your assessment code is: ${test.assessmentCode}

Best regards,
HR Team`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Reminder
          </DialogTitle>
          <DialogDescription>
            Send a reminder email to the candidate about their scheduled assessment
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <SendReminderSkeleton />
        ) : (
        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${getAvatarColor((test.candidateEmail || '') + (test.candidateName || '')).className} font-semibold`}>
                {(test.candidateName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{test.candidateName}</p>
              <p className="text-sm text-muted-foreground">{test.candidateEmail}</p>
            </div>
            <Badge variant="outline">{test.position}</Badge>
          </div>

          {/* Assessment Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{test.testName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{test.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(test.scheduledDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{test.scheduledTime}</span>
            </div>
          </div>

          <Separator />

          {/* Email Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Message
            </Label>
            <Textarea
              value={customMessage || defaultMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter your custom message..."
            />
            {customMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomMessage('')}
                className="text-xs"
              >
                Reset to default message
              </Button>
            )}
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendReminder} disabled={sending || isLoading}>
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EDIT SCHEDULE DIALOG
// ============================================================================

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ScheduledTest | null;
  onSave?: (updatedTest: ScheduledTest) => void;
}

// Skeleton component for EditScheduleDialog
function EditScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {/* Candidate Info Skeleton */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <Separator />

      {/* Date Picker Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Time Picker Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Duration Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Info Note Skeleton */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Skeleton className="h-4 w-4 mt-0.5" />
        <Skeleton className="h-4 flex-1" />
      </div>
    </div>
  );
}

export function EditScheduleDialog({ open, onOpenChange, test, onSave }: EditScheduleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(test?.scheduledDate);
  const [scheduledTime, setScheduledTime] = useState(test?.scheduledTime || '10:00 AM');
  const [duration, setDuration] = useState(test?.duration.toString() || '60');
  const [isLoading, setIsLoading] = useState(true);

  // Update state when test changes
  useState(() => {
    if (test) {
      setScheduledDate(test.scheduledDate);
      setScheduledTime(test.scheduledTime);
      setDuration(test.duration.toString());
    }
  });

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!test) return null;

  const handleSave = async () => {
    if (!scheduledDate) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedTest = {
      ...test,
      scheduledDate,
      scheduledTime,
      duration: parseInt(duration),
    };
    
    onSave?.(updatedTest);
    setSaving(false);
    toast.success('Schedule updated successfully');
    onOpenChange(false);
  };

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  ];

  const durations = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Edit Schedule
          </DialogTitle>
          <DialogDescription>
            Modify the assessment schedule for this candidate
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <EditScheduleSkeleton />
        ) : (
        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${getAvatarColor((test.candidateEmail || '') + (test.candidateName || '')).className} font-semibold`}>
                {(test.candidateName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{test.candidateName}</p>
              <p className="text-sm text-muted-foreground">{test.testName}</p>
            </div>
          </div>

          <Separator />

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <Select value={scheduledTime} onValueChange={setScheduledTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <p className="text-amber-800">
              The candidate will be notified about the schedule change via email.
            </p>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isLoading}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// RESEND INVITATION DIALOG
// ============================================================================

interface ResendInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ScheduledTest | null;
}

// Skeleton component for ResendInvitationDialog
function ResendInvitationSkeleton() {
  return (
    <div className="space-y-4">
      {/* Candidate Info Skeleton */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Assessment Details Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Assessment Code Skeleton */}
      <div className="p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
      </div>

      {/* Options Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Email Message Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[180px] w-full rounded-md" />
      </div>
    </div>
  );
}

export function ResendInvitationDialog({ open, onOpenChange, test }: ResendInvitationDialogProps) {
  const [sending, setSending] = useState(false);
  const [includeNewCode, setIncludeNewCode] = useState(false);
  const [updateSchedule, setUpdateSchedule] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Time slots for scheduling
  const resendTimeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  ];
  
  // Helper to parse time
  const parseTime = (time12: string): { hours: number; minutes: number } => {
    const [time, period] = time12.split(' ');
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  };
  
  // Get next available time slot
  const getNextAvailableTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    for (const slot of resendTimeSlots) {
      const { hours, minutes } = parseTime(slot);
      if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
        return slot;
      }
    }
    return resendTimeSlots[0];
  };
  
  const [newDate, setNewDate] = useState<Date | undefined>(test?.scheduledDate || new Date());
  const [newTime, setNewTime] = useState(test?.scheduledTime || getNextAvailableTime());

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      // Reset to test's current schedule when dialog opens
      setNewDate(test?.scheduledDate || new Date());
      setNewTime(test?.scheduledTime || getNextAvailableTime());
      setUpdateSchedule(false);
      const timer = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [open, test]);

  if (!test) return null;

  const handleResend = async () => {
    setSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    
    let successMessage = `Invitation resent to ${test.candidateEmail}`;
    if (updateSchedule) {
      successMessage += ` with new schedule: ${format(newDate!, 'MMM d, yyyy')} at ${newTime}`;
    }
    
    toast.success(successMessage);
    onOpenChange(false);
    setCustomMessage('');
    setIncludeNewCode(false);
    setUpdateSchedule(false);
  };

  // Use new date/time if updating schedule, otherwise use original
  const displayDate = updateSchedule && newDate ? newDate : test.scheduledDate;
  const displayTime = updateSchedule ? newTime : test.scheduledTime;

  const defaultMessage = `Dear ${test.candidateName},

We are resending your assessment invitation. Please find the details below:

📝 Assessment: ${test.testName}
📅 Date: ${format(displayDate, 'EEEE, MMMM d, yyyy')}
⏰ Time: ${displayTime}
⏱️ Duration: ${test.duration} minutes
🔑 Assessment Code: ${test.assessmentCode}

To start your assessment:
1. Go to our assessment portal
2. Enter your assessment code
3. Complete the test within the given time

If you have any questions, please don't hesitate to contact us.

Best regards,
HR Team`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            Resend Invitation
          </DialogTitle>
          <DialogDescription>
            Resend the assessment invitation email to the candidate
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <ResendInvitationSkeleton />
        ) : (
        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={`${getAvatarColor((test.candidateEmail || '') + (test.candidateName || '')).className} font-semibold`}>
                {(test.candidateName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{test.candidateName}</p>
              <p className="text-sm text-muted-foreground">{test.candidateEmail}</p>
            </div>
            <Badge className="bg-purple-100 text-purple-700">Invited</Badge>
          </div>

          {/* Assessment Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{test.testName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{test.duration} minutes</span>
            </div>
          </div>

          {/* Current Code */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Assessment Code:</span>
              </div>
              <code className="px-2 py-1 bg-background rounded font-mono text-sm">
                {test.assessmentCode}
              </code>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={includeNewCode}
                onChange={(e) => setIncludeNewCode(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Generate new assessment code</p>
                <p className="text-xs text-muted-foreground">
                  The old code will be invalidated
                </p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={updateSchedule}
                onChange={(e) => setUpdateSchedule(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Update schedule date & time</p>
                <p className="text-xs text-muted-foreground">
                  Set a new date and time for the assessment
                </p>
              </div>
            </label>
            
            {/* New Date & Time Pickers */}
            {updateSchedule && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Date Picker */}
                  <div className="space-y-1">
                    <Label className="text-xs">New Date</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !newDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {newDate ? format(newDate, 'MMM d, yyyy') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={(date) => {
                            setNewDate(date);
                            // Close the popover after date selection
                            setTimeout(() => setDatePickerOpen(false), 0);
                            // If switching to today, ensure time is valid
                            if (date && isToday(date)) {
                              const now = new Date();
                              const currentHour = now.getHours();
                              const currentMinute = now.getMinutes();
                              const { hours, minutes } = parseTime(newTime);
                              if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
                                setNewTime(getNextAvailableTime());
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
                  <div className="space-y-1">
                    <Label className="text-xs">New Time</Label>
                    <Select value={newTime} onValueChange={setNewTime}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {resendTimeSlots.map((time) => {
                          if (newDate && isToday(newDate)) {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const { hours, minutes } = parseTime(time);
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
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Email Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Message
            </Label>
            <Textarea
              value={customMessage || defaultMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[180px] font-mono text-sm"
              placeholder="Enter your custom message..."
            />
            {customMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomMessage('')}
                className="text-xs"
              >
                Reset to default message
              </Button>
            )}
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleResend} disabled={sending || isLoading}>
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Resend Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COPY LINK COMPONENT (for inline copy button)
// ============================================================================

interface CopyLinkButtonProps {
  code: string;
  className?: string;
}

export function CopyLinkButton({ code, className }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Create the assessment link
      const link = `${window.location.origin}/assessment/start?code=${code}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Assessment link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={className}
      title="Copy assessment link"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
