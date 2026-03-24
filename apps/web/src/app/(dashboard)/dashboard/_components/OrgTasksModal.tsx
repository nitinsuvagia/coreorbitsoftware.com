'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
  X,
  Flag,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  fetchOrgTodos,
  searchEmployees,
  type Todo,
  type OrgTodoFilters,
  type EmployeeSearchResult,
} from '@/lib/api/dashboard';
import { format } from 'date-fns';

// ============================================================================
// HELPERS
// ============================================================================

const PRIORITY_CONFIG = {
  LOW:    { label: 'Low',    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', order: 4 },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100  text-blue-700  dark:bg-blue-900  dark:text-blue-300', order: 3 },
  HIGH:   { label: 'High',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', order: 2 },
  URGENT: { label: 'Urgent', color: 'bg-red-100   text-red-700   dark:bg-red-900   dark:text-red-300', order: 1 },
} as const;

type SortField = 'dueDate' | 'priority' | 'title' | 'status' | 'assignee' | 'creator';
type SortDir = 'asc' | 'desc';
type SortConfig = { field: SortField; dir: SortDir };

// Custom status sort order: PENDING first, then IN_PROGRESS, COMPLETED, CANCELLED
const STATUS_ORDER: Record<string, number> = {
  PENDING:     1,
  IN_PROGRESS: 2,
  COMPLETED:   3,
  CANCELLED:   4,
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:     <Circle      className="h-3.5 w-3.5 text-slate-400" />,
  IN_PROGRESS: <Clock       className="h-3.5 w-3.5 text-blue-500" />,
  COMPLETED:   <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  CANCELLED:   <Ban         className="h-3.5 w-3.5 text-red-400" />,
};

function formatDueDate(date?: string) {
  if (!date) return null;
  try {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(d);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
    if (diffDays === 0) return { label: 'Today', overdue: false };
    if (diffDays === 1) return { label: 'Tomorrow', overdue: false };
    return { label: format(d, 'MMM d, yyyy'), overdue: false };
  } catch {
    return null;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

interface OrgTasksModalProps {
  open: boolean;
  onClose: () => void;
}

export function OrgTasksModal({ open, onClose }: OrgTasksModalProps) {
  // ---- Filter state --------------------------------------------------------
  const [search, setSearch]             = useState('');
  const [priority, setPriority]         = useState('');
  const [status, setStatus]             = useState('');
  const [dueDateFrom, setDueDateFrom]   = useState('');
  const [dueDateTo, setDueDateTo]       = useState('');
  const [page, setPage]                 = useState(1);

  // ---- Sorting state (default: Pending first, then Due Date asc, then Priority) -----------
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { field: 'status',   dir: 'asc' },
    { field: 'dueDate',  dir: 'asc' },
    { field: 'priority', dir: 'asc' },
  ]);

  // ---- Employee picker state -----------------------------------------------
  const [empSearch, setEmpSearch]               = useState('');
  const [empSuggestions, setEmpSuggestions]     = useState<EmployeeSearchResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [showEmpDropdown, setShowEmpDropdown]   = useState(false);
  const [loadingEmp, setLoadingEmp]             = useState(false);
  const empDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Data state ----------------------------------------------------------
  const [todos, setTodos]                 = useState<Todo[]>([]);
  const [pagination, setPagination]       = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading]             = useState(false);

  // ---- Sorting logic -------------------------------------------------------
  function toggleSort(field: SortField) {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.field === field);
      if (existing) {
        // Cycle: asc -> desc -> remove
        if (existing.dir === 'asc') {
          return prev.map((s) => (s.field === field ? { ...s, dir: 'desc' as SortDir } : s));
        } else {
          return prev.filter((s) => s.field !== field);
        }
      } else {
        // Add new sort field
        return [...prev, { field, dir: 'asc' }];
      }
    });
  }

  function getSortIcon(field: SortField) {
    const s = sortConfig.find((c) => c.field === field);
    if (!s) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return s.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  function getSortIndex(field: SortField): number | null {
    const idx = sortConfig.findIndex((c) => c.field === field);
    return idx >= 0 ? idx + 1 : null;
  }

  // Sort todos client-side
  const sortedTodos = [...todos].sort((a, b) => {
    for (const { field, dir } of sortConfig) {
      let cmp = 0;
      switch (field) {
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = aDate - bDate;
          break;
        }
        case 'priority': {
          const aOrder = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 99;
          const bOrder = PRIORITY_CONFIG[b.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 99;
          cmp = aOrder - bOrder;
          break;
        }
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'status': {
          const aOrder = STATUS_ORDER[a.status || ''] ?? 99;
          const bOrder = STATUS_ORDER[b.status || ''] ?? 99;
          cmp = aOrder - bOrder;
          break;
        }
        case 'assignee':
          cmp = (a.assigneeName || '').localeCompare(b.assigneeName || '');
          break;
        case 'creator':
          cmp = (a.creatorName || '').localeCompare(b.creatorName || '');
          break;
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });

  // ---- Load todos ----------------------------------------------------------
  const loadTodos = useCallback(async (filters: OrgTodoFilters) => {
    setLoading(true);
    try {
      const data = await fetchOrgTodos(filters);
      setTodos(data.items);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when any filter or page changes
  useEffect(() => {
    if (!open) return;
    const filters: OrgTodoFilters = {
      page,
      limit: 20,
      ...(search      ? { search }      : {}),
      ...(selectedEmployee?.userId ? { userId: selectedEmployee.userId } : {}),
      ...(priority    ? { priority }    : {}),
      ...(status      ? { status }      : {}),
      ...(dueDateFrom ? { dueDateFrom } : {}),
      ...(dueDateTo   ? { dueDateTo }   : {}),
    };
    loadTodos(filters);
  }, [open, page, search, selectedEmployee, priority, status, dueDateFrom, dueDateTo, loadTodos]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, selectedEmployee, priority, status, dueDateFrom, dueDateTo]);

  // Reset state when dialog closed
  useEffect(() => {
    if (!open) {
      setSearch('');
      setPriority('');
      setStatus('');
      setDueDateFrom('');
      setDueDateTo('');
      setEmpSearch('');
      setSelectedEmployee(null);
      setEmpSuggestions([]);
      setPage(1);
      setSortConfig([{ field: 'dueDate', dir: 'asc' }, { field: 'priority', dir: 'asc' }]);
    }
  }, [open]);

  // ---- Employee autocomplete -----------------------------------------------
  function handleEmpSearchChange(val: string) {
    setEmpSearch(val);
    setShowEmpDropdown(true);
    if (empDebounce.current) clearTimeout(empDebounce.current);
    if (!val.trim()) {
      setEmpSuggestions([]);
      setSelectedEmployee(null);
      return;
    }
    empDebounce.current = setTimeout(async () => {
      setLoadingEmp(true);
      try {
        const results = await searchEmployees(val);
        setEmpSuggestions(results);
      } finally {
        setLoadingEmp(false);
      }
    }, 300);
  }

  function selectEmployee(emp: EmployeeSearchResult) {
    setSelectedEmployee(emp);
    setEmpSearch(emp.displayName || `${emp.firstName} ${emp.lastName}`);
    setEmpSuggestions([]);
    setShowEmpDropdown(false);
  }

  function clearEmployee() {
    setSelectedEmployee(null);
    setEmpSearch('');
    setEmpSuggestions([]);
  }

  // ---- Render --------------------------------------------------------------
  const totalText = loading
    ? '…'
    : pagination.total === 0
    ? 'No tasks'
    : `${pagination.total} task${pagination.total === 1 ? '' : 's'}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CheckSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Organisation Tasks</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{totalText}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Filters row */}
        <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex flex-wrap gap-2 items-end">
            {/* Task search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            {/* Employee filter (autocomplete) */}
            <div className="relative min-w-[180px]">
              {selectedEmployee ? (
                <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-background text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[120px]">
                    {selectedEmployee.displayName || `${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                  </span>
                  <button onClick={clearEmployee} className="ml-auto text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by employee…"
                    value={empSearch}
                    onChange={(e) => handleEmpSearchChange(e.target.value)}
                    onFocus={() => empSearch && setShowEmpDropdown(true)}
                    onBlur={() => setTimeout(() => setShowEmpDropdown(false), 150)}
                    className="pl-8 h-9 text-sm"
                  />
                </>
              )}
              {showEmpDropdown && empSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {loadingEmp && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                  )}
                  {empSuggestions.map((emp) => (
                    <button
                      key={emp.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                      onMouseDown={() => selectEmployee(emp)}
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex flex-col">
                        <span className="font-medium leading-tight">
                          {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                        </span>
                        {(emp.designation as any)?.name && (
                          <span className="text-[11px] text-muted-foreground leading-tight">
                            {(emp.designation as any).name}
                            {(emp.department as any)?.name ? ` · ${(emp.department as any).name}` : ''}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <Select value={priority || 'all'} onValueChange={(v) => setPriority(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm w-[130px]">
                <Flag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending / Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={dueDateFrom}
                onChange={(e) => setDueDateFrom(e.target.value)}
                className="h-9 text-sm w-[130px]"
                title="Due date from"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={dueDateTo}
                onChange={(e) => setDueDateTo(e.target.value)}
                className="h-9 text-sm w-[130px]"
                title="Due date to"
              />
            </div>

            {/* Clear filters */}
            {(search || selectedEmployee || priority || status || dueDateFrom || dueDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => {
                  setSearch('');
                  clearEmployee();
                  setPriority('');
                  setStatus('');
                  setDueDateFrom('');
                  setDueDateTo('');
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
              <tr>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[38%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('title')}
                >
                  <span className="flex items-center gap-1.5">
                    Task {getSortIcon('title')}
                    {getSortIndex('title') && <span className="text-[10px] text-primary">({getSortIndex('title')})</span>}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[16%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('creator')}
                >
                  <span className="flex items-center gap-1.5">
                    Creator {getSortIcon('creator')}
                    {getSortIndex('creator') && <span className="text-[10px] text-primary">({getSortIndex('creator')})</span>}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[16%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('assignee')}
                >
                  <span className="flex items-center gap-1.5">
                    Assignee {getSortIcon('assignee')}
                    {getSortIndex('assignee') && <span className="text-[10px] text-primary">({getSortIndex('assignee')})</span>}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[10%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('priority')}
                >
                  <span className="flex items-center gap-1.5">
                    Priority {getSortIcon('priority')}
                    {getSortIndex('priority') && <span className="text-[10px] text-primary">({getSortIndex('priority')})</span>}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[12%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('dueDate')}
                >
                  <span className="flex items-center gap-1.5">
                    Due Date {getSortIcon('dueDate')}
                    {getSortIndex('dueDate') && <span className="text-[10px] text-primary">({getSortIndex('dueDate')})</span>}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[9%] cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => toggleSort('status')}
                >
                  <span className="flex items-center gap-1.5">
                    Status {getSortIcon('status')}
                    {getSortIndex('status') && <span className="text-[10px] text-primary">({getSortIndex('status')})</span>}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                </tr>
              ))}

              {!loading && todos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">No tasks match the current filters.</p>
                  </td>
                </tr>
              )}

              {!loading && sortedTodos.map((todo) => {
                const pc   = PRIORITY_CONFIG[todo.priority as keyof typeof PRIORITY_CONFIG];
                const due  = formatDueDate(todo.dueDate);
                const statusIcon = STATUS_ICON[todo.status] ?? STATUS_ICON.PENDING;

                return (
                  <tr key={todo.id} className={`hover:bg-muted/40 transition-colors ${todo.isCompleted ? 'opacity-60' : ''}`}>
                    {/* Task title */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">{statusIcon}</span>
                        <div className="min-w-0">
                          <p className={`font-medium truncate leading-snug ${todo.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </p>
                          {todo.category && (
                            <span className="text-[11px] text-muted-foreground capitalize">{todo.category}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground truncate block max-w-[110px]">
                        {todo.creatorName || '—'}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      {todo.assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                              {todo.assigneeName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm truncate max-w-[90px]">{todo.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      {pc ? (
                        <Badge className={`text-[11px] px-2 py-0.5 font-medium border-0 ${pc.color}`}>
                          {pc.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3">
                      {due ? (
                        <span className={`text-xs ${due.overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          {due.overdue && <AlertCircle className="h-3 w-3 inline mr-1 text-red-500" />}
                          {due.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize text-muted-foreground">
                        {todo.isCompleted
                          ? 'Done'
                          : todo.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total} tasks
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
