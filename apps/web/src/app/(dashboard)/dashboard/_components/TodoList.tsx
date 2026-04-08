'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ListTodo,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  UserPlus,
  X,
  User,
  Maximize2,
  Minimize2,
  LogIn,
  LogOut,
  Timer,
  History,
} from 'lucide-react';
import { useMyAttendance, useCheckIn, useCheckOut } from '@/hooks/use-attendance';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { getTodayInTimezone } from '@/lib/format';
import { formatDate, formatTime } from '@/lib/utils';
import {
  SessionHistoryDialog,
  getTotalWorkedSeconds,
  formatWorkedSeconds,
  formatElapsedHMS,
} from '@/components/attendance/session-history-dialog';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  searchEmployees,
  Todo,
  TodoPriority,
  TodosResponse,
  CreateTodoInput,
  EmployeeSearchResult,
} from '@/lib/api/dashboard';
import { format, parseISO, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TodoListProps {
  loading?: boolean;
  onTaskChange?: () => void;
  firstName?: string;
}

const priorityConfig: Record<TodoPriority, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  MEDIUM: { label: 'Medium', color: 'text-blue-500', bgColor: 'bg-blue-100' },
  HIGH: { label: 'High', color: 'text-orange-500', bgColor: 'bg-orange-100' },
  URGENT: { label: 'Urgent', color: 'text-red-500', bgColor: 'bg-red-100' },
};

function formatDueDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

function isOverdue(todo: Todo): boolean {
  if (todo.isCompleted || !todo.dueDate) return false;
  try {
    // A task is overdue only if its due date is before today (not today itself)
    return isBefore(parseISO(todo.dueDate), startOfDay(new Date()));
  } catch {
    return false;
  }
}

