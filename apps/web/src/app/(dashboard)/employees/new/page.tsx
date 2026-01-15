'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  MapPin, 
  Phone, 
  Building, 
  GraduationCap, 
  Loader2, 
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useDepartments, useDesignations, useEmployees } from '@/hooks/use-employees';
import { toast } from 'sonner';

// Types
interface EducationEntry {
  id: string;
  educationType: string;
  institutionName: string;
  institutionType: string;
  degree: string;
  fieldOfStudy: string;
  specialization: string;
  enrollmentYear: number | '';
  completionYear: number | '';
  isOngoing: boolean;
  gradeType: string;
  grade: string;
  percentage: string;
  boardUniversity: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone: string;
  email: string;
  address: string;
  isPrimary: boolean;
}

interface BankDetail {
  bankName: string;
  branchName: string;
  accountNumber: string;
  accountType: string;
  routingNumber: string;
  swiftCode: string;
  ifscCode: string;
  isPrimary: boolean;
}

interface FormData {
  // Personal Info
  firstName: string;
  lastName: string;
  middleName: string;
  displayName: string;
  email: string;
  personalEmail: string;
  phone: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  
  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  
  // Employment
  departmentId: string;
  designationId: string;
  reportingManagerId: string;
  employmentType: string;
  joinDate: string;
  probationEndDate: string;
  workLocation: string;
  workShift: string;
  timezone: string;
  
  // Compensation
  baseSalary: string;
  currency: string;
  
  // Emergency Contacts
  emergencyContacts: EmergencyContact[];
  
  // Bank Details
  bankDetails: BankDetail[];
  
  // Education
  educations: EducationEntry[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialEmergencyContact: EmergencyContact = {
  name: '',
  relationship: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  isPrimary: true,
};

const initialBankDetail: BankDetail = {
  bankName: '',
  branchName: '',
  accountNumber: '',
  accountType: 'SAVINGS',
  routingNumber: '',
  swiftCode: '',
  ifscCode: '',
  isPrimary: true,
};

const initialEducation: EducationEntry = {
  id: generateId(),
  educationType: '',
  institutionName: '',
  institutionType: 'UNIVERSITY',
  degree: '',
  fieldOfStudy: '',
  specialization: '',
  enrollmentYear: '',
  completionYear: '',
  isOngoing: false,
  gradeType: 'PERCENTAGE',
  grade: '',
  percentage: '',
  boardUniversity: '',
};

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  middleName: '',
  displayName: '',
  email: '',
  personalEmail: '',
  phone: '',
  mobile: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  nationality: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  departmentId: '',
  designationId: '',
  reportingManagerId: '',
  employmentType: 'FULL_TIME',
  joinDate: '',
  probationEndDate: '',
  workLocation: '',
  workShift: '',
  timezone: 'UTC',
  baseSalary: '',
  currency: 'USD',
  emergencyContacts: [{ ...initialEmergencyContact }],
  bankDetails: [{ ...initialBankDetail }],
  educations: [],
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: employeesData } = useEmployees({ limit: 100 });
  const employees = employeesData?.items || [];

