import { 
  LandingNavbar, 
  HeroSection, 
  FeaturesSection, 
  AIFeaturesSection, 
  PricingSection,
  TestimonialsSection,
  CTASection,
  FAQSection,
  Footer 
} from '@/components/landing';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <AIFeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </div>
  );
}
