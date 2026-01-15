'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-8">
          <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Something Went Wrong
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          We apologize for the inconvenience. An unexpected error has occurred. 
          Please try again or contact support if the problem persists.
        </p>
        
        {error.digest && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
