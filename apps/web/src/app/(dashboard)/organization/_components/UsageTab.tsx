'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Briefcase,
  CreditCard,
} from 'lucide-react';
import type { Organization, Department, Designation } from '../types';

interface UsageTabProps {
  org: Organization;
  departments: Department[];
  designations: Designation[];
}

export function UsageTab({
  org,
  departments,
  designations,
}: UsageTabProps) {
  const totalEmployees = departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Employees</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{totalEmployees}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {departments.length} departments
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Designations</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{designations.length}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Job titles configured
                </p>
              </div>
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{org.plan?.name || 'Free Plan'}</h3>
                <Badge className="bg-green-500">Current</Badge>
              </div>
              <p className="text-muted-foreground">
                {org.status === 'TRIAL' && org.trialEndsAt
                  ? `Trial ends on ${new Date(org.trialEndsAt).toLocaleDateString()}`
                  : org.activatedAt 
                    ? `Active since ${new Date(org.activatedAt).toLocaleDateString()}`
                    : 'Getting started'
                }
              </p>
            </div>
            <Button variant="outline">Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom spacing to prevent content touching screen bottom */}
      <div className="h-4" />
    </div>
  );
}
