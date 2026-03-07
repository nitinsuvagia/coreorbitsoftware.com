'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { siteConfig } from '@/lib/site-config';
import { 
  Brain, 
  FileSearch, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Target,
  Clock,
  TrendingUp,
  Zap,
  BarChart3,
  Shield
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Job Description Generator',
    description: 'Create compelling, optimized job descriptions in seconds with our AI engine that understands your industry and role requirements.'
  },
  {
    icon: FileSearch,
    title: 'Smart Resume Screening',
    description: 'Automatically parse and rank candidates based on skills, experience, and cultural fit. Reduce screening time by 80%.'
  },
  {
    icon: Users,
    title: 'Candidate Pipeline Management',
    description: 'Track candidates through every stage with visual pipelines, automated status updates, and team collaboration tools.'
  },
  {
    icon: Target,
    title: 'AI-Powered Matching',
    description: 'Our algorithms match candidates to positions based on 50+ factors including skills, experience, and growth potential.'
  },
  {
    icon: Clock,
    title: 'Automated Interview Scheduling',
    description: 'Let candidates self-schedule interviews based on team availability. Integrated with Google Calendar and Outlook.'
  },
  {
    icon: BarChart3,
    title: 'Recruitment Analytics',
    description: 'Track time-to-hire, source effectiveness, and funnel conversion rates with detailed recruitment dashboards.'
  }
];

const benefits = [
  { metric: '75%', label: 'Faster time-to-hire' },
  { metric: '60%', label: 'Cost reduction' },
  { metric: '3x', label: 'More qualified candidates' },
  { metric: '90%', label: 'Hiring manager satisfaction' }
];

export default function AIRecruitmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              AI-Powered Solution
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Revolutionize Your{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Recruitment
              </span>{' '}
              with AI
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Leverage artificial intelligence to find, screen, and hire the best talent faster than ever. 
              Reduce bias, save time, and make data-driven hiring decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                  Schedule a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href={siteConfig.signupUrl}>
                <Button size="lg" variant="outline">
                  Start Trail
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {benefit.metric}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{benefit.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful AI Recruitment Features
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to streamline your hiring process from job posting to offer acceptance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How AI Recruitment Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A simple, streamlined process powered by cutting-edge AI technology.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create Job', desc: 'AI generates optimized job descriptions based on your requirements' },
              { step: '02', title: 'Attract Talent', desc: 'Post to multiple job boards and receive applications automatically' },
              { step: '03', title: 'AI Screening', desc: 'Our AI ranks and shortlists the best candidates instantly' },
              { step: '04', title: 'Hire Fast', desc: 'Schedule interviews, conduct assessments, and make offers' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-purple-500 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Hiring?</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of companies using CoreOrbit AI to build their dream teams faster and smarter.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                  Schedule a Demo
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
