'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { 
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle2,
  Upload,
  Loader2,
  Send,
  RefreshCw
} from 'lucide-react';

// Generate random math captcha
const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const answer = operator === '+' ? num1 + num2 : num1 - num2;
  return { question: `${num1} ${operator} ${num2}`, answer };
};

// Job data - same as careers page
const allJobs = [
  { 
    slug: 'senior-backend-engineer',
    title: 'Senior Backend Engineer', 
    department: 'Engineering',
    location: 'Remote', 
    type: 'Full-time',
    description: 'We are looking for a Senior Backend Engineer to help build and scale our core platform. You will work on designing and implementing APIs, microservices, and database systems that power CoreOrbit.',
    requirements: [
      '5+ years of experience with Node.js, Python, or Go',
      'Strong experience with PostgreSQL or similar databases',
      'Experience with microservices architecture',
      'Familiarity with Docker and Kubernetes',
      'Excellent problem-solving skills',
      'Strong communication skills'
    ],
    responsibilities: [
      'Design and implement scalable backend services',
      'Write clean, maintainable, and well-tested code',
      'Collaborate with frontend engineers and product team',
      'Participate in code reviews and technical discussions',
      'Mentor junior engineers',
      'Contribute to architectural decisions'
    ]
  },
  { 
    slug: 'frontend-engineer-react',
    title: 'Frontend Engineer (React)', 
    department: 'Engineering',
    location: 'San Francisco', 
    type: 'Full-time',
    description: 'Join our frontend team to build beautiful, performant user interfaces. You will work closely with designers and backend engineers to create the best possible experience for our users.',
    requirements: [
      '3+ years of experience with React and TypeScript',
      'Strong understanding of modern CSS and responsive design',
      'Experience with state management (Redux, Zustand, etc.)',
      'Familiarity with testing frameworks',
      'Eye for design and attention to detail'
    ],
    responsibilities: [
      'Build and maintain React components',
      'Implement responsive and accessible UI',
      'Optimize performance and user experience',
      'Write unit and integration tests',
      'Collaborate with designers on new features'
    ]
  },
  { 
    slug: 'ml-engineer',
    title: 'ML Engineer', 
    department: 'Engineering',
    location: 'Remote', 
    type: 'Full-time',
    description: 'Help us build AI-powered features that transform how companies hire and manage their teams. You will work on NLP, recommendation systems, and predictive analytics.',
    requirements: [
      '3+ years of ML/AI experience',
      'Strong Python skills',
      'Experience with NLP and deep learning frameworks',
      'Understanding of MLOps and model deployment',
      'PhD or Masters preferred'
    ],
    responsibilities: [
      'Develop and train ML models for HR applications',
      'Build recommendation systems for candidate matching',
      'Implement NLP for resume parsing and job matching',
      'Deploy models to production',
      'Continuously improve model performance'
    ]
  },
  { 
    slug: 'devops-engineer',
    title: 'DevOps Engineer', 
    department: 'Engineering',
    location: 'Remote', 
    type: 'Full-time',
    description: 'Own our infrastructure and CI/CD pipelines. You will ensure our platform is reliable, secure, and scalable.',
    requirements: [
      '4+ years DevOps experience',
      'Strong AWS or GCP expertise',
      'Experience with Kubernetes and Terraform',
      'Understanding of security best practices',
      'On-call experience'
    ],
    responsibilities: [
      'Manage cloud infrastructure',
      'Build and maintain CI/CD pipelines',
      'Implement monitoring and alerting',
      'Ensure security compliance',
      'Support development team'
    ]
  },
  { 
    slug: 'senior-product-manager',
    title: 'Senior Product Manager', 
    department: 'Product',
    location: 'San Francisco', 
    type: 'Full-time',
    description: 'Lead product strategy and roadmap for key product areas. You will work closely with customers, engineering, and design to build features that solve real problems.',
    requirements: [
      '5+ years product management experience',
      'Experience with B2B SaaS products',
      'Strong analytical and communication skills',
      'Customer-focused mindset',
      'Technical background preferred'
    ],
    responsibilities: [
      'Define product strategy and roadmap',
      'Work with customers to understand needs',
      'Write PRDs and user stories',
      'Prioritize features and manage backlog',
      'Measure and analyze product metrics'
    ]
  },
  { 
    slug: 'product-designer',
    title: 'Product Designer', 
    department: 'Product',
    location: 'Remote', 
    type: 'Full-time',
    description: 'Create intuitive, beautiful designs for our platform. You will own the full design process from research to final implementation.',
    requirements: [
      '4+ years product design experience',
      'Strong Figma skills',
      'Experience with design systems',
      'User research experience',
      'Portfolio demonstrating B2B work'
    ],
    responsibilities: [
      'Design new features end-to-end',
      'Conduct user research and testing',
      'Maintain and evolve design system',
      'Create prototypes and specifications',
      'Collaborate with engineering'
    ]
  },
  { 
    slug: 'account-executive',
    title: 'Account Executive', 
    department: 'Sales & Marketing',
    location: 'New York', 
    type: 'Full-time',
    description: 'Drive new business by building relationships with mid-market and enterprise companies. You will own the full sales cycle from prospecting to close.',
    requirements: [
      '3+ years B2B SaaS sales experience',
      'Track record of exceeding quota',
      'Experience with Salesforce',
      'Strong presentation skills',
      'HR tech experience a plus'
    ],
    responsibilities: [
      'Prospect and qualify new opportunities',
      'Conduct product demos',
      'Negotiate and close deals',
      'Build relationships with key stakeholders',
      'Meet and exceed sales targets'
    ]
  },
  { 
    slug: 'customer-success-manager',
    title: 'Customer Success Manager', 
    department: 'Sales & Marketing',
    location: 'Remote', 
    type: 'Full-time',
    description: 'Ensure our customers are successful with CoreOrbit. You will be the trusted advisor helping them get maximum value from our platform.',
    requirements: [
      '3+ years customer success experience',
      'Experience with B2B SaaS',
      'Strong communication skills',
      'Technical aptitude',
      'Passion for customer service'
    ],
    responsibilities: [
      'Onboard new customers',
      'Conduct regular business reviews',
      'Identify upsell opportunities',
      'Handle escalations',
      'Gather product feedback'
    ]
  },
  { 
    slug: 'content-marketing-manager',
    title: 'Content Marketing Manager', 
    department: 'Sales & Marketing',
    location: 'Remote', 
    type: 'Full-time',
    description: 'Create compelling content that educates and engages our audience. You will own our content strategy across blog, social, and other channels.',
    requirements: [
      '4+ years content marketing experience',
      'Strong writing and editing skills',
      'SEO knowledge',
      'Experience with marketing tools',
      'HR/recruiting knowledge a plus'
    ],
    responsibilities: [
      'Develop content strategy',
      'Write blog posts and whitepapers',
      'Manage content calendar',
      'Optimize for SEO',
      'Track content performance'
    ]
  },
  { 
    slug: 'hr-business-partner',
    title: 'HR Business Partner', 
    department: 'Operations',
    location: 'San Francisco', 
    type: 'Full-time',
    description: 'Support our growing team as an HR business partner. You will help scale our people operations and culture as we grow.',
    requirements: [
      '5+ years HR experience',
      'Experience with high-growth startups',
      'Knowledge of employment law',
      'Strong interpersonal skills',
      'SHRM certification preferred'
    ],
    responsibilities: [
      'Partner with leadership on people strategy',
      'Handle employee relations',
      'Manage performance reviews',
      'Support recruiting efforts',
      'Drive culture initiatives'
    ]
  },
  { 
    slug: 'finance-manager',
    title: 'Finance Manager', 
    department: 'Operations',
    location: 'San Francisco', 
    type: 'Full-time',
    description: 'Own financial planning, reporting, and analysis for CoreOrbit. You will work closely with leadership to drive business decisions.',
    requirements: [
      '5+ years finance experience',
      'CPA or MBA preferred',
      'Experience with SaaS metrics',
      'Advanced Excel skills',
      'Experience with NetSuite or similar'
    ],
    responsibilities: [
      'Own financial planning and budgeting',
      'Prepare monthly financial reports',
      'Track and analyze SaaS metrics',
      'Support fundraising efforts',
      'Manage accounting operations'
    ]
  }
];

