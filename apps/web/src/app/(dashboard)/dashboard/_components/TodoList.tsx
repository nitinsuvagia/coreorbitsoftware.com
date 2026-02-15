'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  Todo,
  TodoPriority,
  TodosResponse,
  CreateTodoInput,
} from '@/lib/api/dashboard';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TodoListProps {
  loading?: boolean;
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
    return isBefore(parseISO(todo.dueDate), new Date());
  } catch {
    return false;
  }
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const priority = priorityConfig[todo.priority] || priorityConfig.MEDIUM;
  const overdue = isOverdue(todo);

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
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "font-medium",
            todo.isCompleted && "line-through text-muted-foreground"
          )}>
            {todo.title}
          </span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", priority.color)}
          >
            {priority.label}
          </Badge>
          {/* Due Date - Always visible */}
          <span className={cn(
            "flex items-center gap-1 text-xs ml-auto",
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
            "text-sm text-muted-foreground truncate mt-0.5",
            todo.isCompleted && "line-through"
          )}>
            {todo.description}
          </p>
        )}

        {todo.category && (
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary" className="text-xs">
              {todo.category}
            </Badge>
          </div>
        )}
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
          <DropdownMenuItem onClick={() => onEdit(todo)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete(todo.id)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
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

  useEffect(() => {
    if (open) {
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description || '');
        setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
        setPriority(todo.priority);
        setCategory(todo.category || '');
      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('MEDIUM');
        setCategory('');
      }
    }
  }, [open, todo]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        priority,
        category: category.trim() || undefined,
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
      <DialogContent className="sm:max-w-[425px]">
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

export function TodoList({ loading: externalLoading }: TodoListProps) {
  const [todosData, setTodosData] = useState<TodosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

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
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddValue.trim()) {
      try {
        await createTodo({ title: quickAddValue.trim() });
        setQuickAddValue('');
        fetchTodos();
        toast.success('Todo added');
      } catch (error) {
        toast.error('Failed to add todo');
      }
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
      <Card className="col-span-3">
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Add */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Add a task... (press Enter)"
                className="pl-9"
              />
            </div>
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
                {completedTodos.map((todo) => (
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
                      {todo.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {format(parseISO(todo.completedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
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
