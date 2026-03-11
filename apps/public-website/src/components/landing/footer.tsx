'use client';

import Link from 'next/link';

const footerLinks = {
  solutions: {
    title: 'Solutions',
    links: [
      { name: 'AI Recruitment', href: '/solutions/ai-recruitment' },
      { name: 'Digital Onboarding', href: '/solutions/digital-onboarding' },
      { name: 'Employee Management', href: '/solutions/employee-management' },
      { name: 'Attendance & Leaves', href: '/solutions/attendance-leaves' },
      { name: '360° Dashboards', href: '/solutions/dashboards' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
      { name: 'Schedule Demo', href: '/schedule-demo' },
    ],
  },
};


export function Footer() {
  return (
    <footer id="about" className="bg-slate-950 text-white">
      {/* Main footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-6">
              <img
                src="/logo-horizontal-white.svg"
                alt="CoreOrbit Software"
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-slate-400 mb-6 max-w-sm">
              Transform your HR with AI-powered recruitment, digital onboarding, 
              and complete employee lifecycle management.
            </p>

          </div>

          {/* Links columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© {new Date().getFullYear()} CoreOrbit Software Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
