'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput, PhoneDisplay } from '@/components/ui/phone-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Building2, User, Mail, Globe, Loader2, CheckCircle, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { LogoUpload } from '@/components/logo-upload';

interface FormData {
  // Organization
  name: string;
  slug: string;
  email: string;
  phone: string;
  website: string;
  legalName: string;
  logo: string | null;
  reportLogo: string | null;
  // Admin User
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  // Plan
  trialDays: number;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewTenantPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<{
    slug: string;
    adminEmail: string;
    loginUrl: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    legalName: '',
    logo: null,
    reportLogo: null,
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    trialDays: 14,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    updateField('name', value);
    // Auto-generate slug if not manually edited
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    updateField('slug', slug);
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters';
    }
    if (!formData.slug || !/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must be lowercase alphanumeric with hyphens only';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.adminFirstName) {
      newErrors.adminFirstName = 'First name is required';
    }
    if (!formData.adminLastName) {
      newErrors.adminLastName = 'Last name is required';
    }
    if (!formData.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Valid admin email is required';
    }
    if (!formData.adminPassword || formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        id: string;
        slug: string;
        adminEmail: string;
        loginUrl: string;
      }>('/api/v1/platform/tenants', formData);

      if (response.success && response.data) {
        setSuccess(true);
        setCreatedTenant({
          slug: response.data.slug,
          adminEmail: formData.adminEmail,
          loginUrl: response.data.loginUrl,
        });
      } else {
        setError(response.error?.message || 'Failed to create tenant');
      }
    } catch (err) {
      console.error('Error creating tenant:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success && createdTenant) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Tenant Created Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              The organization has been provisioned and is ready to use.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium mb-3">Access Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization URL:</span>
                  <a 
                    href={createdTenant.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {createdTenant.loginUrl}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin Email:</span>
                  <span>{createdTenant.adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span>As entered in the form</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link href="/admin/tenants">Back to Tenants</Link>
              </Button>
              <Button asChild>
                <a href={createdTenant.loginUrl} target="_blank" rel="noopener noreferrer">
                  Open Tenant Portal
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Tenant</h2>
          <p className="text-muted-foreground">
            Create a new organization with admin access
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  s < step ? 'bg-primary/20' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-16 text-sm text-muted-foreground">
        <span>Organization</span>
        <span>Admin User</span>
        <span>Review</span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Organization Details */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Basic information about the organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Uploads */}
            <div className="grid gap-6 md:grid-cols-2 pb-4 border-b">
              {/* Thumbnail Logo */}
              <div className="flex flex-col items-center">
                <Label className="mb-2 text-center">Thumbnail Logo</Label>
                <p className="text-xs text-muted-foreground mb-3 text-center">Used in lists, avatars, and navigation</p>
                <LogoUpload
                  value={formData.logo}
                  onChange={(logo) => updateField('logo', logo as any)}
                  name={formData.name || 'Organization'}
                  shape="circle"
                  size="lg"
                />
              </div>
              {/* Stationary Logo */}
              <div className="flex flex-col items-center">
                <Label className="mb-2 text-center">Stationary Logo</Label>
                <p className="text-xs text-muted-foreground mb-3 text-center">Full-size logo for stationery & documents (3:1 ratio)</p>
                <LogoUpload
                  value={formData.reportLogo}
                  onChange={(reportLogo) => updateField('reportLogo', reportLogo as any)}
                  name={formData.name || 'Organization'}
                  shape="square"
                  size="lg"
                  aspectRatio={3}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Corporation"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center">
                  <Input
                    id="slug"
                    placeholder="acme"
                    value={formData.slug}
                    onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">.localhost:3000</span>
                </div>
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                placeholder="Acme Corporation Inc."
                value={formData.legalName}
                onChange={(e) => updateField('legalName', e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@acme.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => updateField('phone', value)}
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://www.example.com"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                placeholder="123 Business Street"
                value={formData.addressLine1}
                onChange={(e) => updateField('addressLine1', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                placeholder="Suite 100, Building A"
                value={formData.addressLine2}
                onChange={(e) => updateField('addressLine2', e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="USA"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="10001"
                  value={formData.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>Next: Admin User</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Admin User */}
      {step === 2 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Admin User
            </CardTitle>
            <CardDescription>
              Set up the initial administrator account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">First Name *</Label>
                <Input
                  id="adminFirstName"
                  placeholder="John"
                  value={formData.adminFirstName}
                  onChange={(e) => updateField('adminFirstName', e.target.value)}
                />
                {errors.adminFirstName && (
                  <p className="text-sm text-destructive">{errors.adminFirstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Last Name *</Label>
                <Input
                  id="adminLastName"
                  placeholder="Doe"
                  value={formData.adminLastName}
                  onChange={(e) => updateField('adminLastName', e.target.value)}
                />
                {errors.adminLastName && (
                  <p className="text-sm text-destructive">{errors.adminLastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@acme.com"
                value={formData.adminEmail}
                onChange={(e) => updateField('adminEmail', e.target.value)}
              />
              {errors.adminEmail && (
                <p className="text-sm text-destructive">{errors.adminEmail}</p>
              )}
              <p className="text-sm text-muted-foreground">
                This will be the login email for the tenant admin
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.adminPassword}
                onChange={(e) => updateField('adminPassword', e.target.value)}
              />
              {errors.adminPassword && (
                <p className="text-sm text-destructive">{errors.adminPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Period</Label>
              <Select
                value={String(formData.trialDays)}
                onValueChange={(v) => updateField('trialDays', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trial duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No trial (Active immediately)</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext}>Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Review & Create
            </CardTitle>
            <CardDescription>
              Review the details before creating the tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Summary */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Organization</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                {/* Logo Preview */}
                {formData.logo && (
                  <div className="flex justify-center pb-3 border-b">
                    <img
                      src={formData.logo}
                      alt={formData.name}
                      className="h-20 w-20 rounded-full object-cover border-2 border-background shadow-md"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slug:</span>
                    <span className="font-medium">{formData.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URL:</span>
                    <span className="font-medium text-primary">
                      http://{formData.slug}.localhost:3000
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact Email:</span>
                    <span>{formData.email}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <PhoneDisplay value={formData.phone} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Summary */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Admin User</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">
                    {formData.adminFirstName} {formData.adminLastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{formData.adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span>••••••••</span>
                </div>
              </div>
            </div>

            {/* Trial Info */}
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Subscription</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {formData.trialDays > 0 ? 'Trial' : 'Active'}
                  </span>
                </div>
                {formData.trialDays > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trial Period:</span>
                    <span>{formData.trialDays} days</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
