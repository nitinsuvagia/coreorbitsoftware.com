'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            
            <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Critical Error
            </h2>
            <p className="text-gray-500 mb-8">
              A critical error has occurred. Please refresh the page or return to the homepage.
            </p>
            
            {error.digest && (
              <p className="text-xs text-gray-400 mb-6 font-mono">
                Error ID: {error.digest}
              </p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
