'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowRight, ArrowLeft, CheckCircle, User, Mail, Lock, Globe } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Step 1: Organization Details
const organizationSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  slug: z.string()
    .min(2, 'Subdomain must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase letters, numbers, and hyphens only'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  legalName: z.string().optional(),
});

// Step 2: Admin User Details
const adminSchema = z.object({
  adminFirstName: z.string().min(1, 'First name is required'),
  adminLastName: z.string().min(1, 'Last name is required'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Step 3: Address (optional)
const addressSchema = z.object({
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

type OrganizationData = z.infer<typeof organizationSchema>;
type AdminData = z.infer<typeof adminSchema>;
type AddressData = z.infer<typeof addressSchema>;

const STEPS = [
  { id: 1, title: 'Organization', icon: Building2 },
  { id: 2, title: 'Admin Account', icon: User },
  { id: 3, title: 'Address', icon: Globe },
];

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  
  // Form state for each step
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  const orgForm = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      legalName: '',
    },
  });

  const adminForm = useForm<AdminData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  const addressForm = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressLine1: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });

  // Auto-generate slug from company name
  const handleNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    orgForm.setValue('slug', slug);
  };

  const onOrgSubmit = (data: OrganizationData) => {
    setOrgData(data);
    // Pre-fill admin email with company email
    if (!adminForm.getValues('adminEmail')) {
      adminForm.setValue('adminEmail', data.email);
    }
    setCurrentStep(2);
  };

  const onAdminSubmit = (data: AdminData) => {
    setAdminData(data);
    setCurrentStep(3);
  };

  const onFinalSubmit = async (addressData: AddressData) => {
    if (!orgData || !adminData) return;

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/tenants/register`, {
        ...orgData,
        ...adminData,
        ...addressData,
        trialDays: 14, // 14-day free trial
      });

      setTenantData(response.data.data);
      setIsSuccess(true);
      toast.success('Organization created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create organization';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess && tenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to OMS!</CardTitle>
            <CardDescription>
              Your organization has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm"><strong>Organization:</strong> {tenantData.name}</p>
              <p className="text-sm"><strong>Your URL:</strong> 
                <a href={`http://${tenantData.slug}.localhost:3000`} className="text-primary ml-1">
                  {tenantData.slug}.localhost:3000
                </a>
              </p>
              <p className="text-sm"><strong>Trial ends:</strong> {new Date(tenantData.trialEndsAt).toLocaleDateString()}</p>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              You can now login with your admin credentials at your organization URL.
            </p>
            
            <Button 
              className="w-full" 
              onClick={() => window.location.href = `http://${tenantData.slug}.localhost:3000/login`}
            >
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>
            Start your 14-day free trial. No credit card required.
          </CardDescription>
        </CardHeader>
        
        {/* Progress Steps */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${currentStep >= step.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground/30 text-muted-foreground'}`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-2 
                    ${currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} 
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <span key={step.id} className="text-xs text-muted-foreground">{step.title}</span>
            ))}
          </div>
        </div>
        
        <Separator />
        
        <CardContent className="pt-6">
          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Corporation"
                  {...orgForm.register('name', {
                    onChange: (e) => handleNameChange(e.target.value),
                  })}
                />
                {orgForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{orgForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Subdomain *</Label>
                <div className="flex items-center">
                  <Input
                    id="slug"
                    placeholder="acme"
                    {...orgForm.register('slug')}
                    className="rounded-r-none"
                  />
                  <span className="inline-flex items-center px-3 h-10 border border-l-0 rounded-r-md bg-muted text-muted-foreground text-sm">
                    .localhost:3000
                  </span>
                </div>
                {orgForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{orgForm.formState.errors.slug.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Company Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@acme.com"
                  {...orgForm.register('email')}
                />
                {orgForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{orgForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 890"
                    {...orgForm.register('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    placeholder="Acme Corp LLC"
                    {...orgForm.register('legalName')}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          )}
          
          {/* Step 2: Admin Account */}
          {currentStep === 2 && (
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">First Name *</Label>
                  <Input
                    id="adminFirstName"
                    placeholder="John"
                    {...adminForm.register('adminFirstName')}
                  />
                  {adminForm.formState.errors.adminFirstName && (
                    <p className="text-sm text-destructive">{adminForm.formState.errors.adminFirstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLastName">Last Name *</Label>
                  <Input
                    id="adminLastName"
                    placeholder="Doe"
                    {...adminForm.register('adminLastName')}
                  />
                  {adminForm.formState.errors.adminLastName && (
                    <p className="text-sm text-destructive">{adminForm.formState.errors.adminLastName.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="john@acme.com"
                  {...adminForm.register('adminEmail')}
                />
                {adminForm.formState.errors.adminEmail && (
                  <p className="text-sm text-destructive">{adminForm.formState.errors.adminEmail.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Create a strong password"
                  {...adminForm.register('adminPassword')}
                />
                {adminForm.formState.errors.adminPassword && (
                  <p className="text-sm text-destructive">{adminForm.formState.errors.adminPassword.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...adminForm.register('confirmPassword')}
                />
                {adminForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{adminForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and a number.
              </div>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
          
          {/* Step 3: Address */}
          {currentStep === 3 && (
            <form onSubmit={addressForm.handleSubmit(onFinalSubmit)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Address information is optional. You can add or update this later.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address</Label>
                <Input
                  id="addressLine1"
                  placeholder="123 Main Street"
                  {...addressForm.register('addressLine1')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    {...addressForm.register('city')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    {...addressForm.register('state')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    {...addressForm.register('country')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="10001"
                    {...addressForm.register('postalCode')}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Organization
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                By creating an organization, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
