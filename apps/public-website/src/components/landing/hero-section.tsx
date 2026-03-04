'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductDemo } from './product-demo';
import { ArrowRight, Play, Sparkles, Star, Users, Building2 } from 'lucide-react';

// Portal URL for login/register - defaults to localhost:3000 for development
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000';

export function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <Badge 
              variant="secondary" 
              className="mb-6 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 border-0 shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                AI-Powered Office Management
              </span>
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-slate-900 dark:text-white">Manage Your</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Office Smarter
              </span>
              <br />
              <span className="text-slate-900 dark:text-white">with AI</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto lg:mx-0">
              AI-powered recruitment, digital onboarding, employee management, 
              and 360° dashboards — everything you need to run your HR operations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
              <a href={`${PORTAL_URL}/login`}>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all group px-8"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto border-2 hover:bg-slate-50 dark:hover:bg-slate-800 group"
              >
                <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  4.9/5 Rating
                </span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-slate-300 dark:bg-slate-600" />

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">10k+ Users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">500+ Companies</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Product Demo Video */}
          <div className="relative">
            <ProductDemo />
          </div>
        </div>
      </div>

      {/* Trusted by section */}
      <div className="container mx-auto px-4 mt-16 md:mt-24">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Trusted by innovative companies
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {/* TechCorp */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="32" height="32" rx="8" className="fill-blue-500 group-hover:fill-blue-600 transition-colors" />
              <path d="M12 14h16M12 20h12M12 26h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">TechCorp</span>
          </div>

          {/* InnovateLab */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" className="fill-purple-500 group-hover:fill-purple-600 transition-colors" />
              <path d="M20 10v10l7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="20" r="3" fill="white" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">InnovateLab</span>
          </div>

          {/* DataFlow */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" className="fill-cyan-500 group-hover:fill-cyan-600 transition-colors" />
              <path d="M10 16h6M10 22h10M10 28h4M24 16l4 6-4 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">DataFlow</span>
          </div>

          {/* CloudSync */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <path d="M10 26a8 8 0 0116 0H10z" className="fill-indigo-400 group-hover:fill-indigo-500 transition-colors" />
              <path d="M14 22a10 10 0 0118 6H14z" className="fill-indigo-500 group-hover:fill-indigo-600 transition-colors" />
              <path d="M22 18l-4 4m0-4l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">CloudSync</span>
          </div>

          {/* SmartWork */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="6" width="28" height="28" rx="6" className="fill-emerald-500 group-hover:fill-emerald-600 transition-colors" />
              <path d="M14 20l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">SmartWork</span>
          </div>

          {/* DevHub */}
          <div className="group flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 12v16L20 36 4 28V12L20 4z" className="fill-orange-500 group-hover:fill-orange-600 transition-colors" />
              <path d="M14 17l-4 3 4 3M26 17l4 3-4 3M22 14l-4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">DevHub</span>
          </div>
        </div>
      </div>
    </section>
  );
}
