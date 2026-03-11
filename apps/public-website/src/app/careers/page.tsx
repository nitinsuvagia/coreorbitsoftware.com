'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { 
  Briefcase, 
  Sparkles, 
  ArrowRight,
  Heart,
  Zap,
  Globe,
  Users,
  Coffee,
  Laptop,
  GraduationCap,
  Plane,
  HeartPulse,
  MapPin
} from 'lucide-react';

const benefits = [
  { icon: HeartPulse, title: 'Health & Wellness', description: 'Comprehensive medical, dental, and vision coverage for you and your family' },
  { icon: Laptop, title: 'Remote-First', description: 'Work from anywhere with flexible hours and home office stipend' },
  { icon: Plane, title: 'Unlimited PTO', description: 'Take the time you need to recharge and come back inspired' },
  { icon: GraduationCap, title: 'Learning Budget', description: '$2,000 annual budget for courses, conferences, and books' },
  { icon: Coffee, title: 'Team Retreats', description: 'Quarterly in-person gatherings in exciting locations worldwide' },
  { icon: Heart, title: 'Parental Leave', description: '16 weeks paid leave for all new parents, regardless of gender' }
];

const openings = [
  {
    department: 'Engineering',
    color: 'from-blue-500 to-indigo-500',
    jobs: [
      { slug: 'senior-backend-engineer', title: 'Senior Backend Engineer', location: 'Remote', type: 'Full-time' },
      { slug: 'frontend-engineer-react', title: 'Frontend Engineer (React)', location: 'Dallas', type: 'Full-time' },
      { slug: 'ml-engineer', title: 'ML Engineer', location: 'Remote', type: 'Full-time' },
      { slug: 'devops-engineer', title: 'DevOps Engineer', location: 'Remote', type: 'Full-time' }
    ]
  },
  {
    department: 'Product',
    color: 'from-purple-500 to-pink-500',
    jobs: [
      { slug: 'senior-product-manager', title: 'Senior Product Manager', location: 'Dallas', type: 'Full-time' },
      { slug: 'product-designer', title: 'Product Designer', location: 'Remote', type: 'Full-time' }
    ]
  },
  {
    department: 'Sales & Marketing',
    color: 'from-green-500 to-teal-500',
    jobs: [
      { slug: 'account-executive', title: 'Account Executive', location: 'New York', type: 'Full-time' },
      { slug: 'customer-success-manager', title: 'Customer Success Manager', location: 'Remote', type: 'Full-time' },
      { slug: 'content-marketing-manager', title: 'Content Marketing Manager', location: 'Remote', type: 'Full-time' }
    ]
  },
  {
    department: 'Operations',
    color: 'from-orange-500 to-red-500',
    jobs: [
      { slug: 'hr-business-partner', title: 'HR Business Partner', location: 'Dallas', type: 'Full-time' },
      { slug: 'finance-manager', title: 'Finance Manager', location: 'Dallas', type: 'Full-time' }
    ]
  }
];

const values = [
  { emoji: '🚀', title: 'Move Fast', description: 'We ship often, learn quickly, and iterate constantly' },
  { emoji: '🤝', title: 'Win Together', description: 'Success is a team sport - we celebrate and support each other' },
  { emoji: '💡', title: 'Think Big', description: 'We tackle ambitious problems that make a real difference' },
  { emoji: '🎯', title: 'Own It', description: 'We take ownership and see things through to completion' }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Briefcase className="w-4 h-4" />
              We&apos;re Hiring!
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Build the Future of{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Work With Us
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Join a team of passionate builders, dreamers, and doers who are transforming how companies 
              manage their most valuable asset - their people.
            </p>
            <Link href="#openings">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                View Open Positions
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-12 bg-white/50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-2">{value.emoji}</div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{value.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Why CoreOrbit?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We believe in taking care of our team so they can do their best work.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
              >
                <benefit.icon className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Find your next opportunity and help us shape the future of HR technology.
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-8">
            {openings.map((dept, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${dept.color}`} />
                  <h3 className="text-xl font-semibold">{dept.department}</h3>
                  <span className="text-sm text-slate-500">({dept.jobs.length} openings)</span>
                </div>
                <div className="space-y-3">
                  {dept.jobs.map((job, jobIndex) => (
                    <Link 
                      key={jobIndex}
                      href={`/careers/${job.slug}`}
                      className="block bg-slate-800 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    >
                      <div>
                        <h4 className="font-medium text-white group-hover:text-purple-400 transition-colors">{job.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          <span>{job.type}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Life at CoreOrbit */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Life at CoreOrbit
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                A glimpse into our culture and what makes us unique.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <Users className="w-10 h-10 mb-4" />
                <h3 className="font-semibold text-lg mb-2">200+ Team Members</h3>
                <p className="text-white/80 text-sm">Growing team across 4 continents</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white">
                <Globe className="w-10 h-10 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Fully Remote</h3>
                <p className="text-white/80 text-sm">Work from anywhere that inspires you</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl p-6 text-white">
                <Zap className="w-10 h-10 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Series B Funded</h3>
                <p className="text-white/80 text-sm">$50M raised, backed by top VCs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Don&apos;t See Your Role?</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              We&apos;re always looking for exceptional people. Send us your resume and let&apos;s chat about how you could contribute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                  Get in Touch
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Learn About Us
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
