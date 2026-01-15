'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  error: string | null;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  if (!error) return null;
  
  return (
    <Card className="border-destructive">
      <CardContent className="flex items-center gap-2 py-4">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-destructive">{error}</span>
      </CardContent>
    </Card>
  );
}
