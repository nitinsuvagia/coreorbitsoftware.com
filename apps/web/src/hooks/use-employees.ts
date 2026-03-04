import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/lib/api/client';

// Employee types
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  department?: { id: string; name: string };
  designation?: { id: string; name: string };
  reportingManager?: { id: string; firstName: string; lastName: string; email: string };
  status: string;
  employmentType: string;
  joinDate: string;
  confirmationDate?: string;
  probationEndDate?: string;
  exitDate?: string;
  exitReason?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  workLocation?: string;
  workShift?: string;
  timezone: string;
  baseSalary?: number;
  currency: string;
  emergencyContacts?: any[];
  bankDetails?: any[];
  educations?: any[];
  userId?: string;
  systemRole?: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  departmentId?: string;
  designationId?: string;
  status?: string;
  statuses?: string;  // comma-separated list of statuses to include
  excludeStatuses?: string;  // comma-separated list of statuses to exclude
  employmentType?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper to filter out undefined values from object
function cleanFilters<T extends Record<string, any>>(filters: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
  ) as Partial<T>;
}

// Employees
export function useEmployees(filters: EmployeeFilters = {}) {
  const cleanedFilters = cleanFilters(filters);
  return useQuery({
    queryKey: ['employees', cleanedFilters],
    queryFn: () => get<PaginatedResponse<Employee>>('/api/v1/employees', cleanedFilters),
  });
}

// Status counts for tabs
export interface EmployeeStatusCounts {
  current: number;
  probation: number;
  relieving: number;
  exEmployees: number;
}

export function useEmployeeStatusCounts() {
  return useQuery({
    queryKey: ['employee-status-counts'],
    queryFn: () => get<EmployeeStatusCounts>('/api/v1/employees/status-counts'),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => get<Employee>(`/api/v1/employees/${id}`),
    enabled: !!id,
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: ['employee', 'me'],
    queryFn: () => get<Employee>('/api/v1/employees/me'),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Employee>) => post<Employee>('/api/v1/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      put<Employee>(`/api/v1/employees/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/v1/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// Departments
export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  managerId?: string;
  manager?: { firstName: string; lastName: string };
  employeeCount: number;
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => get<Department[]>('/api/v1/employees/departments'),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Department>) => post<Department>('/api/v1/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

// Designations
export interface Designation {
  id: string;
  name: string;
  level: number;
  departmentId?: string;
}

export function useDesignations() {
  return useQuery({
    queryKey: ['designations'],
    queryFn: () => get<Designation[]>('/api/v1/employees/designations'),
  });
}
