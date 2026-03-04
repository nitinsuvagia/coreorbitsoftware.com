'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEmployee } from '@/hooks/use-employees';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneDisplay } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getInitials, getStatusColor, getAvatarColor } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  User,
  Briefcase,
  GraduationCap,
  CreditCard,
  AlertCircle,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface SystemRole {
  id: string;
  name: string;
  slug: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const { formatDate } = useOrgFormatters();
  const { can, hasAnyRole, hasRole, roles: userRoles } = usePermissions();
  const canEdit = can('employees:write');
  
  // Role change permissions:
  // - Tenant Admin & Admin can assign: admin, hr_manager, employee
  // - HR Manager can assign: hr_manager, employee
  // - tenant_admin can NEVER be assigned (registration role only)
  const isTenantAdmin = hasRole('tenant_admin');
  const isAdmin = hasRole('admin');
  const isHRManager = hasRole('hr_manager');
  // Only Tenant Admin, Admin, and HR Manager can change system roles
  const canChangeSystemRole = isTenantAdmin || isAdmin || isHRManager;

  const { data: employee, isLoading, error, refetch } = useEmployee(employeeId);
  
  // System Role state
  const [availableRoles, setAvailableRoles] = useState<SystemRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Get allowed role slugs based on current user's role
  const getAllowedRoleSlugs = (): string[] => {
    if (isTenantAdmin) {
      // Tenant Admin can assign ANY role except tenant_admin
      return availableRoles
        .filter(role => role.slug !== 'tenant_admin')
        .map(role => role.slug);
    } else if (isAdmin || isHRManager) {
      // Admin and HR Manager can assign any role except tenant_admin and admin
      return availableRoles
        .filter(role => role.slug !== 'tenant_admin' && role.slug !== 'admin')
        .map(role => role.slug);
    }
    return [];
  };

  // Filter roles based on permissions
  // Include the current role (even if not assignable) so it shows as selected
  const getFilteredRoles = (): SystemRole[] => {
    const allowedSlugs = getAllowedRoleSlugs();
    const filtered = availableRoles.filter(role => allowedSlugs.includes(role.slug));
    
    // If the current role is not in allowed list, add it so it shows as selected
    // (e.g., tenant_admin viewing their own profile)
    if (employee?.systemRole && !allowedSlugs.includes(employee.systemRole.slug)) {
      // Check if current role is already in the list
      const currentRoleInList = filtered.find(r => r.id === employee.systemRole?.id);
      if (!currentRoleInList) {
        filtered.unshift(employee.systemRole);
      }
    }
    
    return filtered;
  };

  // Check if a role can be selected (not the current unassignable role)
  const isRoleSelectable = (roleSlug: string): boolean => {
    const allowedSlugs = getAllowedRoleSlugs();
    return allowedSlugs.includes(roleSlug);
  };

  // Loading state for roles
  const [rolesLoading, setRolesLoading] = useState(true);

  // Fetch available roles on mount
  useEffect(() => {
    if (canChangeSystemRole) {
      setRolesLoading(true);
      apiClient.get<SystemRole[]>('/api/v1/roles')
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setAvailableRoles(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setRolesLoading(false));
    } else {
      setRolesLoading(false);
    }
  }, [canChangeSystemRole]);

  // Update selectedRoleId when employee data changes
  useEffect(() => {
    if (employee?.systemRole?.id) {
      setSelectedRoleId(employee.systemRole.id);
    }
  }, [employee?.systemRole?.id]);

  const handleRoleChange = async (newRoleId: string) => {
    if (!employee?.id || !newRoleId || newRoleId === employee.systemRole?.id) {
      return;
    }

    setIsChangingRole(true);
    
    const res = await apiClient.put<{ employee: any; newRole: { id: string; name: string } }>(`/api/v1/employees/${employee.id}/system-role`, {
      roleId: newRoleId,
    });

    if (res.success && res.data?.newRole) {
      toast.success(`System role changed to ${res.data.newRole.name}`);
      setSelectedRoleId(newRoleId);
      refetch();
    } else {
      toast.error(res.error?.message || 'Failed to change role');
    }
    
    setIsChangingRole(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Employee Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The employee you're looking for doesn't exist or has been removed.
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
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/employees')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {employee.displayName}
            </h2>
            <p className="text-muted-foreground">
              {employee.employeeCode} • {employee.designation?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/employees/${employee.id}/360`}>
              <Sparkles className="mr-2 h-4 w-4" />
              360° View
            </Link>
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/employees/${employee.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Employee
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee.avatar} />
                <AvatarFallback className={`${getAvatarColor((employee.email || '') + employee.firstName + employee.lastName).className} text-2xl font-semibold`}>
                  {getInitials(`${employee.firstName} ${employee.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{employee.displayName}</h3>
                <p className="text-muted-foreground">
                  {employee.designation?.name}
                </p>
              </div>
              <Badge className={getStatusColor(employee.status)}>
                {employee.status}
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <PhoneDisplay value={employee.phone} className="text-sm" />
                </div>
              )}
              {employee.department && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{employee.department.name}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {formatDate(employee.joinDate)}
                </span>
              </div>
              
              {/* System Role */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">System Role</span>
                </div>
                {employee.userId ? (
                  <div className="space-y-2">
                    {canChangeSystemRole ? (
                      rolesLoading ? (
                        <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading roles...</span>
                        </div>
                      ) : getFilteredRoles().length === 0 ? (
                        <Badge variant="secondary" className="text-sm">
                          {employee.systemRole?.name || 'Not Assigned'}
                        </Badge>
                      ) : (
                        <Select
                          value={selectedRoleId || employee.systemRole?.id || ''}
                          onValueChange={handleRoleChange}
                          disabled={isChangingRole}
                        >
                          <SelectTrigger className="w-full h-9">
                            {isChangingRole ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select role" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {getFilteredRoles().map((role) => (
                              <SelectItem 
                                key={role.id} 
                                value={role.id}
                                disabled={!isRoleSelectable(role.slug)}
                              >
                                {role.name}
                                {!isRoleSelectable(role.slug) && ' (cannot change)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    ) : (
                      <Badge variant="secondary" className="text-sm">
                        {employee.systemRole?.name || 'Not Assigned'}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No user account linked
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Card className="md:col-span-2">
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
              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      First Name
                    </label>
                    <p className="text-sm">{employee.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Last Name
                    </label>
                    <p className="text-sm">{employee.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Personal Email
                    </label>
                    <p className="text-sm">{employee.personalEmail || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Mobile
                    </label>
                    <p className="text-sm">
                      <PhoneDisplay value={employee.mobile} />
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <p className="text-sm">
                      {employee.dateOfBirth
                        ? formatDate(employee.dateOfBirth)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="text-sm">{employee.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Marital Status
                    </label>
                    <p className="text-sm">{employee.maritalStatus || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nationality
                    </label>
                    <p className="text-sm">{employee.nationality || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Blood Group
                    </label>
                    <p className="text-sm">{employee.bloodGroup || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Employment Tab */}
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Employee Code
                    </label>
                    <p className="text-sm">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Department
                    </label>
                    <p className="text-sm">{employee.department?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Designation
                    </label>
                    <p className="text-sm">{employee.designation?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Reporting Manager
                    </label>
                    <p className="text-sm">
                      {employee.reportingManager
                        ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Employment Type
                    </label>
                    <p className="text-sm">{employee.employmentType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Join Date
                    </label>
                    <p className="text-sm">
                      {formatDate(employee.joinDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Confirmation Date
                    </label>
                    <p className="text-sm">
                      {employee.confirmationDate ? formatDate(employee.confirmationDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Probation End Date
                    </label>
                    <p className="text-sm">
                      {employee.probationEndDate ? formatDate(employee.probationEndDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Work Location
                    </label>
                    <p className="text-sm">{employee.workLocation || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Work Shift
                    </label>
                    <p className="text-sm">{employee.workShift || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Timezone
                    </label>
                    <p className="text-sm">{employee.timezone}</p>
                  </div>
                  {canEdit && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Base Salary
                      </label>
                      <p className="text-sm">
                        {employee.baseSalary
                          ? `${employee.currency} ${employee.baseSalary.toLocaleString()}`
                          : '-'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4">
                {employee.addressLine1 || employee.city || employee.state || employee.country ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Address Line 1
                      </label>
                      <p className="text-sm">{employee.addressLine1 || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Address Line 2
                      </label>
                      <p className="text-sm">{employee.addressLine2 || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        City
                      </label>
                      <p className="text-sm">{employee.city || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        State
                      </label>
                      <p className="text-sm">{employee.state || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Country
                      </label>
                      <p className="text-sm">{employee.country || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Postal Code
                      </label>
                      <p className="text-sm">{employee.postalCode || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-muted-foreground mb-1">No address information</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Address details have not been added yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Emergency Contacts Tab */}
              <TabsContent value="emergency" className="space-y-4">
                {(employee as any).emergencyContacts?.length > 0 ? (
                  (employee as any).emergencyContacts.map((contact: any, index: number) => (
                    <div key={contact.id || index} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">
                        Contact {index + 1}
                        {contact.isPrimary && (
                          <Badge variant="secondary" className="ml-2">
                            Primary
                          </Badge>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Name
                          </label>
                          <p className="text-sm">{contact.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Relationship
                          </label>
                          <p className="text-sm">{contact.relationship}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Phone
                          </label>
                          <p className="text-sm">
                            <PhoneDisplay value={contact.phone} />
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Email
                          </label>
                          <p className="text-sm">{contact.email || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-muted-foreground mb-1">No emergency contacts</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Emergency contact information has not been added yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Bank Details Tab */}
              <TabsContent value="bank" className="space-y-4">
                {(employee as any).bankDetails?.length > 0 ? (
                  (employee as any).bankDetails.map((bank: any, index: number) => (
                    <div key={bank.id || index} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">
                        Bank Account {index + 1}
                        {bank.isPrimary && (
                          <Badge variant="secondary" className="ml-2">
                            Primary
                          </Badge>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Account Holder Name
                          </label>
                          <p className="text-sm">{bank.accountHolderName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Bank Name
                          </label>
                          <p className="text-sm">{bank.bankName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Branch Name
                          </label>
                          <p className="text-sm">{bank.branchName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Account Number
                          </label>
                          <p className="text-sm">{bank.accountNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Account Type
                          </label>
                          <p className="text-sm">{bank.accountType}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            IFSC Code
                          </label>
                          <p className="text-sm">{bank.ifscCode || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-muted-foreground mb-1">No bank details</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Bank account information has not been added yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-4">
                {(employee as any).educations?.length > 0 ? (
                  (employee as any).educations.map((edu: any, index: number) => (
                    <div key={edu.id || index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">
                            {edu.degree || edu.educationType}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {edu.institutionName}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {edu.enrollmentYear} - {edu.isOngoing ? 'Present' : edu.completionYear}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Field of Study
                          </label>
                          <p className="text-sm">{edu.fieldOfStudy || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Specialization
                          </label>
                          <p className="text-sm">{edu.specialization || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Grade
                          </label>
                          <p className="text-sm">
                            {edu.grade || edu.percentage ? `${edu.grade || edu.percentage}%` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Board/University
                          </label>
                          <p className="text-sm">{edu.boardUniversity || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <GraduationCap className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-muted-foreground mb-1">No education records</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Education history has not been added yet.
                    </p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
