'use client';

import { useParams } from 'next/navigation';
import { useEmployee } from '@/hooks/use-employees';
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
import { getInitials, getStatusColor } from '@/lib/utils';
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
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const { data: employee, isLoading, error } = useEmployee(employeeId);

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
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
          <Button asChild>
            <Link href={`/employees/${employee.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Employee
            </Link>
          </Button>
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
                <AvatarFallback className="text-2xl">
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
                  <span className="text-sm">{employee.phone}</span>
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
                  Joined {new Date(employee.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Card className="md:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
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
                    <p className="text-sm">{employee.mobile || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <p className="text-sm">
                      {employee.dateOfBirth
                        ? new Date(employee.dateOfBirth).toLocaleDateString()
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
                      {new Date(employee.joinDate).toLocaleDateString()}
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
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4">
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
                          <p className="text-sm">{contact.phone}</p>
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
                  <p className="text-muted-foreground text-center py-8">
                    No emergency contacts added
                  </p>
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
                  <p className="text-muted-foreground text-center py-8">
                    No education records added
                  </p>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
