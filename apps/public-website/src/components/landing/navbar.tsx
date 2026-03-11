'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, Brain, Rocket, Users, Clock, LayoutDashboard, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

const SIGNUP_URL = siteConfig.signupUrl;

const solutions = [
  {
    name: 'AI Recruitment',
    description: 'Find, screen, and hire the best talent faster with AI-powered recruitment tools.',
    href: '/solutions/ai-recruitment',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    name: 'Digital Onboarding',
    description: 'Paperless onboarding that gets new hires productive from day one.',
    href: '/solutions/digital-onboarding',
    icon: Rocket,
    color: 'from-green-500 to-teal-500',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    name: 'Employee Management',
    description: 'Centralize employee data and streamline all HR processes effortlessly.',
    href: '/solutions/employee-management',
    icon: Users,
    color: 'from-blue-500 to-indigo-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    name: 'Attendance & Leaves',
    description: 'Track time, manage leave requests, and ensure policy compliance.',
    href: '/solutions/attendance-leaves',
    icon: Clock,
    color: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    name: '360° Dashboards',
    description: 'Real-time analytics and insights at every level of your organization.',
    href: '/solutions/dashboards',
    icon: LayoutDashboard,
    color: 'from-indigo-500 to-violet-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
];

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isMobileSolutionsOpen, setIsMobileSolutionsOpen] = useState(false);
  const solutionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const solutionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSolutionsEnter = useCallback(() => {
    if (solutionsTimeoutRef.current) {
      clearTimeout(solutionsTimeoutRef.current);
      solutionsTimeoutRef.current = null;
    }
    setIsSolutionsOpen(true);
  }, []);

  const handleSolutionsLeave = useCallback(() => {
    solutionsTimeoutRef.current = setTimeout(() => {
      setIsSolutionsOpen(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (solutionsTimeoutRef.current) {
        clearTimeout(solutionsTimeoutRef.current);
      }
    };
  }, []);

  const navLinkClass = "px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50/80 dark:hover:bg-blue-900/20";

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:shadow-slate-900/40 border-b border-slate-200/60 dark:border-slate-700/60' 
          : 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img
              src="/logo-horizontal.svg"
              alt="CoreOrbit Software"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <Link href="/" className={navLinkClass}>
              Home
            </Link>

            {/* Solutions Mega Menu Trigger */}
            <div 
              ref={solutionsRef}
              className="relative"
              onMouseEnter={handleSolutionsEnter}
              onMouseLeave={handleSolutionsLeave}
            >
              <button 
                className={`${navLinkClass} inline-flex items-center gap-1`}
                onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
              >
                Solutions
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Menu Dropdown */}
              <div 
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-200 ${
                  isSolutionsOpen 
                    ? 'opacity-100 visible translate-y-0' 
                    : 'opacity-0 invisible -translate-y-2'
                }`}
              >
                <div className="w-[720px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                  {/* Header */}
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Our Solutions</p>
                  </div>

                  {/* Solutions Grid */}
                  <div className="px-3 pb-3 grid grid-cols-2 gap-1">
                    {solutions.map((solution) => (
                      <Link
                        key={solution.name}
                        href={solution.href}
                        className="group flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-200"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        <div className={`shrink-0 w-11 h-11 ${solution.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <solution.icon className={`w-5 h-5 ${solution.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {solution.name}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {solution.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Footer CTA */}
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800/50 dark:to-blue-900/10 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Ready to transform your HR?</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">See all solutions in action with a personalized demo.</p>
                      </div>
                      <Link 
                        href="/schedule-demo"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        Book a Demo
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/pricing" className={navLinkClass}>
              Pricing
            </Link>
            <Link href="/about" className={navLinkClass}>
              About Us
            </Link>
            <Link href="/contact" className={navLinkClass}>
              Contact Us
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link href="/schedule-demo">
              <Button variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 font-medium">
                Schedule a Demo
              </Button>
            </Link>
            <a href={SIGNUP_URL}>
              <Button className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all">
                Start Free
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            ) : (
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
            <div className="flex flex-col space-y-1">
              <Link
                href="/"
                className="px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>

              {/* Mobile Solutions Accordion */}
              <div>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                  onClick={() => setIsMobileSolutionsOpen(!isMobileSolutionsOpen)}
                >
                  Solutions
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileSolutionsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileSolutionsOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                    {solutions.map((solution) => (
                      <Link
                        key={solution.name}
                        href={solution.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        onClick={() => { setIsMobileMenuOpen(false); setIsMobileSolutionsOpen(false); }}
                      >
                        <div className={`w-8 h-8 ${solution.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                          <solution.icon className={`w-4 h-4 ${solution.iconColor}`} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{solution.name}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{solution.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/pricing"
                className="px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact Us
              </Link>

              <div className="pt-4 flex flex-col space-y-2 px-4">
                <Link href="/schedule-demo" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-slate-300 font-medium">Schedule a Demo</Button>
                </Link>
                <a href={SIGNUP_URL}>
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold shadow-lg shadow-orange-500/25">
                    Start Free
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
