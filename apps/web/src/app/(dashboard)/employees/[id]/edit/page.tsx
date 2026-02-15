'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEmployee, useUpdateEmployee } from '@/hooks/use-employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface EmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
  isPrimary: boolean;
}

interface BankDetail {
  id?: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  isPrimary: boolean;
}

interface Education {
  id?: string;
  educationType: string;
  institutionName: string;
  institutionType: string;
  degree: string;
  fieldOfStudy: string;
  specialization: string;
  enrollmentYear: string;
  completionYear: string;
  isOngoing: boolean;
  gradeType: string;
  grade: string;
  percentage: string;
  boardUniversity: string;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { data: employee, isLoading, error } = useEmployee(employeeId);
  const updateEmployee = useUpdateEmployee();

  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    personalEmail: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    // Employment
    employeeCode: '',
    departmentId: '',
    designationId: '',
    employmentType: 'FULL_TIME',
    joinDate: '',
    confirmationDate: '',
    probationEndDate: '',
    workLocation: '',
    workShift: '',
    timezone: 'UTC',
    baseSalary: '',
    currency: 'INR',
    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);

  // Populate form when employee data loads
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        mobile: employee.mobile || '',
        personalEmail: employee.personalEmail || '',
        dateOfBirth: employee.dateOfBirth
          ? new Date(employee.dateOfBirth).toISOString().split('T')[0]
          : '',
        gender: employee.gender || '',
        maritalStatus: employee.maritalStatus || '',
        nationality: employee.nationality || '',
        employeeCode: employee.employeeCode || '',
        departmentId: employee.departmentId || '',
        designationId: employee.designationId || '',
        employmentType: employee.employmentType || 'FULL_TIME',
        joinDate: employee.joinDate
          ? new Date(employee.joinDate).toISOString().split('T')[0]
          : '',
        confirmationDate: employee.confirmationDate
          ? new Date(employee.confirmationDate).toISOString().split('T')[0]
          : '',
        probationEndDate: employee.probationEndDate
          ? new Date(employee.probationEndDate).toISOString().split('T')[0]
          : '',
        workLocation: employee.workLocation || '',
        workShift: employee.workShift || '',
        timezone: employee.timezone || 'UTC',
        baseSalary: employee.baseSalary?.toString() || '',
        currency: employee.currency || 'INR',
        addressLine1: employee.addressLine1 || '',
        addressLine2: employee.addressLine2 || '',
        city: employee.city || '',
        state: employee.state || '',
        country: employee.country || '',
        postalCode: employee.postalCode || '',
      });

      // Populate related data
      if ((employee as any).emergencyContacts) {
        setEmergencyContacts(
          (employee as any).emergencyContacts.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            relationship: c.relationship || '',
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            isPrimary: c.isPrimary || false,
          }))
        );
      }

      if ((employee as any).bankDetails) {
        setBankDetails(
          (employee as any).bankDetails.map((b: any) => ({
            id: b.id,
            bankName: b.bankName || '',
            accountNumber: b.accountNumber || '',
            accountHolderName: b.accountHolderName || '',
            ifscCode: b.ifscCode || '',
            branchName: b.branchName || '',
            accountType: b.accountType || 'SAVINGS',
            isPrimary: b.isPrimary || false,
          }))
        );
      }

      if ((employee as any).educations) {
        setEducations(
          (employee as any).educations.map((e: any) => ({
            id: e.id,
            educationType: e.educationType || '',
            institutionName: e.institutionName || '',
            institutionType: e.institutionType || '',
            degree: e.degree || '',
            fieldOfStudy: e.fieldOfStudy || '',
            specialization: e.specialization || '',
            enrollmentYear: e.enrollmentYear?.toString() || '',
            completionYear: e.completionYear?.toString() || '',
            isOngoing: e.isOngoing || false,
            gradeType: e.gradeType || '',
            grade: e.grade || '',
            percentage: e.percentage?.toString() || '',
            boardUniversity: e.boardUniversity || '',
          }))
        );
      }
    }
  }, [employee]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateEmployee.mutateAsync({
        id: employeeId,
        data: {
          ...formData,
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          maritalStatus: formData.maritalStatus || undefined,
          joinDate: formData.joinDate,
          confirmationDate: formData.confirmationDate || undefined,
          probationEndDate: formData.probationEndDate || undefined,
          baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : undefined,
          emergencyContacts,
          bankDetails,
          educations: educations.map((edu) => ({
            ...edu,
            enrollmentYear: edu.enrollmentYear ? parseInt(edu.enrollmentYear) : undefined,
            completionYear: edu.completionYear ? parseInt(edu.completionYear) : undefined,
            percentage: edu.percentage ? parseFloat(edu.percentage) : undefined,
          })),
        },
      });
      toast.success('Employee updated successfully');
      router.push(`/employees/${employeeId}`);
    } catch (err) {
      toast.error('Failed to update employee');
    }
  };

  // Emergency Contacts handlers
  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        isPrimary: emergencyContacts.length === 0,
      },
    ]);
  };

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  // Bank Details handlers
  const addBankDetail = () => {
    setBankDetails([
      ...bankDetails,
      {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        branchName: '',
        accountType: 'SAVINGS',
        isPrimary: bankDetails.length === 0,
      },
    ]);
  };

  const updateBankDetail = (index: number, field: string, value: any) => {
    const updated = [...bankDetails];
    updated[index] = { ...updated[index], [field]: value };
    setBankDetails(updated);
  };

  const removeBankDetail = (index: number) => {
    setBankDetails(bankDetails.filter((_, i) => i !== index));
  };

  // Education handlers
  const addEducation = () => {
    setEducations([
      ...educations,
      {
        educationType: '',
        institutionName: '',
        institutionType: '',
        degree: '',
        fieldOfStudy: '',
        specialization: '',
        enrollmentYear: '',
        completionYear: '',
        isOngoing: false,
        gradeType: '',
        grade: '',
        percentage: '',
        boardUniversity: '',
      },
    ]);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], [field]: value };
    setEducations(updated);
  };

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Employee Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The employee you're trying to edit doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(`/employees/${employeeId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employee
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Employee</h2>
          <p className="text-muted-foreground">
            {employee.employeeCode} • {employee.displayName}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <Tabs defaultValue="personal" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {/* Personal Info Tab */}
              <TabsContent value="personal" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalEmail">Personal Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) =>
                        handleInputChange('personalEmail', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <DatePicker
                      id="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={(date) =>
                        handleInputChange('dateOfBirth', date || '')
                      }
                      placeholder="Select date of birth"
                      maxDate={new Date()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                        <SelectItem value="PREFER_NOT_TO_SAY">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Select
                      value={formData.maritalStatus}
                      onValueChange={(value) =>
                        handleInputChange('maritalStatus', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="MARRIED">Married</SelectItem>
                        <SelectItem value="DIVORCED">Divorced</SelectItem>
                        <SelectItem value="WIDOWED">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) =>
                        handleInputChange('nationality', e.target.value)
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Employment Tab */}
              <TabsContent value="employment" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code *</Label>
                    <Input
                      id="employeeCode"
                      value={formData.employeeCode}
                      onChange={(e) =>
                        handleInputChange('employeeCode', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type *</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value) =>
                        handleInputChange('employmentType', value)
                      }
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date *</Label>
                    <DatePicker
                      id="joinDate"
                      value={formData.joinDate}
                      onChange={(date) =>
                        handleInputChange('joinDate', date || '')
                      }
                      placeholder="Select join date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmationDate">Confirmation Date</Label>
                    <DatePicker
                      id="confirmationDate"
                      value={formData.confirmationDate}
                      onChange={(date) =>
                        handleInputChange('confirmationDate', date || '')
                      }
                      placeholder="Select confirmation date"
                      minDate={formData.joinDate ? new Date(formData.joinDate) : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probationEndDate">Probation End Date</Label>
                    <DatePicker
                      id="probationEndDate"
                      value={formData.probationEndDate}
                      onChange={(date) =>
                        handleInputChange('probationEndDate', date || '')
                      }
                      placeholder="Select probation end date"
                      minDate={formData.joinDate ? new Date(formData.joinDate) : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workLocation">Work Location</Label>
                    <Input
                      id="workLocation"
                      value={formData.workLocation}
                      onChange={(e) =>
                        handleInputChange('workLocation', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workShift">Work Shift</Label>
                    <Input
                      id="workShift"
                      value={formData.workShift}
                      onChange={(e) =>
                        handleInputChange('workShift', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) =>
                        handleInputChange('timezone', value)
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      value={formData.baseSalary}
                      onChange={(e) =>
                        handleInputChange('baseSalary', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        handleInputChange('currency', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) =>
                        handleInputChange('addressLine1', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) =>
                        handleInputChange('addressLine2', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        handleInputChange('country', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) =>
                        handleInputChange('postalCode', e.target.value)
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Emergency Contacts Tab */}
              <TabsContent value="emergency" className="space-y-6">
                {emergencyContacts.map((contact, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">
                        Contact {index + 1}
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) =>
                              updateEmergencyContact(index, 'name', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Relationship *</Label>
                          <Input
                            value={contact.relationship}
                            onChange={(e) =>
                              updateEmergencyContact(
                                index,
                                'relationship',
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone *</Label>
                          <Input
                            value={contact.phone}
                            onChange={(e) =>
                              updateEmergencyContact(index, 'phone', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contact.email}
                            onChange={(e) =>
                              updateEmergencyContact(index, 'email', e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={contact.address}
                            onChange={(e) =>
                              updateEmergencyContact(
                                index,
                                'address',
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addEmergencyContact}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Emergency Contact
                </Button>
              </TabsContent>

              {/* Bank Details Tab */}
              <TabsContent value="bank" className="space-y-6">
                {bankDetails.map((bank, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">
                        Account {index + 1}
                        {bank.isPrimary && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBankDetail(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bank Name *</Label>
                          <Input
                            value={bank.bankName}
                            onChange={(e) =>
                              updateBankDetail(index, 'bankName', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number *</Label>
                          <Input
                            value={bank.accountNumber}
                            onChange={(e) =>
                              updateBankDetail(
                                index,
                                'accountNumber',
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Holder Name *</Label>
                          <Input
                            value={bank.accountHolderName}
                            onChange={(e) =>
                              updateBankDetail(
                                index,
                                'accountHolderName',
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>IFSC Code *</Label>
                          <Input
                            value={bank.ifscCode}
                            onChange={(e) =>
                              updateBankDetail(index, 'ifscCode', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Branch Name</Label>
                          <Input
                            value={bank.branchName}
                            onChange={(e) =>
                              updateBankDetail(index, 'branchName', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Select
                            value={bank.accountType}
                            onValueChange={(value) =>
                              updateBankDetail(index, 'accountType', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAVINGS">Savings</SelectItem>
                              <SelectItem value="CURRENT">Current</SelectItem>
                              <SelectItem value="SALARY">Salary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addBankDetail}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank Account
                </Button>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-6">
                {educations.map((edu, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">
                        Education {index + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEducation(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Education Type *</Label>
                          <Select
                            value={edu.educationType}
                            onValueChange={(value) =>
                              updateEducation(index, 'educationType', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                              <SelectItem value="DIPLOMA">Diploma</SelectItem>
                              <SelectItem value="BACHELORS">Bachelor's</SelectItem>
                              <SelectItem value="MASTERS">Master's</SelectItem>
                              <SelectItem value="DOCTORATE">Doctorate</SelectItem>
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
                            onValueChange={(value) =>
                              updateEducation(index, 'institutionType', value)
                            }
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
                        <div className="space-y-2">
                          <Label>Institution Name *</Label>
                          <Input
                            value={edu.institutionName}
                            onChange={(e) =>
                              updateEducation(index, 'institutionName', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Board/University</Label>
                          <Input
                            value={edu.boardUniversity}
                            onChange={(e) =>
                              updateEducation(index, 'boardUniversity', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Degree</Label>
                          <Input
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducation(index, 'degree', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field of Study</Label>
                          <Input
                            value={edu.fieldOfStudy}
                            onChange={(e) =>
                              updateEducation(index, 'fieldOfStudy', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Specialization</Label>
                          <Input
                            value={edu.specialization}
                            onChange={(e) =>
                              updateEducation(index, 'specialization', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Enrollment Year *</Label>
                          <Input
                            type="number"
                            value={edu.enrollmentYear}
                            onChange={(e) =>
                              updateEducation(index, 'enrollmentYear', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Completion Year</Label>
                          <Input
                            type="number"
                            value={edu.completionYear}
                            onChange={(e) =>
                              updateEducation(index, 'completionYear', e.target.value)
                            }
                            disabled={edu.isOngoing}
                          />
                        </div>
                        <div className="space-y-2 flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id={`ongoing-${index}`}
                            checked={edu.isOngoing}
                            onChange={(e) =>
                              updateEducation(index, 'isOngoing', e.target.checked)
                            }
                          />
                          <Label htmlFor={`ongoing-${index}`}>Currently Studying</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Grade Type</Label>
                          <Select
                            value={edu.gradeType}
                            onValueChange={(value) =>
                              updateEducation(index, 'gradeType', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                              <SelectItem value="CGPA_10">CGPA (10)</SelectItem>
                              <SelectItem value="CGPA_4">CGPA (4)</SelectItem>
                              <SelectItem value="GRADE_LETTER">Grade Letter</SelectItem>
                              <SelectItem value="DIVISION">Division</SelectItem>
                              <SelectItem value="PASS_FAIL">Pass/Fail</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Grade/Percentage</Label>
                          <Input
                            value={edu.grade || edu.percentage}
                            onChange={(e) => {
                              if (edu.gradeType === 'PERCENTAGE') {
                                updateEducation(index, 'percentage', e.target.value);
                              } else {
                                updateEducation(index, 'grade', e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addEducation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Education
                </Button>
              </TabsContent>
            </CardContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 p-6 pt-0">
            <Button type="button" variant="outline" asChild>
              <Link href={`/employees/${employeeId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
