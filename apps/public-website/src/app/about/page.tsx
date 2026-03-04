'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { 
  Sparkles, 
  Target, 
  Heart, 
  Lightbulb,
  Users,
  Globe,
  Award,
  ArrowRight,
  Building2,
  Zap
} from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'People First',
    description: 'We believe great technology starts with understanding people. Every feature we build puts the human experience at the center.'
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We push boundaries with AI and automation to solve HR challenges in ways that were never possible before.'
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'We hold ourselves to the highest standards. Good enough isn\'t good enough when it comes to managing people.'
  },
  {
    icon: Users,
    title: 'Collaboration',
    description: 'We work together with our customers as partners, building solutions that truly meet their needs.'
  }
];

const stats = [
  { number: '10,000+', label: 'Active Users' },
  { number: '500+', label: 'Companies' }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Building2 className="w-4 h-4" />
              About Us
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Transforming How the World{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Manages People
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              CoreOrbit was founded with a simple mission: make HR technology that people actually love to use. 
              We combine cutting-edge AI with human-centered design to create the future of work.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                  Our Story
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  In 2019, our founders experienced the frustration of HR software firsthand. Clunky interfaces, 
                  disconnected systems, and hours spent on administrative tasks that should have been automated.
                </p>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  They knew there had to be a better way. Armed with expertise in AI, enterprise software, and 
                  human resources, they set out to build the HR platform they always wished existed.
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Today, CoreOrbit serves thousands of companies worldwide, helping them hire faster, onboard 
                  smarter, and manage their teams more effectively than ever before.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <Sparkles className="w-12 h-12 mb-6 text-yellow-300" />
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-white/90 text-lg">
                  To empower every organization to build exceptional teams through AI-powered HR technology 
                  that&apos;s intuitive, powerful, and delightful to use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              These principles guide everything we do, from product decisions to how we treat our team and customers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-slate-800 rounded-xl p-6 hover:bg-slate-700/50 transition-colors">
                <value.icon className="w-10 h-10 text-blue-400 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-slate-400 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Globe className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Global Presence
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Headquartered in Dallas with offices across the globe. 
              Serving customers worldwide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Dallas', 'North Carolina', 'London', 'France', 'Singapore', 'Sydney'].map((city, index) => (
                <span key={index} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                  📍 {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Zap className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join the CoreOrbit Journey</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Whether you&apos;re looking to transform your HR or join our team, we&apos;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90">
                  Schedule a Demo
                </Button>
              </Link>
              <Link href="/careers">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  View Careers
                  <ArrowRight className="ml-2 w-4 h-4" />
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
