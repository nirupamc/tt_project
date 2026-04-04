'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, Timesheet, Project, Enrollment } from '@/types';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Clock, 
  FolderKanban, 
  Flame, 
  TrendingUp, 
  Trash2, 
  Download,
  Trophy,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface TimesheetWithProject extends Timesheet {
  project: Project | null;
}

interface EnrollmentWithProject extends Enrollment {
  project: Project;
}

type TimeRange = 'thisWeek' | 'thisMonth' | 'allTime';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<User | null>(null);
  const [timesheets, setTimesheets] = useState<TimesheetWithProject[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithProject[]>([]);
  const [projectsWithProgress, setProjectsWithProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('thisWeek');

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/admin/employees/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
        // The API returns enrollments with project details already
        if (data.enrollments) {
          setEnrollments(data.enrollments);
        }
      }
    } catch (error) {
      console.error('Failed to fetch employee:', error);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const res = await fetch(`/api/admin/timesheets`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((ts: any) => ts.user?.id === id);
        setTimesheets(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/employees/${id}/progress`);
      if (res.ok) {
        const data = await res.json();
        setProjectsWithProgress(data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchEmployee(), fetchTimesheets(), fetchProgress()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Employee deleted successfully');
        router.push('/admin/employees');
      } else {
        toast.error('Failed to delete employee');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Project', 'Hours', 'Notes'];
    const rows = filteredTimesheets.map(ts => [
      format(parseISO(ts.work_date as any), 'yyyy-MM-dd'),
      ts.project?.title || 'N/A',
      Number(ts.hours_logged).toFixed(1),
      ts.notes || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employee?.name}-timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Timesheet exported');
  };

  // Filter timesheets by time range
  const getTimeRangeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case 'thisWeek':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'allTime':
        return { start: new Date(0), end: new Date() };
    }
  };

  const { start, end } = getTimeRangeFilter();
  const filteredTimesheets = timesheets.filter(ts => {
    const date = parseISO(ts.work_date as any);
    return date >= start && date <= end;
  });

  // Calculate stats
  const totalProjects = enrollments.length;
  const totalHours = timesheets.reduce((sum, ts) => sum + Number(ts.hours_logged), 0);
  const weekTimesheets = timesheets.filter(ts => {
    const date = parseISO(ts.work_date as any);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return date >= weekStart && date <= weekEnd;
  });
  const weeklyHours = weekTimesheets.reduce((sum, ts) => sum + Number(ts.hours_logged), 0);

  // Calculate streak
  const sortedDates = [...new Set(timesheets.map(t => t.work_date))].sort().reverse();
  let streak = 0;
  let lastDate = new Date();
  for (const dateStr of sortedDates) {
    const date = parseISO(dateStr as any);
    const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      streak++;
      lastDate = date;
    } else {
      break;
    }
  }

  // Chart data
  const chartData = (() => {
    const days = Array.from(new Set(filteredTimesheets.map(ts => ts.work_date))).sort();
    return days.map(day => ({
      date: format(parseISO(day as any), 'MMM d'),
      hours: filteredTimesheets
        .filter(ts => ts.work_date === day)
        .reduce((sum, ts) => sum + Number(ts.hours_logged), 0),
    }));
  })();

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-32 bg-gray-800" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-gray-800" />
          ))}
        </div>
        <Skeleton className="h-96 bg-gray-800" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500">Employee not found</p>
          <Button onClick={() => router.push('/admin/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const initials = employee.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="p-6 lg:p-8">
      {/* Header Section */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Left: Profile */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
                <p className="text-gray-400 mt-1">{employee.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                    {employee.role}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Joined {format(new Date(employee.created_at), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Delete Button */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 flex items-center justify-end h-full">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Employee
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Learning Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hours This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{weeklyHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Days Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{streak}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Layout */}
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>

        {/* Tab 1: Projects */}
        <TabsContent value="projects">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Enrolled Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsWithProgress.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No projects enrolled yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400">Project</TableHead>
                      <TableHead className="text-gray-400">Skill</TableHead>
                      <TableHead className="text-gray-400">Progress</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsWithProgress.map((item) => (
                      <TableRow key={item.project_id} className="border-gray-700">
                        <TableCell className="text-white font-medium">{item.project.title}</TableCell>
                        <TableCell>
                          {item.project.skill_tag && (
                            <Badge variant="secondary">{item.project.skill_tag}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-400 min-w-[3rem]">{item.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Timesheet */}
        <TabsContent value="timesheet">
          <div className="space-y-6">
            {/* Controls */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Label className="text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </Label>
                    <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                      <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="allTime">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={exportCSV}
                    disabled={filteredTimesheets.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Hours Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available for selected range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: any) => [`${value}h`, 'Hours']}
                      />
                      <Bar dataKey="hours" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Work Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTimesheets.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No timesheet entries for selected range
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-transparent">
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400">Project</TableHead>
                        <TableHead className="text-gray-400">Hours</TableHead>
                        <TableHead className="text-gray-400">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTimesheets.map((ts) => (
                        <TableRow key={ts.id} className="border-gray-700">
                          <TableCell className="text-gray-300">
                            {format(parseISO(ts.work_date as any), 'EEE, MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-gray-300">{ts.project?.title || 'N/A'}</TableCell>
                          <TableCell className="text-white font-medium">
                            {Number(ts.hours_logged).toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-gray-400">{ts.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Badges */}
        <TabsContent value="badges">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Achievement Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No badges earned yet</p>
                <p className="text-sm mt-2">Complete projects and tasks to earn achievement badges</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
