'use client';

import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Clock,
  FolderKanban,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';

const reportTypes = [
  { id: 'employees', name: 'Employees Report', icon: Users, description: 'Export employee data and details' },
  { id: 'attendance', name: 'Attendance Report', icon: Clock, description: 'Daily attendance records' },
  { id: 'projects', name: 'Projects Report', icon: FolderKanban, description: 'Project status and progress' },
  { id: 'tasks', name: 'Tasks Report', icon: CheckSquare, description: 'Task assignments and completion' },
  { id: 'leaves', name: 'Leaves Report', icon: Calendar, description: 'Leave requests and balances' },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('this-month');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  async function handleExport(reportType: string, format: 'excel' | 'pdf') {
    setIsExporting(reportType);
    try {
      // Simulate export
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`${reportType} report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and export reports for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'this-week' ? 'This Week' :
                 dateRange === 'this-month' ? 'This Month' :
                 dateRange === 'last-month' ? 'Last Month' :
                 dateRange === 'this-quarter' ? 'This Quarter' : 'This Year'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDateRange('today')}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange('this-week')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange('this-month')}>This Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange('last-month')}>Last Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange('this-quarter')}>This Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange('this-year')}>This Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="export">Export Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">124</h3>
                      <span className="flex items-center text-sm font-medium text-green-600">+8%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">from last month</p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">92.5%</h3>
                      <span className="flex items-center text-sm font-medium text-green-600">+2.3%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">from last month</p>
                  </div>
                  <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">23</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">8 due this month</p>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FolderKanban className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">342</h3>
                      <span className="flex items-center text-sm font-medium text-green-600">+15%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">from last month</p>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <CheckSquare className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Daily attendance over the past month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Chart visualization would go here</p>
                  <p className="text-sm">Using recharts library</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>Status distribution of projects</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Pie chart visualization would go here</p>
                  <p className="text-sm">Using recharts library</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <report.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                  </div>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isExporting === report.id}
                      onClick={() => handleExport(report.id, 'excel')}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isExporting === report.id}
                      onClick={() => handleExport(report.id, 'pdf')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Exports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
              <CardDescription>Your recently generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Employees Report', date: '2024-03-01', format: 'Excel', size: '245 KB' },
                  { name: 'Attendance Report - Feb 2024', date: '2024-02-28', format: 'PDF', size: '1.2 MB' },
                  { name: 'Projects Summary', date: '2024-02-25', format: 'Excel', size: '128 KB' },
                ].map((export_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {export_.format === 'Excel' ? (
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{export_.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(export_.date)} • {export_.size}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Work Hours Distribution</CardTitle>
                <CardDescription>Average hours worked per department</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Bar chart visualization</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'John Doe', score: 98, tasks: 45 },
                    { name: 'Jane Smith', score: 95, tasks: 42 },
                    { name: 'Mike Johnson', score: 92, tasks: 38 },
                    { name: 'Sarah Williams', score: 90, tasks: 36 },
                    { name: 'Tom Brown', score: 88, tasks: 34 },
                  ].map((performer, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {performer.tasks} tasks completed
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{performer.score}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
