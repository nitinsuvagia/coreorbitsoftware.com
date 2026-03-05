'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  MapPin,
  Phone,
  GraduationCap,
  Landmark,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Building2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

// Import step components
import PersonalInfoStep from './steps/PersonalInfoStep';
import AddressStep from './steps/AddressStep';
import EmergencyContactStep from './steps/EmergencyContactStep';
import EducationStep from './steps/EducationStep';
import BankDetailsStep from './steps/BankDetailsStep';
import DocumentsStep from './steps/DocumentsStep';
import DeclarationStep from './steps/DeclarationStep';

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
  address?: any;
  emergencyContact?: any;
  education?: any[];
  bankDetails?: any;
  personal?: any;
  documents?: any;
  status: string;
}

interface OnboardingFormProps {
  token: string;
  onboardingInfo: OnboardingInfo;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User, description: 'Basic personal details' },
  { id: 2, title: 'Address', icon: MapPin, description: 'Current & permanent address' },
  { id: 3, title: 'Emergency Contact', icon: Phone, description: 'Emergency contact person' },
  { id: 4, title: 'Education', icon: GraduationCap, description: 'Educational background' },
  { id: 5, title: 'Bank Details', icon: Landmark, description: 'Salary account info' },
  { id: 6, title: 'Documents', icon: FileText, description: 'Upload required documents' },
  { id: 7, title: 'Declaration', icon: CheckCircle, description: 'Review & submit' },
];

export interface FormData {
  personal: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    bloodGroup: string;
    maritalStatus: string;
    fatherName: string;
    motherName: string;
    spouseName?: string;
    panNumber?: string;
    aadharNumber?: string;
    passportNumber?: string;
    passportExpiry?: string;
  };
  address: {
    current: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    permanent: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    sameAsCurrent: boolean;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
  };
  education: Array<{
    id: string;
    educationType: string;
    institutionType?: string;
    institutionName: string;
    boardUniversity?: string;
    degree?: string;
    fieldOfStudy?: string;
    specialization?: string;
    enrollmentYear: number;
    completionYear?: number;
    isOngoing?: boolean;
    gradeType?: string;
    grade?: string;
    percentage?: number;
  }>;
  bankDetails: {
    accountNumber: string;
    confirmAccountNumber: string;
    bankName: string;
    ifscCode: string;
    branchName: string;
    accountHolderName: string;
    accountType: string;
  };
  documents: {
    photo?: { url: string; name: string };
    idProof?: { url: string; name: string; type?: string };
    panCard?: { url: string; name: string };
    addressProof?: { url: string; name: string; type?: string };
    educationCertificates?: Array<{ url: string; name: string }>;
    experienceLetters?: Array<{ url: string; name: string }>;
    relievingLetter?: { url: string; name: string };
    salarySlips?: Array<{ url: string; name: string }>;
    bankProof?: { url: string; name: string };
    otherDocuments?: Array<{ url: string; name: string }>;
  };
  declaration: {
    backgroundCheckConsent: boolean;
    dataPrivacyConsent: boolean;
    employmentTermsAccepted: boolean;
    informationAccurate: boolean;
    signature: string;
  };
}