  // Field update helper
  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const applyAddressFields = (fields: Partial<FormData>) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return;
    }
    setFormData((prev) => ({ ...prev, ...fields }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
  };

  // Auto-generate display name
  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    updateField(field, value);
    const first = field === 'firstName' ? value : formData.firstName;
    const last = field === 'lastName' ? value : formData.lastName;
    if (first || last) {
      updateField('displayName', `${first} ${last}`.trim());
    }
  };

  const handleAutoFillAddress = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }

    setIsFetchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch address');
          }
          const data = await response.json();
          const address = data?.address || {};

          const addressLine1 = [
            address.house_number,
            address.road,
            address.suburb,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();
          const city =
            address.city || address.town || address.village || address.county || '';
          const state = address.state || address.state_district || '';
          const country = address.country || '';
          const postalCode = address.postcode || '';
          const addressLine1Value = addressLine1 || data?.display_name || '';

          const nextFields: Partial<FormData> = {};
          if (addressLine1Value) nextFields.addressLine1 = addressLine1Value;
          if (city) nextFields.city = city;
          if (state) nextFields.state = state;
          if (country) nextFields.country = country;
          if (postalCode) nextFields.postalCode = postalCode;

          if (Object.keys(nextFields).length === 0) {
            toast.error('No address data found for this location');
            return;
          }

          applyAddressFields(nextFields);
          toast.success('Address auto-filled');
        } catch (error) {
          console.error('Failed to fetch address', error);
          toast.error('Unable to fetch address');
        } finally {
          setIsFetchingAddress(false);
        }
      },
      (error) => {
        console.error('Geolocation error', error);
        toast.error('Unable to access location');
        setIsFetchingAddress(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Emergency Contact handlers
  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { ...initialEmergencyContact, isPrimary: false },
      ],
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: any) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  // Bank Detail handlers
  const addBankDetail = () => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: [
        ...prev.bankDetails,
        { ...initialBankDetail, isPrimary: false },
      ],
    }));
  };

  const removeBankDetail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: prev.bankDetails.filter((_, i) => i !== index),
    }));
  };

  const updateBankDetail = (index: number, field: keyof BankDetail, value: any) => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: prev.bankDetails.map((bank, i) =>
        i === index ? { ...bank, [field]: value } : bank
      ),
    }));
  };

  // Education handlers
  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      educations: [
        ...prev.educations,
        { ...initialEducation, id: generateId() },
      ],
    }));
  };

  const removeEducation = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      educations: prev.educations.filter((edu) => edu.id !== id),
    }));
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: any) => {
    setFormData((prev) => ({
      ...prev,
      educations: prev.educations.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.departmentId) newErrors.departmentId = 'Department is required';
    if (!formData.designationId) newErrors.designationId = 'Designation is required';
    if (!formData.joinDate) newErrors.joinDate = 'Join date is required';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Switch to tab with first error
      if (newErrors.firstName || newErrors.lastName || newErrors.email) {
        setActiveTab('personal');
      } else if (newErrors.departmentId || newErrors.designationId || newErrors.joinDate) {
        setActiveTab('employment');
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare payload
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        displayName: formData.displayName,
        email: formData.email,
        personalEmail: formData.personalEmail || undefined,
        phone: formData.phone || undefined,
        mobile: formData.mobile || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        nationality: formData.nationality || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        departmentId: formData.departmentId,
        designationId: formData.designationId,
        reportingManagerId: formData.reportingManagerId || undefined,
        employmentType: formData.employmentType,
        joinDate: formData.joinDate,
        probationEndDate: formData.probationEndDate || undefined,
        workLocation: formData.workLocation || undefined,
        workShift: formData.workShift || undefined,
        timezone: formData.timezone,
        baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : undefined,
        currency: formData.currency,
        emergencyContacts: formData.emergencyContacts.filter(c => c.name && c.phone),
        bankDetails: formData.bankDetails.filter(b => b.bankName && b.accountNumber),
        educations: formData.educations
          .filter(e => e.institutionName && e.educationType)
          .map(e => ({
            ...e,
            enrollmentYear: e.enrollmentYear ? Number(e.enrollmentYear) : undefined,
            completionYear: e.completionYear ? Number(e.completionYear) : undefined,
            percentage: e.percentage ? parseFloat(e.percentage) : undefined,
          })),
      };

      const response = await apiClient.post('/api/v1/employees', payload);

      if (response.success) {
        toast.success('Employee created successfully');
        router.push('/employees');
      } else {
        toast.error(response.error?.message || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('An error occurred while creating employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Employee</h2>
          <p className="text-muted-foreground">
            Fill in the details to onboard a new employee
          </p>
        </div>
      </div>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="employment" className="gap-2">
            <Briefcase className="h-4 w-4 hidden sm:block" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4 hidden sm:block" />
            Address
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-2">
            <Phone className="h-4 w-4 hidden sm:block" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <Building className="h-4 w-4 hidden sm:block" />
            Bank
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-2">
            <GraduationCap className="h-4 w-4 hidden sm:block" />
            Education
          </TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic personal details of the employee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleNameChange('firstName', e.target.value)}
                    placeholder="John"
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => updateField('middleName', e.target.value)}
                    placeholder="Michael"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleNameChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="john.doe@company.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={(e) => updateField('personalEmail', e.target.value)}
                    placeholder="john@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    placeholder="+1 234 567 8901"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => updateField('gender', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(v) => updateField('maritalStatus', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="MARRIED">Married</SelectItem>
                      <SelectItem value="DIVORCED">Divorced</SelectItem>
                      <SelectItem value="WIDOWED">Widowed</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => updateField('nationality', e.target.value)}
                    placeholder="American"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Details */}
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>
                Work-related information and organization structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(v) => updateField('departmentId', v)}
                  >
                    <SelectTrigger className={errors.departmentId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <p className="text-sm text-destructive">{errors.departmentId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designationId">Designation *</Label>
                  <Select
                    value={formData.designationId}
                    onValueChange={(v) => updateField('designationId', v)}
                  >
                    <SelectTrigger className={errors.designationId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations?.map((desig) => (
                        <SelectItem key={desig.id} value={desig.id}>
                          {desig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.designationId && (
                    <p className="text-sm text-destructive">{errors.designationId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportingManagerId">Reporting Manager</Label>
                  <Select
                    value={formData.reportingManagerId}
                    onValueChange={(v) => updateField('reportingManagerId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(v) => updateField('employmentType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                      <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joinDate">Join Date *</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => updateField('joinDate', e.target.value)}
                    className={errors.joinDate ? 'border-destructive' : ''}
                  />
                  {errors.joinDate && (
                    <p className="text-sm text-destructive">{errors.joinDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probationEndDate">Probation End Date</Label>
                  <Input
                    id="probationEndDate"
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => updateField('probationEndDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workLocation">Work Location</Label>
                  <Input
                    id="workLocation"
                    value={formData.workLocation}
                    onChange={(e) => updateField('workLocation', e.target.value)}
                    placeholder="Office/Remote/Hybrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workShift">Work Shift</Label>
                  <Input
                    id="workShift"
                    value={formData.workShift}
                    onChange={(e) => updateField('workShift', e.target.value)}
                    placeholder="Day/Night/Flexible"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(v) => updateField('timezone', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Kolkata">India</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Base Salary</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => updateField('baseSalary', e.target.value)}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => updateField('currency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Address Information</CardTitle>
                  <CardDescription>
                    Employee's residential address
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFillAddress}
                  disabled={isFetchingAddress}
                >
                  {isFetchingAddress ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Auto-fill address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => updateField('addressLine1', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => updateField('addressLine2', e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="United States"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="10001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>
                Contact persons in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.emergencyContacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Contact {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={contact.relationship}
                        onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                        placeholder="Spouse/Parent/Sibling"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alternate Phone</Label>
                      <Input
                        value={contact.alternatePhone}
                        onChange={(e) => updateEmergencyContact(index, 'alternatePhone', e.target.value)}
                        placeholder="+1 234 567 8901"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addEmergencyContact}>
                <Plus className="h-4 w-4 mr-2" />
                Add Emergency Contact
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>
                Banking information for salary payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.bankDetails.map((bank, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Bank Account {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBankDetail(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={bank.bankName}
                        onChange={(e) => updateBankDetail(index, 'bankName', e.target.value)}
                        placeholder="Chase Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch Name</Label>
                      <Input
                        value={bank.branchName}
                        onChange={(e) => updateBankDetail(index, 'branchName', e.target.value)}
                        placeholder="Main Street Branch"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={bank.accountNumber}
                        onChange={(e) => updateBankDetail(index, 'accountNumber', e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <Select
                        value={bank.accountType}
                        onValueChange={(v) => updateBankDetail(index, 'accountType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAVINGS">Savings</SelectItem>
                          <SelectItem value="CHECKING">Checking</SelectItem>
                          <SelectItem value="CURRENT">Current</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Routing Number</Label>
                      <Input
                        value={bank.routingNumber}
                        onChange={(e) => updateBankDetail(index, 'routingNumber', e.target.value)}
                        placeholder="021000021"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SWIFT Code</Label>
                      <Input
                        value={bank.swiftCode}
                        onChange={(e) => updateBankDetail(index, 'swiftCode', e.target.value)}
                        placeholder="CHASUS33"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input
                        value={bank.ifscCode}
                        onChange={(e) => updateBankDetail(index, 'ifscCode', e.target.value)}
                        placeholder="ICIC0001234"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addBankDetail}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle>Education Details</CardTitle>
              <CardDescription>
                Academic qualifications and certifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.educations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No education records added yet</p>
                </div>
              ) : (
                formData.educations.map((edu) => (
                  <div key={edu.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">
                        {edu.degree || edu.educationType || 'Education Record'}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(edu.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Education Type *</Label>
                        <Select
                          value={edu.educationType}
                          onValueChange={(v) => updateEducation(edu.id, 'educationType', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HIGH_SCHOOL">High School (10th)</SelectItem>
                            <SelectItem value="INTERMEDIATE">Intermediate (12th)</SelectItem>
                            <SelectItem value="DIPLOMA">Diploma</SelectItem>
                            <SelectItem value="BACHELORS">Bachelor's Degree</SelectItem>
                            <SelectItem value="MASTERS">Master's Degree</SelectItem>
                            <SelectItem value="DOCTORATE">Doctorate (PhD)</SelectItem>
                            <SelectItem value="POST_DOCTORATE">Post Doctorate</SelectItem>
                            <SelectItem value="CERTIFICATION">Certification</SelectItem>
                            <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Institution Type</Label>
                        <Select
                          value={edu.institutionType}
                          onValueChange={(v) => updateEducation(edu.id, 'institutionType', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SCHOOL">School</SelectItem>
                            <SelectItem value="COLLEGE">College</SelectItem>
                            <SelectItem value="UNIVERSITY">University</SelectItem>
                            <SelectItem value="INSTITUTE">Institute</SelectItem>
                            <SelectItem value="ONLINE">Online</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Institution Name *</Label>
                      <Input
                        value={edu.institutionName}
                        onChange={(e) => updateEducation(edu.id, 'institutionName', e.target.value)}
                        placeholder="Harvard University"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Degree/Certificate</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                          placeholder="Bachelor of Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.fieldOfStudy}
                          onChange={(e) => updateEducation(edu.id, 'fieldOfStudy', e.target.value)}
                          placeholder="Computer Science"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Specialization</Label>
                        <Input
                          value={edu.specialization}
                          onChange={(e) => updateEducation(edu.id, 'specialization', e.target.value)}
                          placeholder="Software Engineering"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Board/University</Label>
                        <Input
                          value={edu.boardUniversity}
                          onChange={(e) => updateEducation(edu.id, 'boardUniversity', e.target.value)}
                          placeholder="State Board / University Name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Enrollment Year</Label>
                        <Input
                          type="number"
                          value={edu.enrollmentYear}
                          onChange={(e) => updateEducation(edu.id, 'enrollmentYear', e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="2018"
                          min="1950"
                          max="2030"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Completion Year</Label>
                        <Input
                          type="number"
                          value={edu.completionYear}
                          onChange={(e) => updateEducation(edu.id, 'completionYear', e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="2022"
                          min="1950"
                          max="2030"
                          disabled={edu.isOngoing}
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edu.isOngoing}
                            onChange={(e) => updateEducation(edu.id, 'isOngoing', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">Currently Pursuing</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Grade Type</Label>
                        <Select
                          value={edu.gradeType}
                          onValueChange={(v) => updateEducation(edu.id, 'gradeType', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                            <SelectItem value="CGPA_10">CGPA (out of 10)</SelectItem>
                            <SelectItem value="CGPA_4">GPA (out of 4)</SelectItem>
                            <SelectItem value="GRADE_LETTER">Grade Letter</SelectItem>
                            <SelectItem value="DIVISION">Division</SelectItem>
                            <SelectItem value="PASS_FAIL">Pass/Fail</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Grade/Score</Label>
                        <Input
                          value={edu.grade}
                          onChange={(e) => updateEducation(edu.id, 'grade', e.target.value)}
                          placeholder="3.8 / A+ / First Class"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage</Label>
                        <Input
                          type="number"
                          value={edu.percentage}
                          onChange={(e) => updateEducation(edu.id, 'percentage', e.target.value)}
                          placeholder="85.5"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button type="button" variant="outline" onClick={addEducation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/employees">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Employee
        </Button>
      </div>
    </div>
  );
}
