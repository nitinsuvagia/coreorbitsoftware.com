'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { 
  Clock, 
  Calendar, 
  Palmtree, 
  Sparkles, 
  ArrowRight,
  MapPin,
  Smartphone,
  Bell,
  BarChart3,
  Shield,
  Settings
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Time Tracking',
    description: 'Multiple clock-in options including web, mobile app, biometric, and geofenced check-ins for accurate time tracking.'
  },
  {
    icon: Calendar,
    title: 'Leave Management',
    description: 'Configure unlimited leave types with custom approval workflows. Employees can request and track leave in seconds.'
  },
  {
    icon: MapPin,
    title: 'Geofencing',
    description: 'Ensure employees check in from designated locations with GPS-based geofencing and location tracking.'
  },
  {
    icon: Smartphone,
    title: 'Mobile Check-in',
    description: 'Native mobile apps for iOS and Android allow employees to clock in and out from anywhere.'
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Automated reminders for missed punches, pending approvals, and leave balance alerts.'
  },
  {
    icon: BarChart3,
    title: 'Attendance Reports',
    description: 'Detailed reports on attendance patterns, overtime, late arrivals, and leave utilization.'
  }
];

const stats = [
  { metric: '99%', label: 'Attendance accuracy' },
  { metric: '70%', label: 'Less admin work' },
  { metric: '5 min', label: 'Leave approval time' },
  { metric: '100%', label: 'Policy compliance' }
];

const leaveTypes = [
  { name: 'Annual Leave', icon: '🏖️', color: 'from-blue-500 to-cyan-500' },
  { name: 'Sick Leave', icon: '🏥', color: 'from-red-500 to-pink-500' },
  { name: 'Maternity/Paternity', icon: '👶', color: 'from-purple-500 to-violet-500' },
  { name: 'Personal Days', icon: '🏠', color: 'from-orange-500 to-amber-500' },
  { name: 'Bereavement', icon: '🕯️', color: 'from-slate-500 to-gray-500' },
  { name: 'Comp Time', icon: '⏰', color: 'from-green-500 to-emerald-500' }
];

export default function AttendanceLeavesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium mb-6">
              <Clock className="w-4 h-4" />
              Time & Attendance
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Attendance
              </span>{' '}
              & Leave Management
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Track time, manage leave requests, and ensure policy compliance with our comprehensive 
              attendance management system. Works across offices, remote teams, and hybrid setups.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg">
                  Schedule a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Start Free Trial
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
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  {stat.metric}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{stat.label}</div>
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
              Powerful Time & Leave Features
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to track attendance, manage time off, and maintain accurate records.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leave Types Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Flexible Leave Policies</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Configure any type of leave with custom accrual rules, approval workflows, and carryover policies.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {leaveTypes.map((leave, index) => (
              <div key={index} className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors">
                <div className="text-3xl mb-2">{leave.icon}</div>
                <div className="text-sm font-medium">{leave.name}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { title: 'Custom Accruals', desc: 'Set up accrual rates based on tenure, department, or location' },
              { title: 'Approval Workflows', desc: 'Multi-level approval chains with escalation rules' },
              { title: 'Holiday Calendar', desc: 'Manage public holidays by region with automatic adjustments' }
            ].map((item, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-6">
                <Settings className="w-8 h-8 text-orange-400 mb-3" />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Never Miss a Punch Again</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Automate attendance tracking and leave management for your entire organization.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90">
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