export default function OnboardingForm({ token, onboardingInfo, onComplete }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Initialize form data with any pre-filled data
  const [formData, setFormData] = useState<FormData>(() => {
    const nameParts = onboardingInfo.candidateName.split(' ');
    return {
      personal: {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        dateOfBirth: onboardingInfo.personal?.dateOfBirth || '',
        gender: onboardingInfo.personal?.gender || '',
        nationality: onboardingInfo.personal?.nationality || 'American',
        bloodGroup: onboardingInfo.personal?.bloodGroup || '',
        maritalStatus: onboardingInfo.personal?.maritalStatus || '',
        fatherName: onboardingInfo.personal?.fatherName || '',
        motherName: onboardingInfo.personal?.motherName || '',
        spouseName: onboardingInfo.personal?.spouseName || '',
        panNumber: onboardingInfo.personal?.panNumber || '',
        aadharNumber: onboardingInfo.personal?.aadharNumber || '',
        passportNumber: onboardingInfo.personal?.passportNumber || '',
        passportExpiry: onboardingInfo.personal?.passportExpiry || '',
      },
      address: {
        current: onboardingInfo.address?.current || {
          street: onboardingInfo.address?.street || '',
          city: onboardingInfo.address?.city || '',
          state: onboardingInfo.address?.state || '',
          postalCode: onboardingInfo.address?.postalCode || '',
          country: onboardingInfo.address?.country || 'United States',
        },
        permanent: onboardingInfo.address?.permanent || {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'United States',
        },
        sameAsCurrent: onboardingInfo.address?.sameAsCurrent ?? true,
      },
      emergencyContact: onboardingInfo.emergencyContact || {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
      },
      education: onboardingInfo.education || [],
      bankDetails: onboardingInfo.bankDetails || {
        accountNumber: '',
        confirmAccountNumber: '',
        bankName: '',
        ifscCode: '',
        branchName: '',
        accountHolderName: '',
        accountType: 'savings',
      },
      documents: onboardingInfo.documents || {},
      declaration: {
        backgroundCheckConsent: false,
        dataPrivacyConsent: false,
        employmentTermsAccepted: false,
        informationAccurate: false,
        signature: '',
      },
    };
  });

  const primaryColor = onboardingInfo.primaryColor || '#667eea';
  const progress = (currentStep / STEPS.length) * 100;

  const updateFormData = <K extends keyof FormData>(section: K, data: FormData[K]) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/public/onboarding/${token}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep,
          data: formData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Progress saved successfully');
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps([...completedSteps, currentStep]);
        }
      } else {
        const errorMsg = typeof result.error === 'object' 
          ? result.error?.message || 'Failed to save progress' 
          : result.error || 'Failed to save progress';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Save current step before moving next
    await handleSaveProgress();
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/public/onboarding/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Onboarding completed successfully!');
        onComplete();
      } else {
        const errorMsg = typeof result.error === 'object' 
          ? result.error?.message || 'Failed to complete onboarding' 
          : result.error || 'Failed to complete onboarding';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={formData.personal}
            onChange={(data: FormData['personal']) => updateFormData('personal', data)}
          />
        );
      case 2:
        return (
          <AddressStep
            data={formData.address}
            onChange={(data: FormData['address']) => updateFormData('address', data)}
          />
        );
      case 3:
        return (
          <EmergencyContactStep
            data={formData.emergencyContact}
            onChange={(data: FormData['emergencyContact']) => updateFormData('emergencyContact', data)}
          />
        );
      case 4:
        return (
          <EducationStep
            data={formData.education}
            onChange={(data: FormData['education']) => updateFormData('education', data)}
          />
        );
      case 5:
        return (
          <BankDetailsStep
            data={formData.bankDetails}
            onChange={(data: FormData['bankDetails']) => updateFormData('bankDetails', data)}
          />
        );
      case 6:
        return (
          <DocumentsStep
            data={formData.documents}
            onChange={(data: FormData['documents']) => updateFormData('documents', data)}
            token={token}
          />
        );
      case 7:
        return (
          <DeclarationStep
            data={formData.declaration}
            formData={formData}
            onChange={(data: FormData['declaration']) => updateFormData('declaration', data)}
            companyName={onboardingInfo.companyName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}20 100%)` }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onboardingInfo.companyLogo ? (
              <Image
                src={onboardingInfo.companyLogo}
                alt={onboardingInfo.companyName}
                width={100}
                height={50}
                className="object-contain"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{onboardingInfo.companyName}</h1>
              <p className="text-sm text-muted-foreground">Employee Onboarding</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{onboardingInfo.candidateName}</p>
            <p className="text-xs text-muted-foreground">{onboardingInfo.designation}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="relative flex justify-between overflow-visible pt-8 pb-2">
              {/* Connecting line behind the circles */}
              <div className="absolute top-[48px] left-[40px] right-[40px] h-0.5 bg-gray-200 dark:bg-gray-700" style={{ zIndex: 0 }} />
              <div 
                className="absolute top-[48px] left-[40px] h-0.5 transition-all duration-300" 
                style={{ 
                  width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - ${currentStep === 1 ? '0px' : '0px'})`,
                  maxWidth: 'calc(100% - 80px)',
                  backgroundColor: primaryColor,
                  zIndex: 1
                }} 
              />
              
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`relative flex flex-col items-center min-w-[80px] transition-all ${
                      isActive ? 'scale-105' : ''
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all border-2 ${
                        isCompleted
                          ? 'bg-green-500 text-white border-green-500'
                          : isActive
                          ? 'text-white border-transparent shadow-lg'
                          : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}
                      style={isActive && !isCompleted ? { backgroundColor: primaryColor } : {}}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-xs text-center ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })()}
              <div>
                <CardTitle>Step {currentStep}: {STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </>
            )}
          </Button>

          {currentStep === STEPS.length ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.declaration.informationAccurate}
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Onboarding
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              style={{ backgroundColor: primaryColor }}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Need help? Contact HR at {onboardingInfo.companyName}</p>
          <p className="mt-1">Your progress is automatically saved when you navigate between steps.</p>
        </div>
      </div>
    </div>
  );
}
