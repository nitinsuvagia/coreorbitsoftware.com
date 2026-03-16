'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneDisplay } from '@/components/ui/phone-input';
import { getInitials, getStatusColor, getAvatarColor } from '@/lib/utils';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { useMyEmployee } from '@/hooks/use-employees';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import {
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  AlertCircle,
  GraduationCap,
  CreditCard,
  Lock,
  Loader2,
  CheckCircle2,
  Circle,
  ClipboardList,
} from 'lucide-react';

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (response.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(response.error?.message || 'Failed to change password');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your account password for security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 8 characters)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleChangePassword} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Password
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ProfilePage() {
  const { formatDate } = useOrgFormatters();
  const { data: employee, isLoading, error } = useMyEmployee();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
            <p className="text-muted-foreground">View your personal and employment information</p>
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
    const displayName = user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user?.email || 'User';
    const initials = getInitials(displayName);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
            <p className="text-muted-foreground">Your account information</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{displayName}</h3>
                  <p className="text-muted-foreground text-sm">
                    {(user?.roles?.[0] || 'user').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="md:col-span-2">
            <ChangePasswordCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">View your personal and employment information</p>
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
            </div>

            {/* Bio */}
            {employee.metadata?.bio && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Bio</p>
                <p className="text-sm mt-1">{employee.metadata.bio}</p>
              </div>
            )}

            {/* Employee Code */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Employee Code</p>
              <p className="text-sm font-medium">{employee.employeeCode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Card className="md:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-sm">{employee.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-sm">{employee.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Personal Email</label>
                    <p className="text-sm">{employee.personalEmail || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                    <p className="text-sm">
                      {employee.mobile ? <PhoneDisplay value={employee.mobile} /> : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">
                      {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-sm">{employee.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Marital Status</label>
                    <p className="text-sm">{employee.maritalStatus || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                    <p className="text-sm">{employee.nationality || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Blood Group</label>
                    <p className="text-sm">{employee.bloodGroup || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Employment Tab */}
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Employee Code</label>
                    <p className="text-sm">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Department</label>
                    <p className="text-sm">{employee.department?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Designation</label>
                    <p className="text-sm">{employee.designation?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reporting Manager</label>
                    <p className="text-sm">
                      {employee.reportingManager
                        ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                    <p className="text-sm">{employee.employmentType || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Join Date</label>
                    <p className="text-sm">{formatDate(employee.joinDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Confirmation Date</label>
                    <p className="text-sm">
                      {employee.confirmationDate ? formatDate(employee.confirmationDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Probation End Date</label>
                    <p className="text-sm">
                      {employee.probationEndDate ? formatDate(employee.probationEndDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Work Location</label>
                    <p className="text-sm">{employee.workLocation || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Work Shift</label>
                    <p className="text-sm">{employee.workShift || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                    <p className="text-sm">{employee.timezone || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4">
                {employee.addressLine1 || employee.city || employee.state || employee.country ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Address Line 1</label>
                      <p className="text-sm">{employee.addressLine1 || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Address Line 2</label>
                      <p className="text-sm">{employee.addressLine2 || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">City</label>
                      <p className="text-sm">{employee.city || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">State</label>
                      <p className="text-sm">{employee.state || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Country</label>
                      <p className="text-sm">{employee.country || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Postal Code</label>
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
                          <Badge variant="secondary" className="ml-2">Primary</Badge>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="text-sm">{contact.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                          <p className="text-sm">{contact.relationship}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-sm">
                            <PhoneDisplay value={contact.phone} />
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
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
                          <Badge variant="secondary" className="ml-2">Primary</Badge>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Account Holder Name</label>
                          <p className="text-sm">{bank.accountHolderName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                          <p className="text-sm">{bank.bankName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Branch Name</label>
                          <p className="text-sm">{bank.branchName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                          <p className="text-sm">{bank.accountNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                          <p className="text-sm">{bank.accountType || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">IFSC Code</label>
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
                          <h4 className="font-medium">{edu.degree || edu.educationType}</h4>
                          <p className="text-sm text-muted-foreground">{edu.institutionName}</p>
                        </div>
                        <Badge variant="outline">
                          {edu.enrollmentYear} - {edu.isOngoing ? 'Present' : edu.completionYear}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Field of Study</label>
                          <p className="text-sm">{edu.fieldOfStudy || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                          <p className="text-sm">{edu.specialization || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Grade</label>
                          <p className="text-sm">
                            {edu.grade || edu.percentage ? `${edu.grade || edu.percentage}%` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Board / University</label>
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

              {/* Onboarding Checklist Tab (read-only) */}
              <TabsContent value="onboarding" className="space-y-4">
                {employee?.id ? (
                  <ProfileOnboardingTab employeeId={employee.id} />
                ) : null}
              </TabsContent>

            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Password Change Section */}
      <ChangePasswordCard />
    </div>
  );
}

// ── Read-only Onboarding Checklist for employee self-view ────────────────────

const PROFILE_CATEGORY_LABELS: Record<string, string> = {
  DOCUMENTATION: 'Documentation',
  PAYROLL: 'Payroll',
  IT_SETUP: 'IT Setup',
  COMPLIANCE: 'Compliance',
  TRAINING: 'Training',
  TEAM_INTRO: 'Team Introduction',
  WORKSPACE: 'Workspace',
  OTHER: 'Other',
};

interface ProfileChecklistTask {
  id: string;
  title: string;
  description: string;
  category: string;
  dueDay: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
}

function ProfileOnboardingTab({ employeeId }: { employeeId: string }) {
  const [tasks, setTasks] = useState<ProfileChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ tasks: ProfileChecklistTask[]; completedCount: number; totalCount: number; progressPercent: number }>(
        `/api/v1/employees/${employeeId}/onboarding-checklist`
      );
      if (res.success && res.data) {
        setTasks(res.data.tasks);
        setProgress(res.data.progressPercent);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchChecklist(); }, [fetchChecklist]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const grouped = tasks.reduce<Record<string, ProfileChecklistTask[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/40">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{completedCount} / {tasks.length} tasks completed</span>
        </div>
        <div className="flex-1 max-w-[200px]">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>

      {/* Task groups */}
      {Object.entries(grouped).map(([category, catTasks]) => (
        <div key={category} className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
            {PROFILE_CATEGORY_LABELS[category] ?? category}
          </h4>
          <div className="rounded-md border divide-y">
            {catTasks.map(task => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}
              >
                <div className="mt-0.5 shrink-0">
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] hidden sm:flex">
                  Day {task.dueDay}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
