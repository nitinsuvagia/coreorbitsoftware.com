'use client';

import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ComingSoonProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function ComingSoon({ 
  title, 
  description = 'This feature is currently under development and will be available soon.',
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard'
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
        <Construction className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>

      <div className="flex items-center gap-4">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="mt-12 p-4 bg-muted/50 rounded-lg max-w-md">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">💡 Tip:</span> We&apos;re actively working on this feature. 
          Check back soon or contact your administrator for updates.
        </p>
      </div>
    </div>
  );
}
