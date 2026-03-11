'use client';

import { Star, Quote, Users, Building2, Clock, Trophy } from 'lucide-react';

const testimonials = [
  {
    quote: "CoreOrbit's AI job creator has cut our job posting time by 80%. The entire recruitment pipeline from screening to onboarding is now seamless.",
    author: "Sarah Johnson",
    role: "HR Director",
    company: "TechFlow Inc.",
    rating: 5,
    image: "sarah",
  },
  {
    quote: "The digital onboarding process is incredible. New hires complete everything online before day one. Our 360° dashboards give us complete visibility into the team.",
    author: "Michael Chen",
    role: "Operations Manager",
    company: "InnovateLab",
    rating: 5,
    image: "michael",
  },
  {
    quote: "From AI-powered interviews to performance reviews, CoreOrbit handles our entire employee lifecycle. The document library keeps everything organized.",
    author: "Emily Rodriguez",
    role: "CEO",
    company: "StartupHub",
    rating: 5,
    image: "emily",
  },
];

const stats = [
  { value: '7800+', label: 'Active Users', icon: Users, color: 'from-blue-500 to-cyan-500', iconColor: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: '250+', label: 'Companies', icon: Building2, color: 'from-purple-500 to-pink-500', iconColor: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { value: '99.9%', label: 'Uptime', icon: Clock, color: 'from-green-500 to-emerald-500', iconColor: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: '4.9/5', label: 'Ratings', icon: Trophy, color: 'from-yellow-500 to-orange-500', iconColor: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 md:py-32 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Stats */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">Trusted by Growing Teams Worldwide</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">Numbers that reflect our commitment to delivering excellence</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-20">
          {stats.map((stat) => (
            <div 
              key={stat.label} 
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Decorative corner */}
              <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${stat.color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`} />
              
              {/* Icon */}
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              
              {/* Value with animated counter effect */}
              <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                {stat.value}
              </div>
              
              {/* Label */}
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {stat.label}
              </p>
              
              {/* Animated bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700">
                <div 
                  className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-500 group-hover:w-full`}
                  style={{ width: '30%' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-4">
            Customer Love
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Trusted by teams{' '}
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              everywhere
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            See why thousands of companies choose CoreOrbit to streamline their operations.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="relative p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-slate-200 dark:text-slate-700" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed relative z-10">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 p-0.5">
                  <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {/* Realistic human avatar based on index */}
                    <div className="w-full h-full">
                      {index === 0 ? (
                        /* Sarah Johnson - Professional woman with blonde hair */
                        <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
                          <rect width="56" height="56" fill="#F8FAFC" />
                          {/* Hair */}
                          <ellipse cx="28" cy="18" rx="14" ry="12" fill="#D4A574" />
                          <path d="M14 20 Q14 35 20 38 L20 28 Q20 20 28 18 Q36 20 36 28 L36 38 Q42 35 42 20 Q42 10 28 10 Q14 10 14 20" fill="#D4A574" />
                          {/* Face */}
                          <ellipse cx="28" cy="26" rx="11" ry="12" fill="#FDDCBD" />
                          {/* Eyes */}
                          <ellipse cx="24" cy="24" rx="2" ry="1.5" fill="#1E293B" />
                          <ellipse cx="32" cy="24" rx="2" ry="1.5" fill="#1E293B" />
                          <circle cx="24.5" cy="23.5" r="0.5" fill="#FFFFFF" />
                          <circle cx="32.5" cy="23.5" r="0.5" fill="#FFFFFF" />
                          {/* Eyebrows */}
                          <path d="M22 21 Q24 20 26 21" stroke="#8B5A3C" strokeWidth="0.8" fill="none" />
                          <path d="M30 21 Q32 20 34 21" stroke="#8B5A3C" strokeWidth="0.8" fill="none" />
                          {/* Nose */}
                          <path d="M28 25 L28 29 Q27 30 28 30" stroke="#E5C4A8" strokeWidth="1" fill="none" />
                          {/* Smile */}
                          <path d="M24 32 Q28 35 32 32" stroke="#DC7F7F" strokeWidth="1.5" fill="none" />
                          {/* Blouse */}
                          <path d="M16 44 Q16 40 28 38 Q40 40 40 44 L40 56 L16 56 Z" fill="#3B82F6" />
                          <path d="M24 38 L28 42 L32 38" stroke="#F8FAFC" strokeWidth="1" fill="none" />
                        </svg>
                      ) : index === 1 ? (
                        /* Michael Chen - Professional man with dark hair */
                        <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
                          <rect width="56" height="56" fill="#F8FAFC" />
                          {/* Hair */}
                          <ellipse cx="28" cy="15" rx="12" ry="8" fill="#1E293B" />
                          <path d="M16 16 Q16 12 28 10 Q40 12 40 16 L40 20 Q38 18 28 18 Q18 18 16 20 Z" fill="#1E293B" />
                          {/* Face */}
                          <ellipse cx="28" cy="26" rx="11" ry="12" fill="#F5DEB3" />
                          {/* Eyes */}
                          <ellipse cx="24" cy="24" rx="2" ry="1.5" fill="#1E293B" />
                          <ellipse cx="32" cy="24" rx="2" ry="1.5" fill="#1E293B" />
                          <circle cx="24.5" cy="23.5" r="0.5" fill="#FFFFFF" />
                          <circle cx="32.5" cy="23.5" r="0.5" fill="#FFFFFF" />
                          {/* Eyebrows */}
                          <path d="M22 20 L26 20" stroke="#1E293B" strokeWidth="1.2" fill="none" />
                          <path d="M30 20 L34 20" stroke="#1E293B" strokeWidth="1.2" fill="none" />
                          {/* Nose */}
                          <path d="M28 25 L28 29 Q27 30 29 30" stroke="#DEB887" strokeWidth="1" fill="none" />
                          {/* Smile */}
                          <path d="M25 32 Q28 34 31 32" stroke="#B87A7A" strokeWidth="1.2" fill="none" />
                          {/* Shirt collar and suit */}
                          <path d="M16 44 Q16 40 28 38 Q40 40 40 44 L40 56 L16 56 Z" fill="#374151" />
                          <path d="M24 38 L28 44 L32 38" fill="#FFFFFF" />
                          <path d="M28 44 L28 56" stroke="#1E293B" strokeWidth="2" />
                        </svg>
                      ) : (
                        /* Emily Rodriguez - Professional woman with dark wavy hair */
                        <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
                          <rect width="56" height="56" fill="#F8FAFC" />
                          {/* Hair */}
                          <ellipse cx="28" cy="18" rx="15" ry="13" fill="#4A3728" />
                          <path d="M13 22 Q12 35 18 40 L18 30 Q18 22 28 20 Q38 22 38 30 L38 40 Q44 35 43 22 Q43 8 28 8 Q13 8 13 22" fill="#4A3728" />
                          {/* Hair waves */}
                          <path d="M15 30 Q13 35 16 40" stroke="#3D2E20" strokeWidth="2" fill="none" />
                          <path d="M41 30 Q43 35 40 40" stroke="#3D2E20" strokeWidth="2" fill="none" />
                          {/* Face */}
                          <ellipse cx="28" cy="26" rx="10" ry="11" fill="#DEB887" />
                          {/* Eyes */}
                          <ellipse cx="24" cy="24" rx="2.2" ry="1.8" fill="#1E293B" />
                          <ellipse cx="32" cy="24" rx="2.2" ry="1.8" fill="#1E293B" />
                          <circle cx="24.5" cy="23.5" r="0.6" fill="#FFFFFF" />
                          <circle cx="32.5" cy="23.5" r="0.6" fill="#FFFFFF" />
                          {/* Eyebrows */}
                          <path d="M22 21 Q24 19.5 26 21" stroke="#3D2E20" strokeWidth="0.8" fill="none" />
                          <path d="M30 21 Q32 19.5 34 21" stroke="#3D2E20" strokeWidth="0.8" fill="none" />
                          {/* Nose */}
                          <path d="M28 25 L28 28 Q27 29 28 29" stroke="#C9A86C" strokeWidth="1" fill="none" />
                          {/* Smile with lipstick */}
                          <path d="M24 31 Q28 34 32 31" stroke="#E86B6B" strokeWidth="1.8" fill="none" />
                          {/* Earrings */}
                          <circle cx="17" cy="28" r="1.5" fill="#F59E0B" />
                          <circle cx="39" cy="28" r="1.5" fill="#F59E0B" />
                          {/* Blouse */}
                          <path d="M16 44 Q16 40 28 38 Q40 40 40 44 L40 56 L16 56 Z" fill="#EC4899" />
                          <ellipse cx="28" cy="42" rx="4" ry="2" fill="#F472B6" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{testimonial.author}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
