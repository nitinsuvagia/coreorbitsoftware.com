'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MonthPicker } from '@/components/ui/month-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Star,
  Loader2,
  Save,
  Send,
  ClipboardList,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode?: string;
  designation?: { name: string } | null;
}

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess?: () => void;
}

// ============================================================================
// SCHEMA
// ============================================================================

const optionalRating = z.number().min(0).max(10).optional().transform(val => val === 0 ? undefined : val);

const reviewFormSchema = z.object({
  reviewPeriod: z.string().min(1, 'Review period is required'), // Format: "MMM YYYY" from MonthPicker
  reviewType: z.enum(['monthly', 'quarterly', 'annual', '360', 'probation']),
  
  // Category ratings (1-10 scale)
  communicationRating: optionalRating,
  technicalSkillsRating: optionalRating,
  teamworkRating: optionalRating,
  problemSolvingRating: optionalRating,
  punctualityRating: optionalRating,
  initiativeRating: optionalRating,
  
  // Overall (1-10 scale) - optional, will auto-calculate
  overallRating: z.number().min(0).max(10).optional(),
  
  // Text feedback
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  goalsNextPeriod: z.string().optional(),
  additionalComments: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

// ============================================================================
// STAR RATING COMPONENT
// ============================================================================

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

function StarRating({ value, onChange, label, description }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="p-0.5 focus:outline-none"
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                (hoverValue || value) >= star
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground w-10">
          {value > 0 ? `${value}/10` : ''}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// OVERALL RATING COMPONENT (1-10 scale)
// ============================================================================

interface OverallRatingProps {
  value: number;
  onChange: (value: number) => void;
}

function OverallRating({ value, onChange }: OverallRatingProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">Overall Rating</span>
        <span className="text-xs text-muted-foreground">(1-10 scale)</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={cn(
              'w-8 h-8 rounded-md border text-sm font-medium transition-colors',
              value >= num
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:border-primary/50'
            )}
          >
            {num}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value >= 9 ? 'Outstanding' : 
         value >= 7 ? 'Excellent' : 
         value >= 5 ? 'Good' : 
         value >= 3 ? 'Needs Improvement' : 
         value >= 1 ? 'Unsatisfactory' : 'Not rated'}
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WriteReviewDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: WriteReviewDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      reviewPeriod: '',
      reviewType: 'monthly',
      communicationRating: 0,
      technicalSkillsRating: 0,
      teamworkRating: 0,
      problemSolvingRating: 0,
      punctualityRating: 0,
      initiativeRating: 0,
      overallRating: 0,
      strengths: '',
      areasForImprovement: '',
      goalsNextPeriod: '',
      additionalComments: '',
    },
  });

  // Reset form when dialog opens — default to current month
  useEffect(() => {
    if (open) {
      const now = new Date();
      const currentPeriod = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Feb 2026"
      form.reset({
        reviewPeriod: currentPeriod,
        reviewType: 'monthly',
        communicationRating: 0,
        technicalSkillsRating: 0,
        teamworkRating: 0,
        problemSolvingRating: 0,
        punctualityRating: 0,
        initiativeRating: 0,
        overallRating: 0,
        strengths: '',
        areasForImprovement: '',
        goalsNextPeriod: '',
        additionalComments: '',
      });
      setExistingReviewId(null);
    }
  }, [open, form]);

  // Load existing review when employee + period match
  const watchedPeriod = form.watch('reviewPeriod');
  useEffect(() => {
    if (!open || !employee?.id || !watchedPeriod) {
      return;
    }
    let cancelled = false;
    const loadExisting = async () => {
      setLoadingExisting(true);
      try {
        const response = await apiClient.get(`/api/v1/performance-reviews/employee/${employee.id}`);
        if (cancelled) return;
        const reviews = response.success ? (Array.isArray(response.data) ? response.data : []) : [];
        const match = reviews.find((r: any) => r.reviewPeriod === watchedPeriod);
        if (match) {
          setExistingReviewId(match.id);
          form.setValue('reviewType', match.reviewType || 'monthly');
          form.setValue('communicationRating', match.communicationRating ?? 0);
          form.setValue('technicalSkillsRating', match.technicalSkillsRating ?? 0);
          form.setValue('teamworkRating', match.teamworkRating ?? 0);
          form.setValue('problemSolvingRating', match.problemSolvingRating || 0);
          form.setValue('punctualityRating', match.punctualityRating || 0);
          form.setValue('initiativeRating', match.initiativeRating || 0);
          form.setValue('overallRating', match.overallRating || 0);
          form.setValue('strengths', match.strengths || '');
          form.setValue('areasForImprovement', match.areasForImprovement || '');
          form.setValue('goalsNextPeriod', match.goalsNextPeriod || '');
          form.setValue('additionalComments', match.additionalComments || '');
          toast.info('Loaded existing review for this period');
        } else {
          setExistingReviewId(null);
          // Clear form fields when no existing review for this period
          form.setValue('reviewType', 'monthly');
          form.setValue('communicationRating', 0);
          form.setValue('technicalSkillsRating', 0);
          form.setValue('teamworkRating', 0);
          form.setValue('problemSolvingRating', 0);
          form.setValue('punctualityRating', 0);
          form.setValue('initiativeRating', 0);
          form.setValue('overallRating', 0);
          form.setValue('strengths', '');
          form.setValue('areasForImprovement', '');
          form.setValue('goalsNextPeriod', '');
          form.setValue('additionalComments', '');
        }
      } catch {
        // Silently fail - just create new
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    };
    loadExisting();
    return () => { cancelled = true; };
  }, [open, employee?.id, watchedPeriod]);

  // Calculate average from category ratings
  const watchedRatings = form.watch([
    'communicationRating',
    'technicalSkillsRating',
    'teamworkRating',
    'problemSolvingRating',
    'punctualityRating',
    'initiativeRating',
  ]);

  const avgRating = (() => {
    const nonZero = watchedRatings.filter(r => r && r > 0) as number[];
    if (nonZero.length === 0) return 0;
    return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
  })();

  // Suggest overall rating based on category average (already 1-10 scale)
  const suggestedOverall = avgRating > 0 ? Math.round(avgRating) : 0;

  const onSubmit = async (data: ReviewFormData, status: 'draft' | 'submitted') => {
    const isSubmitting = status === 'submitted';
    
    if (isSubmitting) {
      setSubmitting(true);
    } else {
      setIsSavingDraft(true);
    }

    try {
      const payload = {
        employeeId: employee.id,
        reviewPeriod: data.reviewPeriod,
        reviewType: data.reviewType,
        communicationRating: data.communicationRating || null,
        technicalSkillsRating: data.technicalSkillsRating || null,
        teamworkRating: data.teamworkRating || null,
        problemSolvingRating: data.problemSolvingRating || null,
        punctualityRating: data.punctualityRating || null,
        initiativeRating: data.initiativeRating || null,
        overallRating: data.overallRating || suggestedOverall || null,
        strengths: data.strengths || null,
        areasForImprovement: data.areasForImprovement || null,
        goalsNextPeriod: data.goalsNextPeriod || null,
        additionalComments: data.additionalComments || null,
        status,
      };

      let response;
      if (existingReviewId) {
        // Update existing review
        response = await apiClient.put(`/api/v1/performance-reviews/${existingReviewId}`, payload);
      } else {
        // Create new review
        response = await apiClient.post('/api/v1/performance-reviews', payload);
      }

      if (response.success) {
        toast.success(
          isSubmitting 
            ? 'Performance review submitted successfully' 
            : 'Review saved as draft'
        );
        // Invalidate all performance review queries so the list updates immediately
        queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['performance-review-stats'] });
        queryClient.invalidateQueries({ queryKey: ['employee-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['employee-performance-summary'] });
        queryClient.invalidateQueries({ queryKey: ['pending-reviews-count'] });
        onOpenChange(false);
        onSuccess?.();
      } else {
        const errMsg = response.error?.message;
        let displayMsg = 'Failed to save review';
        if (typeof errMsg === 'string') {
          displayMsg = errMsg;
        } else if (Array.isArray(errMsg)) {
          displayMsg = (errMsg as any[]).map((e: any) => (typeof e === 'string' ? e : e?.message || String(e))).join(', ');
        }
        toast.error(displayMsg);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save review');
    } finally {
      setSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Removed unused defaultPeriod - MonthPicker handles this

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {existingReviewId ? 'Edit Performance Review' : 'Write Performance Review'}
            {loadingExisting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName}
            {employee.designation?.name && ` • ${employee.designation.name}`}
            {employee.employeeCode && ` • ${employee.employeeCode}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => onSubmit(data, 'submitted'))}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Review Period & Type */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reviewPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Period *</FormLabel>
                      <FormControl>
                        <MonthPicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select month"
                          maxDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reviewType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly Review</SelectItem>
                          <SelectItem value="quarterly">Quarterly Review</SelectItem>
                          <SelectItem value="annual">Annual Review</SelectItem>
                          <SelectItem value="360">360° Review</SelectItem>
                          <SelectItem value="probation">Probation Review</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Ratings */}
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Performance Categories
                </h3>
                <div className="border rounded-lg p-4 space-y-2">
                  <FormField
                    control={form.control}
                    name="communicationRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Communication"
                        description="Clarity and effectiveness in communication"
                      />
                    )}
                  />
                  <Separator />

                  <FormField
                    control={form.control}
                    name="technicalSkillsRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Technical Skills"
                        description="Job-specific knowledge and expertise"
                      />
                    )}
                  />
                  <Separator />

                  <FormField
                    control={form.control}
                    name="teamworkRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Teamwork"
                        description="Collaboration and team contribution"
                      />
                    )}
                  />
                  <Separator />

                  <FormField
                    control={form.control}
                    name="problemSolvingRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Problem Solving"
                        description="Ability to analyze and resolve issues"
                      />
                    )}
                  />
                  <Separator />

                  <FormField
                    control={form.control}
                    name="punctualityRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Punctuality"
                        description="Time management and meeting deadlines"
                      />
                    )}
                  />
                  <Separator />

                  <FormField
                    control={form.control}
                    name="initiativeRating"
                    render={({ field }) => (
                      <StarRating
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Initiative"
                        description="Proactive approach and self-motivation"
                      />
                    )}
                  />
                </div>

                {/* Average Rating Display */}
                {avgRating > 0 && (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-muted-foreground">Category Average:</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="font-medium">{avgRating.toFixed(1)}/10</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Rating */}
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Overall Assessment
                </h3>
                <div className="border rounded-lg p-4">
                  <FormField
                    control={form.control}
                    name="overallRating"
                    render={({ field }) => (
                      <OverallRating
                        value={field.value || suggestedOverall}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {suggestedOverall > 0 && !form.watch('overallRating') && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Suggested: {suggestedOverall}/10 (based on category average)
                    </p>
                  )}
                </div>
              </div>

              {/* Feedback Text */}
              <div className="space-y-4">
                <h3 className="font-medium">Written Feedback</h3>
                
                <FormField
                  control={form.control}
                  name="strengths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="text-green-500">+</span> Strengths
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What does this employee do well? Notable achievements, skills, and positive contributions..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areasForImprovement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="text-orange-500">→</span> Areas for Improvement
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Skills or behaviors that could be enhanced, constructive feedback..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goalsNextPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-blue-500" /> Goals for Next Period
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Objectives and targets to focus on in the upcoming review period..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any other observations or notes..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting || isSavingDraft}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting || isSavingDraft}
                onClick={() => {
                  form.handleSubmit(
                    (data) => onSubmit(data, 'draft'),
                    (errors) => {
                      const errorMessages = Object.values(errors).map(e => e?.message).filter(Boolean);
                      if (errorMessages.length > 0) {
                        toast.error(`Please fix: ${errorMessages.join(', ')}`);
                      }
                    }
                  )();
                }}
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                type="submit"
                disabled={submitting || isSavingDraft}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
