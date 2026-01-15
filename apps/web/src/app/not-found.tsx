'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-8">
          <FileQuestion className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. 
          The page might have been removed, renamed, or doesn&apos;t exist.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
