'use client';

import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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
  ThumbsUp,
  ThumbsDown,
  Minus,
  Save,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Interview,
  Recommendation,
  interviewApi,
  recommendationLabels,
} from '@/lib/api/interviews';

// ============================================================================
// SCHEMA
// ============================================================================

// Helper to handle optional star ratings (0 means not rated, which is OK)
const optionalRating = z.number().min(0).max(5).optional().transform(val => val === 0 ? undefined : val);

const feedbackFormSchema = z.object({
  technicalRating: optionalRating,
  problemSolvingRating: optionalRating,
  communicationRating: optionalRating,
  culturalFitRating: optionalRating,
  leadershipRating: optionalRating,
  overallRating: z.number().min(1, 'Please provide an overall rating').max(5, 'Rating must be between 1 and 5'),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  comments: z.string().optional(),
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE'], {
    required_error: 'Please select a recommendation',
    invalid_type_error: 'Please select a recommendation',
  }),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

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
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
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
                'h-6 w-6 transition-colors',
                (hoverValue || value) >= star
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground w-8">
          {value > 0 ? `${value}/5` : ''}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

interface FeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interview: Interview;
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
  onSuccess,
  interview,
}: FeedbackFormDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      technicalRating: 0,
      problemSolvingRating: 0,
      communicationRating: 0,
      culturalFitRating: 0,
      leadershipRating: 0,
      overallRating: 0,
      strengths: '',
      weaknesses: '',
      comments: '',
      recommendation: undefined,
    },
  });

  const watchedRatings = form.watch([
    'technicalRating',
    'problemSolvingRating',
    'communicationRating',
    'culturalFitRating',
    'leadershipRating',
  ]);

  // Calculate average rating
  const validRatings = watchedRatings.filter((r): r is number => r !== undefined && r !== null && r > 0);
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
    : 0;

  // Handle form submission
  const onSubmit = async (data: FeedbackFormData, isDraft: boolean = false) => {
    if (!user?.id) {
      toast.error('You must be logged in to submit feedback');
      return;
    }
    
    try {
      setSubmitting(true);
      await interviewApi.submitFeedback(interview.id, {
        ...data,
        isDraft,
        interviewerId: user.id,
      });
      toast.success(isDraft ? 'Feedback saved as draft' : 'Feedback submitted successfully');
      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const recommendationOptions: { value: Recommendation; label: string; icon: React.ReactNode; color: string }[] = [
    {
      value: 'STRONG_HIRE',
      label: 'Strong Hire',
      icon: <span className="text-lg">👍👍</span>,
      color: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    },
    {
      value: 'HIRE',
      label: 'Hire',
      icon: <ThumbsUp className="h-5 w-5 text-emerald-500" />,
      color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      value: 'MAYBE',
      label: 'Maybe',
      icon: <Minus className="h-5 w-5 text-yellow-500" />,
      color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      value: 'NO_HIRE',
      label: 'No Hire',
      icon: <ThumbsDown className="h-5 w-5 text-red-500" />,
      color: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    },
    {
      value: 'STRONG_NO_HIRE',
      label: 'Strong No Hire',
      icon: <span className="text-lg">👎👎</span>,
      color: 'border-red-700 bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle>Submit Interview Feedback</DialogTitle>
          <DialogDescription>
            {interview.candidate?.firstName} {interview.candidate?.lastName} • {interview.job?.title}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(
              (data) => onSubmit(data),
              (errors) => {
                console.error('Form validation errors:', errors);
                const errorMessages = Object.values(errors).map(e => e?.message).filter(Boolean);
                if (errorMessages.length > 0) {
                  toast.error(`Please fix the following: ${errorMessages.join(', ')}`);
                } else {
                  toast.error('Please fill in all required fields');
                }
              }
            )} 
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Rating Categories */}
            <div className="space-y-2">
              <h3 className="font-medium">Rating Categories</h3>
              <div className="border rounded-lg p-4 space-y-2">
                <FormField
                  control={form.control}
                  name="technicalRating"
                  render={({ field }) => (
                    <StarRating
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Technical Skills"
                      description="Knowledge of required technologies"
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
                      description="Approach to solving complex problems"
                    />
                  )}
                />
                <Separator />
                
                <FormField
                  control={form.control}
                  name="communicationRating"
                  render={({ field }) => (
                    <StarRating
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Communication"
                      description="Clarity in explaining ideas"
                    />
                  )}
                />
                <Separator />
                
                <FormField
                  control={form.control}
                  name="culturalFitRating"
                  render={({ field }) => (
                    <StarRating
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Cultural Fit"
                      description="Alignment with company values"
                    />
                  )}
                />
                <Separator />
                
                <FormField
                  control={form.control}
                  name="leadershipRating"
                  render={({ field }) => (
                    <StarRating
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Leadership Potential"
                      description="Ability to lead and mentor"
                    />
                  )}
                />
              </div>
              
              {/* Average Rating Display */}
              {avgRating > 0 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span className="text-muted-foreground">Average:</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                    <span className="font-medium">{avgRating.toFixed(1)}/5</span>
                  </div>
                </div>
              )}
            </div>

            {/* Overall Rating */}
            <FormField
              control={form.control}
              name="overallRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating *</FormLabel>
                  <div className="border rounded-lg p-4">
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Your overall assessment of the candidate"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Strengths */}
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
                      placeholder="e.g., Strong React and TypeScript knowledge, excellent system design skills..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Areas for Improvement */}
            <FormField
              control={form.control}
              name="weaknesses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-red-500">-</span> Areas for Improvement
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Could improve on database optimization, limited experience with microservices..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Detailed Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide any additional notes or observations about the candidate..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Final Recommendation */}
            <FormField
              control={form.control}
              name="recommendation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Recommendation *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 gap-2"
                    >
                      {recommendationOptions.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all',
                            field.value === option.value
                              ? option.color
                              : 'border-muted hover:border-muted-foreground/50'
                          )}
                        >
                          <RadioGroupItem value={option.value} className="sr-only" />
                          {option.icon}
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {option.value === 'STRONG_HIRE' && '- Definitely should hire'}
                            {option.value === 'HIRE' && '- Good candidate, recommend hiring'}
                            {option.value === 'MAYBE' && '- Need more information/another round'}
                            {option.value === 'NO_HIRE' && '- Does not meet requirements'}
                            {option.value === 'STRONG_NO_HIRE' && '- Definitely should not hire'}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={form.handleSubmit((data) => onSubmit(data, true))}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Feedback
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
