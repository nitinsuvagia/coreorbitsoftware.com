'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Briefcase, CalendarDays, UserCircle } from 'lucide-react';
import type { EmployeeInfo, EmployeeLeaveInfo } from '@/lib/api/dashboard';

interface EmployeeInfoCardProps {
  employee?: EmployeeInfo;
  leave?: EmployeeLeaveInfo;
  loading: boolean;
}

function getInitials(firstName?: string, lastName?: string): string {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function EmployeeInfoCard({ employee, leave, loading }: EmployeeInfoCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee?.avatar || undefined} alt={employee?.displayName} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(employee?.firstName, employee?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{employee?.displayName || 'N/A'}</h3>
            {employee?.designation && (
              <p className="text-sm text-muted-foreground">{employee.designation.name}</p>
            )}
            {employee?.employeeCode && (
              <Badge variant="outline" className="mt-1 text-xs">
                {employee.employeeCode}
              </Badge>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          {employee?.department && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium text-foreground">{employee.department.name}</span>
            </div>
          )}
          {employee?.employmentType && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium text-foreground">
                {employee.employmentType.replace('_', ' ')}
              </span>
            </div>
          )}
          {employee?.joinDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 flex-shrink-0" />
              <span>Joined {formatDate(employee.joinDate)}</span>
            </div>
          )}
          {employee?.reportingManager && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-4 w-4 flex-shrink-0" />
              <span>Reports to <span className="font-medium text-foreground">{employee.reportingManager.displayName}</span></span>
            </div>
          )}
        </div>

        {/* Leave Balance Summary */}
        {leave && leave.balances.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Leave Balances</h4>
            <div className="space-y-2">
              {leave.balances.map((balance) => (
                <div key={balance.leaveCode} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{balance.leaveType}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{balance.remaining}</span>
                    <span className="text-muted-foreground">/ {balance.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
