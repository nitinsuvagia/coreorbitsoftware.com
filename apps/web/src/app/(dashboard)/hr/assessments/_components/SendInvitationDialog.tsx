'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { assessmentApi, TestForSelection, CreateInvitationDto } from '@/lib/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Send,
  CalendarIcon,
  X,
  Plus,
  Mail,
  FileText,
  Users,
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface SendInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTestId?: string;
}

export function SendInvitationDialog({ 
  open, 
  onOpenChange,
  preselectedTestId,
}: SendInvitationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(true);
  const [tests, setTests] = useState<TestForSelection[]>([]);
  const [selectedTestId, setSelectedTestId] = useState(preselectedTestId || '');
  const [expiryDate, setExpiryDate] = useState<Date>(addDays(new Date(), 7));
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Load published tests when dialog opens
  useEffect(() => {
    if (open) {
      setIsDialogLoading(true);
      loadPublishedTests();
    }
  }, [open]);

  // Update selected test when preselectedTestId changes
  useEffect(() => {
    if (preselectedTestId) {
      setSelectedTestId(preselectedTestId);
    }
  }, [preselectedTestId]);

  const loadPublishedTests = async () => {
    try {
      const data = await assessmentApi.getPublishedTests();
      setTests(data);
    } catch (error) {
      console.error('Failed to load tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setIsDialogLoading(false);
    }
  };

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  // Skeleton Loading for Dialog
  const DialogSkeleton = () => (
    <div className="space-y-4 py-4">
      {/* Test Selection Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Recipients Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Expiry Date Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Message Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Footer Skeleton */}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );

  const addRecipient = () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (recipients.some((r) => r.email === newEmail)) {
      toast.error('This email has already been added');
      return;
    }

    setRecipients([
      ...recipients,
      {
        id: `r-${Date.now()}`,
        name: newName.trim() || newEmail.split('@')[0],
        email: newEmail.trim(),
      },
    ]);
    setNewEmail('');
    setNewName('');
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSendInvitations = async () => {
    if (!selectedTestId) {
      toast.error('Please select a test');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    setIsLoading(true);
    try {
      // Send invitations for each recipient
      const validUntil = expiryDate.toISOString();
      const validFrom = new Date().toISOString();
      
      const promises = recipients.map((recipient) => {
        const invitationData: CreateInvitationDto = {
          testId: selectedTestId,
          candidateEmail: recipient.email,
          candidateName: recipient.name,
          validFrom,
          validUntil,
          sendEmail: true,
        };
        return assessmentApi.createInvitation(invitationData);
      });

      await Promise.all(promises);
      
      toast.success(`Invitations sent to ${recipients.length} candidate(s)`);
      onOpenChange(false);
      
      // Reset form
      setRecipients([]);
      setCustomMessage('');
      if (!preselectedTestId) {
        setSelectedTestId('');
      }
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      toast.error(error.message || 'Failed to send invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form on close
    setRecipients([]);
    setCustomMessage('');
    setNewEmail('');
    setNewName('');
    if (!preselectedTestId) {
      setSelectedTestId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {selectedTest ? (
              <>Send Assessment <span className="font-bold">{selectedTest.name}</span> Invitation</>
            ) : (
              'Send Assessment Invitation'
            )}
          </DialogTitle>
          <DialogDescription>
            Invite candidates to take an assessment test via email
          </DialogDescription>
        </DialogHeader>

        {isDialogLoading ? (
          <DialogSkeleton />
        ) : (
        <div className="space-y-6 py-4">
          {/* Test Selection */}
          <div className="space-y-2">
            <Label>Select Test *</Label>
            <Select value={selectedTestId} onValueChange={setSelectedTestId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a test" />
              </SelectTrigger>
              <SelectContent>
                {tests.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No published tests available
                  </div>
                ) : (
                  tests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{test.name}</span>
                        <span className="text-muted-foreground text-xs">({test.duration} min)</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label>Invitation Expires On</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={(date) => date && setExpiryDate(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Candidates must complete the test before this date
            </p>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-1/3"
              />
              <Input
                placeholder="Email address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button type="button" onClick={addRecipient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                {recipients.map((recipient) => (
                  <Badge key={recipient.id} variant="secondary" className="gap-1 py-1.5 px-3">
                    <Users className="h-3 w-3" />
                    <span>{recipient.name}</span>
                    <span className="text-muted-foreground">({recipient.email})</span>
                    <button
                      onClick={() => removeRecipient(recipient.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Press Enter or click + to add recipients
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Custom Message (Optional)</Label>
            <Textarea
              placeholder="Add a personal message to include in the invitation email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedTest && recipients.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Summary</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Test: <span className="font-medium">{selectedTest.name}</span></p>
                <p>• Duration: <span className="font-medium">{selectedTest.duration} minutes</span></p>
                <p>• Questions: <span className="font-medium">{selectedTest.questionsCount}</span></p>
                <p>• Recipients: <span className="font-medium">{recipients.length}</span></p>
                <p>• Expires: <span className="font-medium">{format(expiryDate, 'PPP')}</span></p>
              </div>
            </div>
          )}
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvitations} 
            disabled={isLoading || !selectedTestId || recipients.length === 0}
          >
            {isLoading ? (
              <>Sending...</>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send {recipients.length > 0 && `(${recipients.length})`} Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
