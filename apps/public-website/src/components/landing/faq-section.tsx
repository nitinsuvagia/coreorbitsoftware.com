'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: "How does the AI-powered job creation work?",
    answer: "Our AI analyzes your requirements and generates complete job descriptions in seconds. Simply provide the role title and key requirements, and the AI will create professional job postings with responsibilities, qualifications, and benefits tailored to your company culture."
  },
  {
    question: "Can I customize the digital onboarding process?",
    answer: "Absolutely! You can create custom onboarding workflows with document collection, training assignments, equipment requests, and welcome messages. Each step can be automated with reminders and notifications to ensure a seamless experience for new hires."
  },
  {
    question: "What's included in the 360° dashboards?",
    answer: "The Organization Dashboard provides company-wide analytics including headcount, turnover, and department metrics. The HR Dashboard focuses on recruitment pipelines, leave management, and compliance. The Employee Dashboard gives individuals visibility into their performance, attendance, and goals."
  },
  {
    question: "How secure is employee data on CoreOrbit?",
    answer: "We use enterprise-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Role-based access controls ensure employees only see relevant information. We're SOC 2 Type II compliant and GDPR ready, with regular security audits and automatic backups."
  },
  {
    question: "Can I migrate data from my existing HR system?",
    answer: "Yes! We provide free migration assistance for all Professional and Enterprise plans. Our team can import employee records, documents, leave balances, and historical data from spreadsheets."
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900" />
      
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Everything you need to know about CoreOrbit. Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-2xl border transition-all duration-300 ${
                openIndex === index
                  ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 shadow-lg'
                  : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className={`font-semibold pr-4 transition-colors ${
                  openIndex === index 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {faq.question}
                </span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  openIndex === index 
                    ? 'bg-blue-100 dark:bg-blue-900/50 rotate-180' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  <ChevronDown className={`w-5 h-5 transition-colors ${
                    openIndex === index 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`} />
                </div>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'max-h-96' : 'max-h-0'
              }`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Still have questions?
          </p>
          <a 
            href="#" 
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Contact our support team
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
