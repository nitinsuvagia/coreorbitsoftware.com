'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Building2,
  Users,
  Mail,
  Phone,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

// Generate random math captcha
const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const answer = operator === '+' ? num1 + num2 : num1 - num2;
  return { question: `${num1} ${operator} ${num2}`, answer };
};

export default function ScheduleDemoPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    companySize: '',
    jobTitle: '',
    message: '',
    captchaAnswer: '',
  });
  const [captcha, setCaptcha] = useState({ question: '', answer: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setFormData(prev => ({ ...prev, captchaAnswer: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha
    if (parseInt(formData.captchaAnswer) !== captcha.answer) {
      toast.error('Incorrect captcha answer. Please try again.');
      refreshCaptcha();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'demo',
          ...formData,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Demo request submitted successfully!');
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <LandingNavbar />
        <div className="flex items-center justify-center p-4 pt-32 pb-20 min-h-[80vh]">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Demo Request Received!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Thank you for your interest in CoreOrbit. Our team will contact you within 24 hours to schedule your personalized demo.
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />

      <div className="container mx-auto px-4 pt-24 pb-12 md:pt-28 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left side - Info */}
          <div className="lg:pr-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Calendar className="w-4 h-4" />
              Schedule a Demo
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              See CoreOrbit{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                in action
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Get a personalized walkthrough of our AI-powered HR platform. 
              See how CoreOrbit can transform your recruitment, onboarding, 
              and employee management processes.
            </p>

            <div className="space-y-4 mb-8">
              {[
                'AI-powered job creation & resume screening',
                'Complete recruitment pipeline management',
                'Digital onboarding workflows',
                '360° dashboards & analytics',
                'Attendance & leave management',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            {/* Decorative illustration */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">30-minute Demo</h3>
                    <p className="text-sm text-slate-500">Tailored to your needs</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Our product specialists will show you exactly how CoreOrbit 
                  can solve your HR challenges.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Request Your Demo
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300">
                    First Name *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder="John"
                      className="pl-10"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300">
                    Last Name *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Doe"
                      className="pl-10"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Work Email *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@company.com"
                    className="pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <Label htmlFor="company" className="text-slate-700 dark:text-slate-300">
                  Company Name *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    placeholder="Innovatelab Inc"
                    className="pl-10"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companySize" className="text-slate-700 dark:text-slate-300">
                    Company Size *
                  </Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, companySize: value }))}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="jobTitle" className="text-slate-700 dark:text-slate-300">
                    Job Title *
                  </Label>
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    required
                    placeholder="HR Manager"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-slate-700 dark:text-slate-300">
                  What would you like to see in the demo?
                </Label>
                <div className="relative mt-1">
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your HR challenges..."
                    rows={3}
                    className="pl-10 pt-3"
                  />
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Captcha */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                  Security Check *
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                      {captcha.question} = ?
                    </span>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <Input
                    type="number"
                    name="captchaAnswer"
                    value={formData.captchaAnswer}
                    onChange={handleChange}
                    required
                    placeholder="Answer"
                    className="w-24"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule My Demo
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                By submitting this form, you agree to our{' '}
                <Link href="#" className="text-purple-600 hover:underline">Privacy Policy</Link>
                {' '}and{' '}
                <Link href="#" className="text-purple-600 hover:underline">Terms of Service</Link>.
              </p>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
