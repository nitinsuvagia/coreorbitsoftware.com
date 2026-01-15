'use client';

import { useState } from 'react';
import { useEmployees, useDepartments, Employee } from '@/hooks/use-employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials, getStatusColor } from '@/lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Building,
  Filter,
  Sparkles,
  Download,
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);

  const { data: employeesData, isLoading } = useEmployees({
    search,
    department,
    page,
    limit: 12,
  });

  const { data: departments } = useDepartments();

  const employees = employeesData?.items || [];
  const totalPages = employeesData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage your organization's employees
          </p>
        </div>
        <Button asChild>
          <Link href="/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {department || 'All Departments'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDepartment('')}>
              All Departments
            </DropdownMenuItem>
            {departments?.map((dept) => (
              <DropdownMenuItem
                key={dept.id}
                onClick={() => setDepartment(dept.name)}
              >
                {dept.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Sparkles className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Employees Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Start building your team by adding employee profiles. Track their information, 
              roles, and manage your workforce efficiently.
            </p>
            <Button asChild size="lg">
              <Link href="/employees/new">
                <Plus className="mr-2 h-4 w-4" />
                Add First Employee
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((employee: Employee) => (
            <Card key={employee.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/employees/${employee.id}`}>View Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/employees/${employee.id}/360`}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          360° View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/employees/${employee.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col items-center gap-3 -mt-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback>
                      {getInitials(`${employee.firstName} ${employee.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="font-semibold hover:underline"
                    >
                      {employee.firstName} {employee.lastName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {employee.designation?.name || employee.employmentType}
                    </p>
                  </div>
                  <Badge className={getStatusColor(employee.status)}>
                    {employee.status}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span>{employee.department.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
