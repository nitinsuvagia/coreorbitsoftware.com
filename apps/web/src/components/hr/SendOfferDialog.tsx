'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Award, Mail } from 'lucide-react';
import { candidateApi } from '@/lib/api/candidates';

interface CandidateForOffer {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  expectedSalary?: number;
}

interface JobInfo {
  title?: string;
  department?: string;
}

interface SendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateForOffer | null;
  job?: JobInfo | null;
  currency?: string;
  onSuccess?: () => void;
}

export function SendOfferDialog({
  open,
  onOpenChange,
  candidate,
  job,
  currency = 'INR',
  onSuccess,
}: SendOfferDialogProps) {
  const [offerData, setOfferData] = useState({
    salary: 0,
    currency: currency,
    joiningDate: '',
    designation: '',
    department: '',
  });
  const [sendingOffer, setSendingOffer] = useState(false);

  // Reset form when dialog opens with new candidate
  useEffect(() => {
    if (open && candidate) {
      setOfferData({
        salary: candidate.expectedSalary || 0,
        currency: currency,
        joiningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        designation: job?.title || '',
        department: job?.department || '',
      });
    }
  }, [open, candidate, job, currency]);

  const handleSendOffer = async () => {
    if (!candidate) return;

    if (!offerData.salary || offerData.salary <= 0) {
      toast.error('Please enter a valid salary');
      return;
    }
    if (!offerData.joiningDate) {
      toast.error('Please select a joining date');
      return;
    }

    try {
      setSendingOffer(true);
      const result = await candidateApi.sendOffer(candidate.jobId, candidate.id, {
        salary: offerData.salary,
        currency: offerData.currency,
        joiningDate: offerData.joiningDate,
        designation: offerData.designation,
        department: offerData.department,
      });

      toast.success('Offer Sent Successfully!', {
        description: `Offer email has been sent to ${candidate.email}. Valid until ${new Date(result.expiresAt).toLocaleDateString()}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to send offer:', error);
      toast.error('Failed to send offer', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Send Job Offer
          </DialogTitle>
          <DialogDescription>
            Send an offer letter to {candidate?.firstName} {candidate?.lastName}.
            They will receive an email with a link to accept or decline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offer-salary">Annual Salary *</Label>
              <Input
                id="offer-salary"
                type="number"
                value={offerData.salary || ''}
                onChange={(e) => setOfferData({ ...offerData, salary: Number(e.target.value) })}
                placeholder="e.g. 1200000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-currency">Currency</Label>
              <Select
                value={offerData.currency}
                onValueChange={(value) => setOfferData({ ...offerData, currency: value })}
              >
                <SelectTrigger id="offer-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-joining-date">Joining Date *</Label>
            <Input
              id="offer-joining-date"
              type="date"
              value={offerData.joiningDate}
              onChange={(e) => setOfferData({ ...offerData, joiningDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-designation">Designation</Label>
            <Input
              id="offer-designation"
              value={offerData.designation}
              onChange={(e) => setOfferData({ ...offerData, designation: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-department">Department</Label>
            <Input
              id="offer-department"
              value={offerData.department}
              onChange={(e) => setOfferData({ ...offerData, department: e.target.value })}
              placeholder="e.g. Engineering"
            />
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">📧 What happens next?</p>
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              <li>• Candidate receives an email with offer details</li>
              <li>• They can accept or decline via a secure link</li>
              <li>• The offer is valid for 7 days</li>
              <li>• If accepted, an employee record is automatically created</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendingOffer}>
            Cancel
          </Button>
          <Button
            onClick={handleSendOffer}
            disabled={sendingOffer || !offerData.salary || !offerData.joiningDate}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {sendingOffer ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Offer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