export default function JobDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const job = allJobs.find(j => j.slug === slug);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedIn: '',
    message: ''
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captcha, setCaptcha] = useState({ question: '', answer: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer('');
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <LandingNavbar />
        <div className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Position Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">The job position you're looking for doesn't exist or has been filled.</p>
          <Link href="/careers">
            <Button>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Careers
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaAnswer) !== captcha.answer) {
      alert('Incorrect captcha answer. Please try again.');
      refreshCaptcha();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/career-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jobTitle: job.title,
          jobSlug: job.slug,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit application');
      }

      setIsSubmitted(true);
    } catch (error) {
      alert('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <LandingNavbar />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Application Submitted!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Thank you for your interest in the {job.title} position. We've received your application 
              and will review it carefully. If your qualifications match our needs, we'll be in touch soon.
            </p>
            <Link href="/careers">
              <Button>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Careers
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
      
      {/* Header */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/careers" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-purple-600 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to all positions
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                {job.department}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {job.type}
              </span>
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {job.department}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-8">
            {/* Job Details */}
            <div className="lg:col-span-3 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">About the Role</h2>
                <p className="text-slate-600 dark:text-slate-400">{job.description}</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Responsibilities</h2>
                <ul className="space-y-2">
                  {job.responsibilities.map((resp, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Application Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 sticky top-24">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8">Apply Now</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedIn}
                      onChange={(e) => setFormData({...formData, linkedIn: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resume/CV *
                    </label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center hover:border-purple-500 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="cv-upload"
                        required
                      />
                      <label htmlFor="cv-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        {cvFile ? (
                          <p className="text-sm text-purple-600 font-medium">{cvFile.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX (max 5MB)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cover Letter / Message
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us why you're interested in this role..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Captcha */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Security Check *
                    </label>
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
                      <input
                        type="number"
                        required
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        placeholder="Answer"
                        className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
