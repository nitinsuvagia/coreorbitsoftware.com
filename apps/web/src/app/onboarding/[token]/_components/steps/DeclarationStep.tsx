'use client';

import { useRef, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  MapPin,
  Phone,
  GraduationCap,
  Landmark,
  FileText,
  CheckCircle2,
  AlertCircle,
  PenTool,
  Eraser,
} from 'lucide-react';
import type { FormData } from '../OnboardingForm';

interface DeclarationData {
  backgroundCheckConsent: boolean;
  dataPrivacyConsent: boolean;
  employmentTermsAccepted: boolean;
  informationAccurate: boolean;
  signature: string;
}

interface DeclarationStepProps {
  data: DeclarationData;
  formData: FormData;
  onChange: (data: DeclarationData) => void;
  companyName: string;
}

interface SummarySection {
  title: string;
  icon: React.ElementType;
  items: { label: string; value: string | undefined }[];
  isComplete: boolean;
}

export default function DeclarationStep({ data, formData, onChange, companyName }: DeclarationStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!data.signature);

  // Initialize canvas with existing signature if any
  useEffect(() => {
    if (data.signature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = data.signature;
      }
    }
  }, []);

  // Canvas drawing handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSignature(true);
      // Save signature as data URL
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureData = canvas.toDataURL('image/png');
        onChange({ ...data, signature: signatureData });
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onChange({ ...data, signature: '' });
    }
  };

  const handleCheckboxChange = (field: keyof DeclarationData, checked: boolean) => {
    onChange({ ...data, [field]: checked });
  };

  // Create summary sections
  const summarySections: SummarySection[] = [
    {
      title: 'Personal Information',
      icon: User,
      items: [
        { label: 'Name', value: `${formData.personal.firstName} ${formData.personal.lastName}` },
        { label: 'Date of Birth', value: formData.personal.dateOfBirth },
        { label: 'Gender', value: formData.personal.gender },
        { label: 'Blood Group', value: formData.personal.bloodGroup },
        { label: 'Nationality', value: formData.personal.nationality },
        { label: 'PAN Number', value: formData.personal.panNumber },
      ],
      isComplete: !!(formData.personal.firstName && formData.personal.dateOfBirth && formData.personal.gender),
    },
    {
      title: 'Address',
      icon: MapPin,
      items: [
        { label: 'Current Address', value: `${formData.address.current.street}, ${formData.address.current.city}, ${formData.address.current.state}` },
        { label: 'Permanent Address', value: formData.address.sameAsCurrent ? 'Same as current' : `${formData.address.permanent.street}, ${formData.address.permanent.city}` },
      ],
      isComplete: !!(formData.address.current.street && formData.address.current.city),
    },
    {
      title: 'Emergency Contact',
      icon: Phone,
      items: [
        { label: 'Name', value: formData.emergencyContact.name },
        { label: 'Relationship', value: formData.emergencyContact.relationship },
        { label: 'Phone', value: formData.emergencyContact.phone },
      ],
      isComplete: !!(formData.emergencyContact.name && formData.emergencyContact.phone),
    },
    {
      title: 'Education',
      icon: GraduationCap,
      items: formData.education.map((edu, i) => ({
        label: `Qualification ${i + 1}`,
        value: `${edu.degree || edu.educationType} from ${edu.institutionName} (${edu.completionYear || edu.enrollmentYear})`,
      })),
      isComplete: formData.education.length > 0,
    },
    {
      title: 'Bank Details',
      icon: Landmark,
      items: [
        { label: 'Account Holder', value: formData.bankDetails.accountHolderName },
        { label: 'Bank', value: formData.bankDetails.bankName },
        { label: 'Account Number', value: formData.bankDetails.accountNumber ? `xxxx${formData.bankDetails.accountNumber.slice(-4)}` : undefined },
        { label: 'IFSC Code', value: formData.bankDetails.ifscCode },
      ],
      isComplete: !!(formData.bankDetails.accountNumber && formData.bankDetails.ifscCode),
    },
    {
      title: 'Documents',
      icon: FileText,
      items: [
        { label: 'Photo', value: formData.documents.photo ? 'Uploaded' : 'Not uploaded' },
        { label: 'ID Proof', value: formData.documents.idProof ? 'Uploaded' : 'Not uploaded' },
        { label: 'PAN Card', value: formData.documents.panCard ? 'Uploaded' : 'Not uploaded' },
        { label: 'Bank Proof', value: formData.documents.bankProof ? 'Uploaded' : 'Not uploaded' },
      ],
      isComplete: !!(formData.documents.photo && formData.documents.idProof),
    },
  ];

  const allComplete = summarySections.every(s => s.isComplete);
  const allConsentsGiven = data.backgroundCheckConsent && data.dataPrivacyConsent && 
    data.employmentTermsAccepted && data.informationAccurate;
  const canSubmit = allComplete && allConsentsGiven && hasSignature;

  return (
    <div className="space-y-6">
      {/* Information Summary */}
      <div>
        <h3 className="text-sm font-medium mb-4">Review Your Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summarySections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className={section.isComplete ? 'border-green-200' : 'border-amber-200'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {section.isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs">
                    {section.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}:</span>
                        <span className="font-medium truncate ml-2 max-w-[60%]">{item.value || '-'}</span>
                      </div>
                    ))}
                    {section.items.length > 4 && (
                      <div className="text-muted-foreground">+{section.items.length - 4} more...</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Declarations */}
      <div>
        <h3 className="text-sm font-medium mb-4">Declarations & Consent</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="backgroundCheck"
              checked={data.backgroundCheckConsent}
              onCheckedChange={(checked) => handleCheckboxChange('backgroundCheckConsent', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="backgroundCheck" className="text-sm cursor-pointer">
                Background Verification Consent <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                I hereby authorize {companyName} to conduct background verification checks including 
                employment history, education credentials, and criminal record verification.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="dataPrivacy"
              checked={data.dataPrivacyConsent}
              onCheckedChange={(checked) => handleCheckboxChange('dataPrivacyConsent', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="dataPrivacy" className="text-sm cursor-pointer">
                Data Privacy Consent <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                I consent to the collection, storage, and processing of my personal data by {companyName} 
                in accordance with applicable data protection laws and the company&apos;s privacy policy.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="employmentTerms"
              checked={data.employmentTermsAccepted}
              onCheckedChange={(checked) => handleCheckboxChange('employmentTermsAccepted', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="employmentTerms" className="text-sm cursor-pointer">
                Employment Terms Acceptance <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                I understand and agree to comply with {companyName}&apos;s employment policies, 
                code of conduct, and terms of employment as communicated during the hiring process.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Checkbox
              id="infoAccurate"
              checked={data.informationAccurate}
              onCheckedChange={(checked) => handleCheckboxChange('informationAccurate', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="infoAccurate" className="text-sm cursor-pointer font-medium">
                Declaration of Accurate Information <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                I declare that all information provided in this onboarding form is true, complete, and accurate 
                to the best of my knowledge. I understand that providing false information may result in 
                termination of employment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Digital Signature */}
      <div>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          Digital Signature <span className="text-red-500">*</span>
        </h3>
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-950">
          <p className="text-xs text-muted-foreground mb-3">
            Please draw your signature in the box below using your mouse or touchscreen.
          </p>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="border rounded-lg w-full bg-gray-50 dark:bg-gray-900 touch-none"
              style={{ maxWidth: '100%', height: '150px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-muted-foreground text-sm">Sign here</span>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <Eraser className="h-4 w-4 mr-2" />
              Clear Signature
            </Button>
          </div>
        </div>
      </div>

      {/* Validation Message */}
      {!canSubmit && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Cannot Submit Yet</h4>
              <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 list-disc list-inside">
                {!allComplete && <li>Please complete all required information in previous steps</li>}
                {!data.backgroundCheckConsent && <li>Please provide background verification consent</li>}
                {!data.dataPrivacyConsent && <li>Please provide data privacy consent</li>}
                {!data.employmentTermsAccepted && <li>Please accept employment terms</li>}
                {!data.informationAccurate && <li>Please confirm information accuracy</li>}
                {!hasSignature && <li>Please provide your digital signature</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
