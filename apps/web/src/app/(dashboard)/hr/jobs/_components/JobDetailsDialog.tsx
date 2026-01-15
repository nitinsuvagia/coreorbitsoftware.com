'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  UserCheck,
  Video,
  Award,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface JobDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    employmentType: string;
    salaryRange: {
      min: number;
      max: number;
      currency: string;
    };
    status: string;
    postedDate: string;
    closingDate: string;
    openings: number;
    experience: {
      min: number;
      max: number;
    };
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    benefits?: string[];
    techStack?: string[];
    statistics?: {
      totalApplied: number;
      shortlisted: number;
      interviewed: number;
      hired: number;
    };
  };
}

export function JobDetailsDialog({ open, onOpenChange, job }: JobDetailsDialogProps) {
  const formatSalary = (range: any, type: string) => {
    if (type === 'internship') {
      return `$${range.min}-${range.max}/hr`;
    }
    return `$${(range.min / 1000).toFixed(0)}K-${(range.max / 1000).toFixed(0)}K`;
  };

  const getConversionRate = (from: number, to: number) => {
    if (from === 0) return 0;
    return ((to / from) * 100).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="space-y-2">
            <DialogTitle className="text-2xl">{job.title}</DialogTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {job.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatSalary(job.salaryRange, job.employmentType)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Statistics Section - Only for Completed/Hired Jobs */}
          {job.statistics && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Recruitment Statistics</h3>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Applied</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <h3 className="text-3xl font-bold">{job.statistics.totalApplied}</h3>
                        </div>
                      </div>
                      <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <h3 className="text-3xl font-bold">{job.statistics.shortlisted}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getConversionRate(job.statistics.totalApplied, job.statistics.shortlisted)}%
                          conversion
                        </p>
                      </div>
                      <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
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
                        <div className="flex items-baseline gap-2 mt-2">
                          <h3 className="text-3xl font-bold">{job.statistics.interviewed}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getConversionRate(job.statistics.shortlisted, job.statistics.interviewed)}%
                          conversion
                        </p>
                      </div>
                      <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
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
                        <div className="flex items-baseline gap-2 mt-2">
                          <h3 className="text-3xl font-bold text-green-600">
                            {job.statistics.hired}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getConversionRate(job.statistics.interviewed, job.statistics.hired)}% offer
                          acceptance
                        </p>
                      </div>
                      <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                        <Award className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Funnel Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Recruitment Funnel</CardTitle>
                  <CardDescription>Candidate progression through hiring stages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Applied</span>
                      <span className="text-muted-foreground">{job.statistics.totalApplied}</span>
                    </div>
                    <Progress value={100} className="h-3" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Shortlisted</span>
                      <span className="text-muted-foreground">
                        {job.statistics.shortlisted} (
                        {getConversionRate(job.statistics.totalApplied, job.statistics.shortlisted)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={
                        (job.statistics.shortlisted / job.statistics.totalApplied) * 100
                      }
                      className="h-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Interviewed</span>
                      <span className="text-muted-foreground">
                        {job.statistics.interviewed} (
                        {getConversionRate(job.statistics.totalApplied, job.statistics.interviewed)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={
                        (job.statistics.interviewed / job.statistics.totalApplied) * 100
                      }
                      className="h-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Hired</span>
                      <span className="text-muted-foreground">
                        {job.statistics.hired} (
                        {getConversionRate(job.statistics.totalApplied, job.statistics.hired)}%)
                      </span>
                    </div>
                    <Progress
                      value={(job.statistics.hired / job.statistics.totalApplied) * 100}
                      className="h-3 bg-green-100"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Job Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Job Details</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Employment Type</p>
                <p className="font-medium capitalize">{job.employmentType.replace('-', ' ')}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Number of Openings</p>
                <p className="font-medium">{job.openings}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Experience Required</p>
                <p className="font-medium">
                  {job.experience.min}-{job.experience.max} years
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                  {job.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Posted Date
                </p>
                <p className="font-medium">{job.postedDate}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Closing Date
                </p>
                <p className="font-medium">{job.closingDate}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {job.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Responsibilities</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {job.responsibilities.map((resp, index) => (
                  <li key={index}>{resp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Technology Stack */}
          {job.techStack && job.techStack.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Technology Stack</h3>
              <div className="flex flex-wrap gap-2">
                {job.techStack.map((tech, index) => (
                  <Badge key={index} variant="default">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Benefits</h3>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map((benefit, index) => (
                  <Badge key={index} variant="secondary">
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
