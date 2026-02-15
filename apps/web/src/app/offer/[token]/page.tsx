'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Briefcase,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Loader2,
  FileText,
  PenTool,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface OfferDetails {
  candidateName: string;
  candidateEmail: string;
  designation: string;
  department: string;
  salary: number;
  currency: string;
  joiningDate: string;
  expiresAt: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  primaryColor?: string;
}

type PageState = 'loading' | 'offer' | 'accepted' | 'rejected' | 'expired' | 'error' | 'already-responded';

export default function OfferResponsePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [terms, setTerms] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previousResponse, setPreviousResponse] = useState<'ACCEPTED' | 'REJECTED' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  // Fetch offer details on mount
  useEffect(() => {
    async function fetchOffer() {
      try {
        const response = await fetch(`/api/v1/public/offer/${token}`);
        const data = await response.json();

        if (!data.success) {
          if (data.expired) {
            setPageState('expired');
          } else if (data.alreadyResponded) {
            setPreviousResponse(data.response);
            setPageState('already-responded');
          } else {
            setErrorMessage(data.error || 'Failed to load offer');
            setPageState('error');
          }
          return;
        }

        setOffer(data.data);
        setPageState('offer');

        // Fetch terms
        const termsResponse = await fetch(`/api/v1/public/offer/${token}/terms`);
        const termsData = await termsResponse.json();
        if (termsData.success) {
          setTerms(termsData.data.terms);
        }
      } catch (error) {
        console.error('Error fetching offer:', error);
        setErrorMessage('Failed to connect to server');
        setPageState('error');
      }
    }

    if (token) {
      fetchOffer();
    }
  }, [token]);

  // Canvas signature setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;

    // Style
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [pageState]);

  // Terms scroll detection
  useEffect(() => {
    const termsContainer = termsRef.current;
    if (!termsContainer || !terms) return;

    // Reset hasReadTerms when terms change
    setHasReadTerms(false);

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = termsContainer;
      
      // If content doesn't need scrolling (fits in container), still require a small delay
      // to ensure user has time to read
      const needsScroll = scrollHeight > clientHeight + 5;
      
      if (!needsScroll) {
        // If no scroll needed, wait a moment then enable
        // This gives user time to at least glance at terms
        setTimeout(() => setHasReadTerms(true), 2000);
        return;
      }
      
      // Check if scrolled to bottom (with small threshold)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
      if (isAtBottom && scrollTop > 0) {
        setHasReadTerms(true);
      }
    };

    // Small delay to ensure DOM is rendered with proper dimensions
    const initTimer = setTimeout(checkScrollPosition, 100);

    termsContainer.addEventListener('scroll', checkScrollPosition);
    return () => {
      clearTimeout(initTimer);
      termsContainer.removeEventListener('scroll', checkScrollPosition);
    };
  }, [terms, pageState]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
    setHasSignature(false);
  };

  const handleAccept = async () => {
    if (!termsAccepted) {
      setErrorMessage('Please accept the terms and conditions');
      return;
    }
    if (!hasSignature) {
      setErrorMessage('Please provide your signature');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/v1/public/offer/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'ACCEPTED',
          signature,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPageState('accepted');
      } else {
        setErrorMessage(data.error || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      setErrorMessage('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to decline this offer? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/v1/public/offer/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'REJECTED',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPageState('rejected');
      } else {
        setErrorMessage(data.error || 'Failed to decline offer');
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
      setErrorMessage('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading offer details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Offer</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offer Expired</h2>
            <p className="text-muted-foreground">
              This job offer has expired. Please contact the HR team for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already responded state
  if (pageState === 'already-responded') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {previousResponse === 'ACCEPTED' ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Offer Already Accepted</h2>
                <p className="text-muted-foreground">
                  You have already accepted this offer. Our HR team will contact you with onboarding details.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Offer Already Declined</h2>
                <p className="text-muted-foreground">
                  You have previously declined this offer. Please contact HR if you have any questions.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted confirmation
  if (pageState === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Congratulations!</h2>
            <p className="text-lg text-green-700 mb-4">You have successfully accepted the offer</p>
            <Separator className="my-6" />
            <div className="text-left space-y-2 text-muted-foreground">
              <p>✓ Your acceptance has been recorded</p>
              <p>✓ Your signed offer letter has been saved</p>
              <p>✓ HR will contact you with onboarding details</p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              We look forward to welcoming you to the team!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected confirmation
  if (pageState === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offer Declined</h2>
            <p className="text-muted-foreground">
              We respect your decision. We wish you all the best in your career endeavors.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main offer view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Company Header with Logo */}
        <div className="text-center mb-8">
          {offer?.companyLogo ? (
            <div className="mb-4 flex justify-center">
              <img 
                src={offer.companyLogo} 
                alt={offer.companyName}
                className="max-h-20 max-w-[250px] object-contain"
              />
            </div>
          ) : (
            <h2 className="text-2xl font-bold mb-2" style={{ color: offer?.primaryColor || '#667eea' }}>
              {offer?.companyName}
            </h2>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Offer</h1>
          <p className="text-muted-foreground">
            Please review the offer details and respond below
          </p>
        </div>

        {/* Offer Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{offer?.designation}</CardTitle>
                <CardDescription className="text-lg mt-1">
                  {offer?.companyName}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-base px-3 py-1">
                Pending Response
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-semibold">{offer?.designation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-semibold">{offer?.department}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Salary</p>
                    <p className="font-semibold text-lg">
                      {offer?.currency} {offer?.salary?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-semibold">
                      {offer?.joiningDate ? format(new Date(offer.joiningDate), 'MMMM d, yyyy') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Offer Expires</p>
                <p className="text-sm text-amber-700">
                  {offer?.expiresAt ? format(new Date(offer.expiresAt), 'MMMM d, yyyy \'at\' h:mm a') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </CardTitle>
            <CardDescription>Please read carefully before accepting</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={termsRef}
              className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap border-2 border-slate-200"
            >
              {terms || 'Loading terms and conditions...'}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                disabled={!hasReadTerms}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <label 
                htmlFor="terms" 
                className={`text-sm ${hasReadTerms ? 'cursor-pointer' : 'cursor-not-allowed text-muted-foreground'}`}
              >
                I have read and agree to the terms and conditions
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Digital Signature
            </CardTitle>
            <CardDescription>
              Please sign below to accept the offer (required for acceptance only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair touch-none"
                style={{ height: '150px' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                Clear Signature
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <XCircle className="h-5 w-5 mr-2" />}
            Decline Offer
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleAccept}
            disabled={isSubmitting || !termsAccepted || !hasSignature}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
            Accept Offer
          </Button>
        </div>

        {/* Footer with Company Branding */}
        <div className="text-center mt-8 pt-6 border-t">
          {offer?.companyLogo && (
            <div className="mb-3 flex justify-center opacity-70">
              <img 
                src={offer.companyLogo} 
                alt={offer.companyName}
                className="max-h-10 max-w-[150px] object-contain grayscale"
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            If you have any questions about this offer, please contact HR at{' '}
            <span className="text-primary font-medium">{offer?.companyName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This offer letter is system generated and is valid without signature.
          </p>
        </div>
      </div>
    </div>
  );
}
