'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie, X, Settings, Check, ChevronDown, ChevronUp } from 'lucide-react';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  preferences: false,
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Add bottom padding to body so footer isn't hidden behind the banner
  const updateBodyPadding = useCallback(() => {
    if (bannerRef.current) {
      document.body.style.paddingBottom = `${bannerRef.current.offsetHeight}px`;
    }
  }, []);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Small delay to let the banner render before measuring
      const timer = setTimeout(updateBodyPadding, 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.paddingBottom = '';
    }
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [isVisible, showPreferences, updateBodyPadding]);

  const saveConsent = (prefs: CookiePreferences, type: 'all' | 'partial' | 'reject') => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      preferences: prefs,
      type,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted, 'all');
  };

  const handleRejectAll = () => {
    const rejected: CookiePreferences = {
      necessary: true, // Necessary cookies can't be rejected
      analytics: false,
      marketing: false,
      preferences: false,
    };
    setPreferences(rejected);
    saveConsent(rejected, 'reject');
  };

  const handleSavePreferences = () => {
    saveConsent(preferences, 'partial');
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Can't toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isVisible) return null;

  return (
    <div ref={bannerRef} className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500 p-4">
      <div className="bg-slate-950 border border-slate-800 shadow-2xl rounded-2xl">
        <div className="container mx-auto px-4 py-4">
          {/* Main Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Icon and Text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Cookie className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm mb-1">
                  We value your privacy
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  You can choose to accept all cookies, customize your preferences, or reject non-essential cookies.{' '}
                  <Link href="/cookie-policy" className="text-orange-400 hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreferences(!showPreferences)}
                className="bg-gradient-to-r from-sky-400 to-blue-800 hover:from-sky-500 hover:to-blue-900 text-white border-0"
              >
                <Settings className="w-4 h-4 mr-1" />
                Preferences
                {showPreferences ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="bg-gradient-to-r from-sky-400 to-blue-800 hover:from-sky-500 hover:to-blue-900 text-white border-0"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept All
              </Button>
            </div>
          </div>

          {/* Preferences Panel */}
          {showPreferences && (
            <div className="mt-4 pt-4 border-t border-slate-800 animate-in slide-in-from-top duration-300">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Necessary Cookies */}
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">Necessary</span>
                    <div className="w-10 h-5 bg-orange-500 rounded-full flex items-center justify-end px-0.5 cursor-not-allowed">
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Essential for the website to function. Cannot be disabled.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">Analytics</span>
                    <button
                      onClick={() => togglePreference('analytics')}
                      className={`w-10 h-5 rounded-full flex items-center transition-colors ${
                        preferences.analytics 
                          ? 'bg-orange-500 justify-end' 
                          : 'bg-slate-600 justify-start'
                      } px-0.5`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow transition-transform" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Help us understand how visitors interact with our website.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">Marketing</span>
                    <button
                      onClick={() => togglePreference('marketing')}
                      className={`w-10 h-5 rounded-full flex items-center transition-colors ${
                        preferences.marketing 
                          ? 'bg-orange-500 justify-end' 
                          : 'bg-slate-600 justify-start'
                      } px-0.5`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow transition-transform" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Used to deliver personalized advertisements.
                  </p>
                </div>

                {/* Preferences Cookies */}
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">Preferences</span>
                    <button
                      onClick={() => togglePreference('preferences')}
                      className={`w-10 h-5 rounded-full flex items-center transition-colors ${
                        preferences.preferences 
                          ? 'bg-orange-500 justify-end' 
                          : 'bg-slate-600 justify-start'
                      } px-0.5`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow transition-transform" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Remember your settings and preferences for a better experience.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSavePreferences}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
