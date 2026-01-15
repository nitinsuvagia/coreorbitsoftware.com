'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StatCardProps } from '../types';

interface ExtendedStatCardProps extends StatCardProps {
  iconColor?: string;
}

const iconColorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  primary: 'bg-primary/10 text-primary',
};

export function StatCard({ title, value, description, icon, iconColor = 'primary', trend, loading }: ExtendedStatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {trend && (
                <span className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-4 rounded-full ${iconColorClasses[iconColor]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