interface TodoItemProps {
  todo: Todo;
  currentUserId?: string;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, currentUserId, onToggle, onEdit, onDelete }: TodoItemProps) {
  const priority = priorityConfig[todo.priority] || priorityConfig.MEDIUM;
  const overdue = isOverdue(todo);
  const isAssignedToMe = !!todo.assigneeId && todo.assigneeId === currentUserId && todo.userId !== currentUserId;
  const isAssignedByMe = !!todo.assigneeId && todo.userId === currentUserId;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-colors group",
      todo.isCompleted ? "opacity-60" : "hover:bg-muted/50",
      overdue && !todo.isCompleted && "bg-red-50 dark:bg-red-950/20"
    )}>
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={todo.isCompleted}
          onCheckedChange={() => onToggle(todo.id)}
          className="h-5 w-5"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className={cn(
              "font-medium break-words",
              todo.isCompleted && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </span>
            <Badge 
              variant="outline" 
              className={cn("text-xs shrink-0", priority.color)}
            >
              {priority.label}
            </Badge>
          </div>
          {/* Due Date - Always visible */}
          <span className={cn(
            "flex items-center gap-1 text-xs shrink-0 whitespace-nowrap",
            todo.dueDate
              ? overdue && !todo.isCompleted
                ? "text-red-500 font-medium"
                : "text-muted-foreground"
              : "text-muted-foreground/50"
          )}>
            {overdue && !todo.isCompleted ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3" />
            )}
            {todo.dueDate ? formatDueDate(todo.dueDate) : 'No deadline'}
          </span>
        </div>

        {todo.description && (
          <p className={cn(
            "text-sm text-muted-foreground break-words mt-0.5",
            todo.isCompleted && "line-through"
          )}>
            {todo.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {todo.category && (
            <Badge variant="secondary" className="text-xs">
              {todo.category}
            </Badge>
          )}
          {/* Assignee badge: shown on creator's side */}
          {isAssignedByMe && todo.assigneeName && (
            <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 bg-purple-50 flex items-center gap-1">
              <User className="h-3 w-3" />
              → {todo.assigneeName}
            </Badge>
          )}
          {/* "Assigned by" badge: shown on assignee's side */}
          {isAssignedToMe && todo.creatorName && (
            <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50 flex items-center gap-1">
              <UserPlus className="h-3 w-3" />
              by {todo.creatorName}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Only the creator can edit/delete */}
          {!isAssignedToMe && (
            <DropdownMenuItem onClick={() => onEdit(todo)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {!isAssignedToMe && <DropdownMenuSeparator />}
          {!isAssignedToMe && (
            <DropdownMenuItem 
              onClick={() => onDelete(todo.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
          {isAssignedToMe && (
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              Assigned to you — read only
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface TodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo?: Todo | null;
  onSave: (input: CreateTodoInput) => Promise<void>;
}

function TodoDialog({ open, onOpenChange, todo, onSave }: TodoDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Assignee state
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeSuggestions, setAssigneeSuggestions] = useState<EmployeeSearchResult[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<EmployeeSearchResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description || '');
        setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
        setPriority(todo.priority);
        setCategory(todo.category || '');
        if (todo.assigneeName) {
          setAssigneeSearch(todo.assigneeName);
          setSelectedAssignee({ id: '', userId: todo.assigneeId, firstName: '', lastName: '', displayName: todo.assigneeName, email: '' });
        } else {
          setAssigneeSearch('');
          setSelectedAssignee(null);
        }
      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('MEDIUM');
        setCategory('');
        setAssigneeSearch('');
        setSelectedAssignee(null);
      }
      setShowSuggestions(false);
      setAssigneeSuggestions([]);
    }
  }, [open, todo]);

  const handleAssigneeSearch = (value: string) => {
    setAssigneeSearch(value);
    setSelectedAssignee(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setAssigneeSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setLoadingAssignees(true);
      try {
        const results = await searchEmployees(value);
        setAssigneeSuggestions(results);
        setShowSuggestions(true);
      } finally {
        setLoadingAssignees(false);
      }
    }, 300);
  };

  const handleSelectAssignee = (emp: EmployeeSearchResult) => {
    setSelectedAssignee(emp);
    setAssigneeSearch(emp.displayName);
    setShowSuggestions(false);
    setAssigneeSuggestions([]);
  };

  const handleClearAssignee = () => {
    setSelectedAssignee(null);
    setAssigneeSearch('');
    setShowSuggestions(false);
    setAssigneeSuggestions([]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      // When editing: send null to explicitly clear assignee; when creating: omit if none selected
      const assigneeId = selectedAssignee?.userId
        ? selectedAssignee.userId
        : todo
          ? null       // editing with no assignee = clear it
          : undefined; // creating with no assignee = leave unset
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        priority,
        category: category.trim() || undefined,
        assigneeId,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save todo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{todo ? 'Edit Todo' : 'Add New Todo'}</DialogTitle>
          <DialogDescription>
            {todo ? 'Update your task details' : 'Create a new task to track'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
            />
          </div>

          {/* Assign to — employee search */}
          <div className="grid gap-2">
            <Label htmlFor="assignee" className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              Assign to (optional)
            </Label>
            <div className="relative">
              {selectedAssignee ? (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-purple-50 border-purple-200">
                  <User className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-purple-700">{selectedAssignee.displayName}</span>
                  <button type="button" onClick={handleClearAssignee} className="text-purple-400 hover:text-purple-700 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Input
                  id="assignee"
                  value={assigneeSearch}
                  onChange={(e) => handleAssigneeSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => assigneeSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search employee name..."
                  autoComplete="off"
                />
              )}
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {loadingAssignees ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                  ) : assigneeSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No employees found</div>
                  ) : (
                    assigneeSuggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={() => handleSelectAssignee(emp)}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                      >
                        <div className="font-medium text-sm">{emp.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.designation?.name}{emp.department?.name ? ` · ${emp.department.name}` : ''}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TodoPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., work, personal, meeting"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : todo ? 'Update' : 'Add Todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// FULLSCREEN CHECK-IN CARD (self-contained for expanded overlay)
// ============================================================================

function ExpandedCheckInCard() {
  const { timezone } = useOrgSettings();
  const today = getTodayInTimezone(timezone);
  const { data: myAttendanceData } = useMyAttendance({
    startDate: today,
    endDate: today,
    limit: 10,
  });
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayItems = myAttendanceData?.items || [];
  const todayRecord = todayItems.find((r: any) => r.checkIn && !r.checkOut) || todayItems[0] || null;
  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const hasAnySessions = todayItems.length > 0;

  const [totalElapsed, setTotalElapsed] = useState(0);
  useEffect(() => {
    function tick() {
      setTotalElapsed(getTotalWorkedSeconds(todayItems));
    }
    tick();
    if (isCheckedIn) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [todayItems, isCheckedIn]);

  async function handleCheckIn() {
    try {
      await checkInMutation.mutateAsync({});
      toast.success('Checked in successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to check in';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check in');
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMutation.mutateAsync({});
      toast.success('Checked out successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to check out';
      toast.error(typeof msg === 'string' ? msg : 'Failed to check out');
    }
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date())}
            </p>
            {!hasAnySessions && (
              <h3 className="text-2xl font-bold">You haven&apos;t checked in yet</h3>
            )}
            {isCheckedIn && todayRecord && (
              <>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Checked in at {formatTime(todayRecord.checkIn!)}
                </h3>
                <div className="flex items-center gap-2 text-lg font-mono tabular-nums text-primary">
                  <Timer className="h-4 w-4 animate-pulse" />
                  {formatElapsedHMS(totalElapsed)}
                  <span className="text-xs font-sans text-muted-foreground ml-1">total today</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Remember to check out before you leave
                </p>
              </>
            )}
            {hasAnySessions && !isCheckedIn && (
              <>
                <h3 className="text-2xl font-bold">
                  Worked for {formatWorkedSeconds(totalElapsed)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {todayItems.length} session{todayItems.length !== 1 ? 's' : ''} today
                </p>
              </>
            )}
            {hasAnySessions && (
              <SessionHistoryDialog>
                <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  <History className="h-3 w-3" />
                  View all sessions
                </button>
              </SessionHistoryDialog>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={isCheckedIn || checkInMutation.isPending}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </Button>
            <Button
              size="lg"
              variant={isCheckedIn ? 'default' : 'outline'}
              onClick={handleCheckOut}
              disabled={!isCheckedIn || checkOutMutation.isPending}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FULLSCREEN EXPANDED OVERLAY
// ============================================================================

interface ExpandedTasksOverlayProps {
  firstName?: string;
  todos: Todo[];
  summary?: TodosResponse['summary'];
  currentUserId?: string;
  isLoading: boolean;
  error: string | null;
  quickAddValue: string;
  quickAddAssignee: EmployeeSearchResult | null;
  quickAddRef: React.RefObject<HTMLInputElement | null>;
  showMentionDropdown: boolean;
  loadingMention: boolean;
  mentionSuggestions: EmployeeSearchResult[];
  onQuickAddChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuickAddKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMentionBlur: () => void;
  selectMentionEmployee: (emp: EmployeeSearchResult) => void;
  clearQuickAddAssignee: () => void;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onAddClick: () => void;
  onShowCompleted: () => void;
  onClose: () => void;
}

function ExpandedTasksOverlay({
  firstName,
  todos,
  summary,
  currentUserId,
  isLoading,
  error,
  quickAddValue,
  quickAddAssignee,
  quickAddRef,
  showMentionDropdown,
  loadingMention,
  mentionSuggestions,
  onQuickAddChange,
  onQuickAddKeyDown,
  onMentionBlur,
  selectMentionEmployee,
  clearQuickAddAssignee,
  onToggle,
  onEdit,
  onDelete,
  onRefresh,
  onAddClick,
  onShowCompleted,
  onClose,
}: ExpandedTasksOverlayProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Full-screen container with padding */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {firstName}!
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s your personal dashboard for today.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Exit full screen"
            className="shrink-0"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Check In / Check Out */}
        <ExpandedCheckInCard />

        {/* My Tasks — full width and remaining height */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                My Tasks
                {summary && summary.pending > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {summary.pending} pending
                  </Badge>
                )}
                {summary && summary.overdue > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {summary.overdue} overdue
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Your personal to-do list
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onAddClick}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} title="Exit full screen">
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {/* Quick Add */}
            <div className="mb-4">
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={quickAddRef}
                  value={quickAddValue}
                  onChange={onQuickAddChange}
                  onKeyDown={onQuickAddKeyDown}
                  onBlur={onMentionBlur}
                  placeholder="Add a task… type @ to assign to someone"
                  className={cn(
                    'pl-9 pr-3',
                    quickAddAssignee && 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-200 dark:ring-purple-800'
                  )}
                  autoComplete="off"
                />

                {showMentionDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {loadingMention ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Searching employees…
                      </div>
                    ) : mentionSuggestions.length === 0 ? (
                      <div className="px-3 py-2.5 text-sm text-muted-foreground">
                        {quickAddValue.match(/@(\S+)$/)?.[1]
                          ? 'No employees found'
                          : 'Type a name after @'}
                      </div>
                    ) : (
                      mentionSuggestions.map((emp) => {
                        const name = emp.displayName || `${emp.firstName} ${emp.lastName}`;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={() => selectMentionEmployee(emp)}
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2.5"
                          >
                            <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight truncate">{name}</p>
                              {((emp.designation as any)?.name || (emp.department as any)?.name) && (
                                <p className="text-xs text-muted-foreground leading-tight">
                                  {(emp.designation as any)?.name}
                                  {(emp.department as any)?.name ? ` · ${(emp.department as any).name}` : ''}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {quickAddAssignee && (
                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                  <span className="text-xs text-muted-foreground">Assign to:</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                    <User className="h-3 w-3" />
                    {quickAddAssignee.displayName ||
                      `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`}
                    <button
                      type="button"
                      onClick={clearQuickAddAssignee}
                      className="ml-0.5 hover:text-purple-900 dark:hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Task List — full height in expanded mode */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-400" />
                <p className="text-red-500">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={onRefresh}>
                  Try Again
                </Button>
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                <p>All tasks completed!</p>
                <p className="text-sm mt-1">Add a new task to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-480px)] pr-4">
                <div className="space-y-1">
                  {todos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      currentUserId={currentUserId}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Summary */}
            {!isLoading && !error && summary && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Circle className="h-3 w-3 text-blue-500" />
                    {summary.pending} pending
                  </span>
                  <button
                    onClick={onShowCompleted}
                    className="flex items-center gap-1 hover:text-green-600 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {summary.completed} completed
                  </button>
                </div>
                {summary.overdue > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <Clock className="h-3 w-3" />
                    {summary.overdue} overdue
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function TodoList({ loading: externalLoading, onTaskChange, firstName }: TodoListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [todosData, setTodosData] = useState<TodosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // @mention assignee state for quick-add
  const [quickAddAssignee, setQuickAddAssignee] = useState<EmployeeSearchResult | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<EmployeeSearchResult[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [loadingMention, setLoadingMention] = useState(false);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodos({ completed: false, pageSize: 20 });
      setTodosData(data);
    } catch (err) {
      setError('Failed to load todos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompletedTodos = useCallback(async () => {
    setLoadingCompleted(true);
    try {
      const data = await getTodos({ completed: true, pageSize: 50 });
      setCompletedTodos(data.todos || []);
    } catch (err) {
      console.error('Failed to load completed todos:', err);
      toast.error('Failed to load completed tasks');
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  const handleShowCompleted = () => {
    setCompletedDialogOpen(true);
    fetchCompletedTodos();
  };

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleToggle = async (id: string) => {
    try {
      await toggleTodo(id);
      fetchTodos();
      onTaskChange?.();
      toast.success('Todo updated');
    } catch (error) {
      toast.error('Failed to update todo');
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      fetchTodos();
      onTaskChange?.();
      toast.success('Todo deleted');
    } catch (error) {
      toast.error('Failed to delete todo');
    }
  };

  const handleSave = async (input: CreateTodoInput) => {
    if (editingTodo) {
      await updateTodo(editingTodo.id, input);
      toast.success('Todo updated');
    } else {
      await createTodo(input);
      toast.success('Todo created');
    }
    fetchTodos();
    onTaskChange?.();
  };

  // Handle quick-add input change — detect @mention trigger
  const handleQuickAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuickAddValue(val);

    // If assignee already resolved, verify @Name is still in the text
    if (quickAddAssignee) {
      const name = quickAddAssignee.displayName || `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`;
      if (!val.includes(`@${name}`)) {
        setQuickAddAssignee(null);
      }
      // Don't re-trigger dropdown once resolved
      setShowMentionDropdown(false);
      return;
    }

    // Detect an unresolved @query at or near the end of what the user is typing
    // Match @ followed by non-whitespace characters at the end of the string
    const mentionMatch = val.match(/@(\S*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1];
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      if (!query) {
        // Just @ typed — keep dropdown open, wait for more chars
        setShowMentionDropdown(true);
        setMentionSuggestions([]);
        return;
      }
      setShowMentionDropdown(true);
      mentionDebounceRef.current = setTimeout(async () => {
        setLoadingMention(true);
        try {
          const results = await searchEmployees(query);
          setMentionSuggestions(results);
        } finally {
          setLoadingMention(false);
        }
      }, 250);
    } else {
      setShowMentionDropdown(false);
      setMentionSuggestions([]);
    }
  };

  // When user picks an employee from the @mention dropdown
  const selectMentionEmployee = (emp: EmployeeSearchResult) => {
    const displayName = emp.displayName || `${emp.firstName} ${emp.lastName}`;
    // Replace the trailing @query with @FullName + space
    const resolved = quickAddValue.replace(/@(\S*)$/, `@${displayName} `);
    setQuickAddValue(resolved);
    setQuickAddAssignee(emp);
    setShowMentionDropdown(false);
    setMentionSuggestions([]);
    setTimeout(() => quickAddRef.current?.focus(), 0);
  };

  const clearQuickAddAssignee = () => {
    if (quickAddAssignee) {
      const name = quickAddAssignee.displayName || `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`;
      setQuickAddValue((v) => v.replace(`@${name}`, '').trim());
      setQuickAddAssignee(null);
    }
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const raw = quickAddValue.trim();
    if (!raw) return;

    // Strip @Name token from the title
    let title = raw;
    if (quickAddAssignee) {
      const name = quickAddAssignee.displayName || `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`;
      title = raw.replace(`@${name}`, '').trim();
    } else {
      // Strip any unresolved @word tokens too
      title = raw.replace(/@\S+/g, '').trim();
    }

    if (!title) {
      toast.error('Task title is required');
      return;
    }

    try {
      await createTodo({
        title,
        assigneeId: quickAddAssignee?.userId || undefined,
      });
      setQuickAddValue('');
      setQuickAddAssignee(null);
      setMentionSuggestions([]);
      fetchTodos();
      onTaskChange?.();
      toast.success(
        quickAddAssignee
          ? `Task assigned to ${
              quickAddAssignee.displayName ||
              `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`
            }`
          : 'Todo added'
      );
    } catch (error) {
      toast.error('Failed to add todo');
    }
  };

  const handleAddClick = () => {
    setEditingTodo(null);
    setDialogOpen(true);
  };

  const isLoading = externalLoading || loading;
  const todos = todosData?.todos || [];
  const summary = todosData?.summary;

  return (
    <>
      <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              My Tasks
              {summary && summary.pending > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {summary.pending} pending
                </Badge>
              )}
              {summary && summary.overdue > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {summary.overdue} overdue
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Your personal to-do list
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchTodos}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(true)}
              title="Expand to full screen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Add */}
          <div className="mb-4">
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={quickAddRef}
                value={quickAddValue}
                onChange={handleQuickAddChange}
                onKeyDown={handleQuickAdd}
                onBlur={() => setTimeout(() => setShowMentionDropdown(false), 200)}
                placeholder="Add a task… type @ to assign to someone"
                className={cn(
                  'pl-9 pr-3',
                  quickAddAssignee && 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-200 dark:ring-purple-800'
                )}
                autoComplete="off"
              />

              {/* @mention employee dropdown */}
              {showMentionDropdown && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {loadingMention ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Searching employees…
                    </div>
                  ) : mentionSuggestions.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                      {quickAddValue.match(/@(\S+)$/)?.[1]
                        ? 'No employees found'
                        : 'Type a name after @'}
                    </div>
                  ) : (
                    mentionSuggestions.map((emp) => {
                      const name = emp.displayName || `${emp.firstName} ${emp.lastName}`;
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={() => selectMentionEmployee(emp)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2.5"
                        >
                          <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{name}</p>
                            {((emp.designation as any)?.name || (emp.department as any)?.name) && (
                              <p className="text-xs text-muted-foreground leading-tight">
                                {(emp.designation as any)?.name}
                                {(emp.department as any)?.name
                                  ? ` · ${(emp.department as any).name}`
                                  : ''}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Resolved assignee chip */}
            {quickAddAssignee && (
              <div className="flex items-center gap-1.5 mt-1.5 px-1">
                <span className="text-xs text-muted-foreground">Assign to:</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                  <User className="h-3 w-3" />
                  {quickAddAssignee.displayName ||
                    `${quickAddAssignee.firstName} ${quickAddAssignee.lastName}`}
                  <button
                    type="button"
                    onClick={clearQuickAddAssignee}
                    className="ml-0.5 hover:text-purple-900 dark:hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-400" />
              <p className="text-red-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchTodos}>
                Try Again
              </Button>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <p>All tasks completed!</p>
              <p className="text-sm mt-1">Add a new task to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-1">
                {todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    currentUserId={currentUserId}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {!isLoading && !error && summary && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Circle className="h-3 w-3 text-blue-500" />
                  {summary.pending} pending
                </span>
                <button 
                  onClick={handleShowCompleted}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {summary.completed} completed
                </button>
              </div>
              {summary.overdue > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <Clock className="h-3 w-3" />
                  {summary.overdue} overdue
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TodoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editingTodo}
        onSave={handleSave}
      />

      {/* Fullscreen Expanded View */}
      {expanded && (
        <ExpandedTasksOverlay
          firstName={firstName || user?.firstName}
          todos={todos}
          summary={summary || undefined}
          currentUserId={currentUserId}
          isLoading={isLoading}
          error={error}
          quickAddValue={quickAddValue}
          quickAddAssignee={quickAddAssignee}
          quickAddRef={quickAddRef}
          showMentionDropdown={showMentionDropdown}
          loadingMention={loadingMention}
          mentionSuggestions={mentionSuggestions}
          onQuickAddChange={handleQuickAddChange}
          onQuickAddKeyDown={handleQuickAdd}
          onMentionBlur={() => setTimeout(() => setShowMentionDropdown(false), 200)}
          selectMentionEmployee={selectMentionEmployee}
          clearQuickAddAssignee={clearQuickAddAssignee}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchTodos}
          onAddClick={handleAddClick}
          onShowCompleted={handleShowCompleted}
          onClose={() => setExpanded(false)}
        />
      )}

      {/* Completed Tasks Dialog */}
      <Dialog open={completedDialogOpen} onOpenChange={setCompletedDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Completed Tasks
            </DialogTitle>
            <DialogDescription>
              Your recently completed tasks
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {loadingCompleted ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : completedTodos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed tasks yet</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {completedTodos.map((todo) => {
                  const isAssignedByMe = !!todo.assigneeId && todo.userId === currentUserId;
                  const isAssignedToMe = !!todo.assigneeId && todo.assigneeId === currentUserId && todo.userId !== currentUserId;
                  return (
                  <div 
                    key={todo.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-through text-muted-foreground">
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {todo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Creator side: show who this was assigned to */}
                        {isAssignedByMe && todo.assigneeName && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 bg-purple-50 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            → {todo.assigneeName}
                          </Badge>
                        )}
                        {/* Assignee side: show who assigned this */}
                        {isAssignedToMe && todo.creatorName && (
                          <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50 flex items-center gap-1">
                            <UserPlus className="h-3 w-3" />
                            by {todo.creatorName}
                          </Badge>
                        )}
                        {todo.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            Completed {format(parseISO(todo.completedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletedDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
