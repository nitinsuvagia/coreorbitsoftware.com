'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Lock, Mail, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Image from 'next/image';
import OnboardingForm from './_components/OnboardingForm';

interface OnboardingInfo {
  tenantSlug: string;
  companyName: string;
  companyLogo?: string;
  primaryColor?: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  // Pre-filled data from previous saves
  address?: any;
  emergencyContact?: any;
  education?: any[];
  bankDetails?: any;
  personal?: any;
  documents?: any;
  status: string;
}

type PageState = 'loading' | 'login' | 'onboarding' | 'completed' | 'expired' | 'error';

export default function OnboardingPage() {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch onboarding details on mount
  useEffect(() => {
    async function fetchOnboardingInfo() {
      try {
        const response = await fetch(`/api/v1/public/onboarding/${token}`);
        const data = await response.json();

        if (!data.success) {
          if (data.expired) {
            setPageState('expired');
          } else if (data.completed) {
            setPageState('completed');
          } else {
            const errorMsg = typeof data.error === 'object' 
              ? data.error?.message || 'Invalid onboarding link' 
              : data.error || 'Invalid onboarding link';
            setErrorMessage(errorMsg);
            setPageState('error');
          }
          return;
        }

        setOnboardingInfo(data.data);
        setEmail(data.data.candidateEmail);
        
        // Check if already in progress and authenticated (session check)
        const sessionToken = sessionStorage.getItem(`onboarding_${token}`);
        if (sessionToken === 'authenticated') {
          setPageState('onboarding');
        } else {
          setPageState('login');
        }
      } catch (error) {
        console.error('Error fetching onboarding info:', error);
        setErrorMessage('Failed to load onboarding details');
        setPageState('error');
      }
    }

    fetchOnboardingInfo();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');

    try {
      const response = await fetch(`/api/v1/public/onboarding/${token}/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMsg = typeof data.error === 'object' 
          ? data.error?.message || 'Invalid credentials' 
          : data.error || 'Invalid credentials';
        setAuthError(errorMsg);
        return;
      }

      // Store session
      sessionStorage.setItem(`onboarding_${token}`, 'authenticated');
      setOnboardingInfo(data.data);
      setPageState('onboarding');
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleOnboardingComplete = () => {
    setPageState('completed');
    sessionStorage.removeItem(`onboarding_${token}`);
  };

  // Loading State
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading onboarding portal...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
              <p className="text-sm text-muted-foreground mt-4">
                Please contact HR for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired State
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Link Expired</h2>
              <p className="text-muted-foreground">
                This onboarding link has expired. Please contact HR to request a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed State
  if (pageState === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Onboarding Complete!</h2>
              <p className="text-muted-foreground">
                Thank you for completing your onboarding. HR will review your information and contact you shortly.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                We look forward to having you on the team!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = onboardingInfo?.primaryColor || '#667eea';

  // Login State
  if (pageState === 'login') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}30 100%)` }}
      >
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center space-y-4">
            {onboardingInfo?.companyLogo ? (
              <Image
                src={onboardingInfo.companyLogo}
                alt={onboardingInfo.companyName}
                width={120}
                height={60}
                className="mx-auto object-contain"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">Welcome to {onboardingInfo?.companyName}</CardTitle>
              <CardDescription className="mt-2">
                Hi {onboardingInfo?.candidateName}, please login to complete your onboarding
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the password from your email"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Check your email for the temporary password sent by HR
                </p>
              </div>

              {authError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Continue to Onboarding'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Your position: <strong>{onboardingInfo?.designation}</strong></p>
              <p>Department: <strong>{onboardingInfo?.department}</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding Form State
  return (
    <OnboardingForm
      token={token}
      onboardingInfo={onboardingInfo!}
      onComplete={handleOnboardingComplete}
    />
  );
}
