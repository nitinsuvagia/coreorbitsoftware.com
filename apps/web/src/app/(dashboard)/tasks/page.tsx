'use client';

import { useState } from 'react';
import { useTasks, useUpdateTaskStatus, Task } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getPriorityColor, formatDate, getAvatarColor } from '@/lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Clock,
  Filter,
  LayoutGrid,
  List,
  Download,
} from 'lucide-react';
import Link from 'next/link';

const STATUSES = [
  { value: 'backlog', label: 'Backlog', color: 'bg-gray-100' },
  { value: 'todo', label: 'To Do', color: 'bg-blue-100' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-100' },
  { value: 'review', label: 'Review', color: 'bg-purple-100' },
  { value: 'done', label: 'Done', color: 'bg-green-100' },
];

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Link
            href={`/tasks/${task.id}`}
            className="font-medium text-sm hover:underline line-clamp-2"
          >
            {task.title}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${task.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.project && (
          <Badge variant="outline" className="text-xs">
            {task.project.code}
          </Badge>
        )}

        <div className="flex items-center gap-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.estimatedHours}h</span>
              </div>
            )}
          </div>
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`${getAvatarColor(task.assignee.firstName + task.assignee.lastName).className} text-xs font-semibold`}>
                {getInitials(`${task.assignee.firstName} ${task.assignee.lastName}`)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const { data: tasksData, isLoading } = useTasks({
    search,
    projectId,
    limit: 100,
  });

  const { data: projectsData } = useProjects({ limit: 50 });

  const tasks = tasksData?.items || [];
  const projects = projectsData?.items || [];

  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.value] = tasks.filter((t: Task) => t.status === status.value);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage and track tasks across projects
          </p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {projectId
                ? projects.find((p) => p.id === projectId)?.name || 'Project'
                : 'All Projects'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setProjectId('')}>
              All Projects
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setProjectId(project.id)}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center border rounded-lg">
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-r-none"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <div key={status.value} className="min-w-[280px]">
              <div className={`rounded-t-lg p-3 ${status.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{status.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {tasksByStatus[status.value]?.length || 0}
                  </Badge>
                </div>
              </div>
              <div className="bg-muted/50 rounded-b-lg p-2 space-y-2 min-h-[400px]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  tasksByStatus[status.value]?.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Task</th>
                  <th className="text-left p-4 font-medium">Project</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                  <th className="text-left p-4 font-medium">Assignee</th>
                  <th className="text-left p-4 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="p-4"><div className="h-4 bg-muted rounded w-48" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-20" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    </tr>
                  ))
                ) : (
                  tasks.map((task: Task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="p-4">
                        {task.project && (
                          <Badge variant="outline">{task.project.code}</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          {task.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`${getAvatarColor(task.assignee.firstName + task.assignee.lastName).className} text-xs font-semibold`}>
                                {getInitials(`${task.assignee.firstName} ${task.assignee.lastName}`)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {task.dueDate ? formatDate(task.dueDate) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
