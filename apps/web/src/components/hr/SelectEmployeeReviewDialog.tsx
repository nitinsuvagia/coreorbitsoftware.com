'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WriteReviewDialog } from './WriteReviewDialog';
import { Search, User, ClipboardList } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;
  avatar?: string;
  phone?: string;
  mobile?: string;
  department?: { name: string } | null;
  designation?: { name: string } | null;
}

interface SelectEmployeeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SelectEmployeeReviewDialog({
  open,
  onOpenChange,
  onSuccess,
}: SelectEmployeeReviewDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWriteReview, setShowWriteReview] = useState(false);

  // Fetch employees
  useEffect(() => {
    if (open && !showWriteReview) {
      fetchEmployees();
    }
  }, [open, showWriteReview]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ items: Employee[]; total: number }>(
        '/api/v1/employees?limit=500&excludeStatuses=TERMINATED,RESIGNED,RETIRED&sortBy=employeeCode&sortOrder=asc'
      );
      if (response.success && response.data?.items) {
        setEmployees(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;
    
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const reverseFullName = `${emp.lastName} ${emp.firstName}`.toLowerCase();
    
    return (
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      reverseFullName.includes(searchLower) ||
      emp.employeeCode?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.phone?.toLowerCase().includes(searchLower) ||
      emp.mobile?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowWriteReview(true);
  };

  const handleWriteReviewClose = (open: boolean) => {
    if (!open) {
      setShowWriteReview(false);
      setSelectedEmployee(null);
    }
  };

  const handleWriteReviewSuccess = () => {
    setShowWriteReview(false);
    setSelectedEmployee(null);
    onOpenChange(false);
    onSuccess?.();
  };

  // Show WriteReviewDialog if employee is selected
  if (showWriteReview && selectedEmployee) {
    return (
      <WriteReviewDialog
        open={true}
        onOpenChange={handleWriteReviewClose}
        employee={selectedEmployee}
        onSuccess={handleWriteReviewSuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Write Performance Review
          </DialogTitle>
          <DialogDescription>
            Select an employee to write a performance review for.
          </DialogDescription>
        </DialogHeader>

        <Command className="rounded-none border-0 flex-1 flex flex-col overflow-hidden">
          <CommandInput
            placeholder="Search employees by name, email, code, phone..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <CommandEmpty>
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2" />
                  <p>No employees found</p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredEmployees.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={`${employee.firstName} ${employee.lastName} ${employee.email}`}
                    onSelect={() => handleSelectEmployee(employee)}
                    className="cursor-pointer p-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>
                          {getInitials(`${employee.firstName} ${employee.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {employee.firstName} {employee.lastName}
                          </span>
                          {employee.employeeCode && (
                            <Badge variant="outline" className="text-xs">
                              {employee.employeeCode}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {employee.designation?.name && (
                            <span className="truncate">{employee.designation.name}</span>
                          )}
                          {employee.designation?.name && employee.department?.name && (
                            <span>•</span>
                          )}
                          {employee.department?.name && (
                            <span className="truncate">{employee.department.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
