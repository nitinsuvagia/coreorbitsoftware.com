'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth/auth-context';
import { usePerformanceReviews, usePerformanceReviewStats, useDeletePerformanceReview, useAcknowledgeReview } from '@/hooks/use-performance-reviews';
import { SelectEmployeeReviewDialog } from '@/components/hr/SelectEmployeeReviewDialog';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Plus,
  Search,
  Star,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Trash2,
  Eye,
  CheckCheck,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import type { PerformanceReview } from '@/lib/api/performance-reviews';

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ icon: Icon, label, value, description, color }: {
  icon: any; label: string; value: string | number; description?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REVIEW DETAIL DIALOG
// ============================================================================

function ReviewDetailDialog({ review, open, onOpenChange }: {
  review: PerformanceReview | null; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  if (!review) return null;
  
  const ratingCategories = [
    { label: 'Communication', value: review.communicationRating },
    { label: 'Technical Skills', value: review.technicalSkillsRating },
    { label: 'Teamwork', value: review.teamworkRating },
    { label: 'Problem Solving', value: review.problemSolvingRating },
    { label: 'Punctuality', value: review.punctualityRating },
    { label: 'Initiative', value: review.initiativeRating },
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Performance Review Details
            </AlertDialogTitle>
            <AlertDialogDescription>
              {review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : 'Employee'} — {review.reviewPeriod} ({review.reviewType})
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Status & Overall */}
            <div className="flex items-center justify-between">
              <Badge variant={review.status === 'submitted' ? 'default' : review.status === 'acknowledged' ? 'secondary' : 'outline'}>
                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
              </Badge>
              {review.overallRating && (
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl font-bold">{review.overallRating}/10</span>
                </div>
              )}
            </div>

            {/* Category Ratings */}
            <div>
              <h4 className="font-medium mb-3">Category Ratings</h4>
              <div className="grid grid-cols-2 gap-3">
                {ratingCategories.map(cat => (
                  <div key={cat.label} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm">{cat.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm">{cat.value || '-'}</span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4 border-t mt-4">
          {/* Text Feedback */}
          {review.strengths && (
            <div>
              <h4 className="font-medium mb-1 text-green-600">Strengths</h4>
              <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg whitespace-pre-wrap">{review.strengths}</p>
            </div>
          )}
          {review.areasForImprovement && (
            <div>
              <h4 className="font-medium mb-1 text-orange-600">Areas for Improvement</h4>
              <p className="text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg whitespace-pre-wrap">{review.areasForImprovement}</p>
            </div>
          )}
          {review.goalsNextPeriod && (
            <div>
              <h4 className="font-medium mb-1 text-blue-600">Goals for Next Period</h4>
              <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg whitespace-pre-wrap">{review.goalsNextPeriod}</p>
            </div>
          )}
          {review.additionalComments && (
            <div>
              <h4 className="font-medium mb-1">Additional Comments</h4>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">{review.additionalComments}</p>
            </div>
          )}

          {/* Meta */}
          <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
            {review.reviewer && <p>Reviewed by: {review.reviewer.firstName} {review.reviewer.lastName}</p>}
            {review.submittedAt && <p>Submitted: {new Date(review.submittedAt).toLocaleDateString()}</p>}
            {review.acknowledgedAt && <p>Acknowledged: {new Date(review.acknowledgedAt).toLocaleDateString()}</p>}
            <p>Created: {new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Fixed Footer */}
        <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PerformanceReviewsPage() {
  const { can, canAny } = usePermissions();
  const { user } = useAuth();

  // Permission flags
  const canWrite = can('performance:write');           // Admin, HR — can write reviews
  const canReadAll = canAny('performance:read', 'performance:manage'); // Admin, HR, Team Lead — see all reviews
  const isSelfOnly = !canReadAll;                      // Employee, PM — only own reviews

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // For self-only users: fetch own employee ID to filter reviews
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    if (isSelfOnly) {
      apiClient.get('/api/v1/dashboard/my-stats').then((res: any) => {
        const emp = res.data?.employee;
        if (emp) setMyEmployeeId(emp.id);
      }).catch(() => {});
    }
  }, [isSelfOnly]);

  const params: any = { page, limit: 20 };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (typeFilter !== 'all') params.reviewType = typeFilter;
  // Self-only users see only their own reviews
  if (isSelfOnly && myEmployeeId) params.employeeId = myEmployeeId;

  const { data: reviewsData, isLoading } = usePerformanceReviews(params, { enabled: canReadAll || !!myEmployeeId });
  const { data: stats } = usePerformanceReviewStats(canReadAll);
  const deleteMutation = useDeletePerformanceReview();
  const acknowledgeMutation = useAcknowledgeReview();

  const reviews: PerformanceReview[] = Array.isArray(reviewsData?.data) ? reviewsData.data : [];
  const pagination = reviewsData?.pagination;

  // Filter by search query (client-side on employee name)
  const filteredReviews = searchQuery
    ? reviews.filter(r => {
        const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || r.reviewPeriod.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : reviews;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'submitted': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><FileText className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'acknowledged': return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Acknowledged</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      monthly: 'bg-blue-50 text-blue-700',
      quarterly: 'bg-purple-50 text-purple-700',
      annual: 'bg-amber-50 text-amber-700',
      '360': 'bg-green-50 text-green-700',
      probation: 'bg-orange-50 text-orange-700',
    };
    return <Badge className={config[type] || ''}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground';
    if (rating >= 8) return 'text-green-600 font-bold';
    if (rating >= 6) return 'text-blue-600 font-semibold';
    if (rating >= 4) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Performance Reviews
          </h2>
          <p className="text-muted-foreground mt-1">
            {canReadAll ? 'Manage and track employee performance reviews' : 'View your performance reviews'}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowWriteReview(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Write Review
          </Button>
        )}
      </div>

      {/* Stats Cards (readers/writers only — org-wide metrics) */}
      {canReadAll && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Total Reviews"
            value={stats.totalReviews}
            description={`${stats.employeesReviewed} employees reviewed`}
            color="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            icon={Star}
            label="Avg Overall Rating"
            value={stats.avgOverallRating ? `${stats.avgOverallRating}/10` : 'N/A'}
            description={`By ${stats.uniqueReviewers} reviewers`}
            color="bg-yellow-500/10 text-yellow-600"
          />
          <StatCard
            icon={Clock}
            label="Drafts"
            value={stats.reviewsDraft}
            description="Pending completion"
            color="bg-orange-500/10 text-orange-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Submitted"
            value={stats.reviewsSubmitted}
            description={`${stats.reviewsAcknowledged} acknowledged`}
            color="bg-green-500/10 text-green-600"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or period..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="360">360°</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <BarChart3 className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No reviews found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to find what you\'re looking for.'
                  : isSelfOnly ? 'No reviews have been written for you yet.' : 'Start by writing a performance review for an employee.'}
              </p>
              {canWrite && !searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                <Button size="lg" onClick={() => setShowWriteReview(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Write First Review
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canReadAll && <TableHead>Employee</TableHead>}
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Overall Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedReview(review); setShowDetail(true); }}>
                      {canReadAll && (
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">{review.employee?.employeeCode}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{review.reviewPeriod}</TableCell>
                      <TableCell>{getTypeBadge(review.reviewType)}</TableCell>
                      <TableCell>
                        {review.overallRating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className={getRatingColor(review.overallRating)}>{review.overallRating}/10</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedReview(review); setShowDetail(true); }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            {review.status === 'submitted' && canWrite && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); acknowledgeMutation.mutate(review.id); }}>
                                <CheckCheck className="h-4 w-4 mr-2" />Acknowledge
                              </DropdownMenuItem>
                            )}
                            {review.status === 'draft' && canWrite && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteReviewId(review.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Write Review Dialog (Admin/HR only) */}
      {canWrite && (
        <SelectEmployeeReviewDialog
          open={showWriteReview}
          onOpenChange={setShowWriteReview}
        />
      )}

      {/* Review Detail Dialog */}
      <ReviewDetailDialog
        review={selectedReview}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={(open) => !open && setDeleteReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteReviewId) {
                  deleteMutation.mutate(deleteReviewId);
                  setDeleteReviewId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
