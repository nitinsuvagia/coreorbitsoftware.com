'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest updates across your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Activity tracking coming soon...
        </p>
      </CardContent>
    </Card>
  );
}
