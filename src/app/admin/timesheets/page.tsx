'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Timesheet, User, Project } from '@/types';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Download, Flame, Target, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TimesheetWithRelations extends Timesheet {
  user: User;
  project: Project;
}

type DateRange = 'thisWeek' | 'lastWeek' | 'thisMonth';

export default function AdminTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetWithRelations[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('thisWeek');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/employees');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const getDateRangeParams = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (dateRange) {
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        const lastWeek = subDays(now, 7);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  };

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeParams();
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);

      const res = await fetch(`/api/admin/timesheets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTimesheets(data);
      }
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [dateRange]);

  const exportCSV = () => {
    const headers = ['Employee', 'Email', 'Date', 'Project', 'Hours', 'Notes'];
    const rows = filteredTimesheets.map(ts => [
      ts.user?.name || 'Unknown',
      ts.user?.email || '',
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
    a.download = `timesheets-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Timesheet exported successfully');
  };

  const filteredTimesheets = selectedUserId
    ? timesheets.filter(ts => ts.user?.id === selectedUserId)
    : timesheets;

  // Calculate stats
  const totalHours = filteredTimesheets.reduce((sum, t) => sum + Number(t.hours_logged), 0);
  const uniqueDays = new Set(filteredTimesheets.map(t => t.work_date)).size;
  const dailyAverage = uniqueDays > 0 ? totalHours / uniqueDays : 0;
  const targetHours = dateRange === 'thisMonth' ? 140 : 35; // 35h/week, 140h/month
  const targetMet = totalHours >= targetHours;

  // Calculate streak for selected user
  let streak = 0;
  if (selectedUserId) {
    const userTimesheets = timesheets.filter(ts => ts.user?.id === selectedUserId);
    const sortedDates = [...new Set(userTimesheets.map(t => t.work_date))].sort().reverse();
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
  }

  // Chart data for selected user
  const chartData = selectedUserId
    ? (() => {
        const days = Array.from(new Set(filteredTimesheets.map(ts => ts.work_date))).sort();
        return days.map(day => ({
          date: format(parseISO(day as any), 'MMM d'),
          hours: filteredTimesheets
            .filter(ts => ts.work_date === day)
            .reduce((sum, ts) => sum + Number(ts.hours_logged), 0),
        }));
      })()
    : [];

  // User summary data
  const userSummaries = users.map(user => {
    const userSheets = timesheets.filter(ts => ts.user?.id === user.id);
    const hours = userSheets.reduce((sum, ts) => sum + Number(ts.hours_logged), 0);
    const userDays = new Set(userSheets.map(ts => ts.work_date)).size;
    
    // Calculate streak
    const sortedDates = [...new Set(userSheets.map(t => t.work_date))].sort().reverse();
    let userStreak = 0;
    let lastDate = new Date();
    for (const dateStr of sortedDates) {
      const date = parseISO(dateStr as any);
      const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        userStreak++;
        lastDate = date;
      } else {
        break;
      }
    }

    return {
      user,
      hours,
      target: targetHours,
      streak: userStreak,
      status: hours >= targetHours ? 'On Track' : 'Behind',
    };
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Timesheets</h1>
        <p className="text-gray-400 mt-1">Track employee work hours across all projects</p>
      </div>

      {/* Controls Bar */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-gray-400">Employee</Label>
              <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value || '')}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="">All Employees</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Date Range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Actions</Label>
              <Button
                onClick={exportCSV}
                disabled={filteredTimesheets.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-800" />
          ))}
        </div>
      ) : selectedUserId ? (
        <>
          {/* Selected Employee View - Two Panels */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Left: Summary Stats */}
            <div className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{totalHours.toFixed(1)}h</div>
                  <p className="text-xs text-gray-500 mt-1">of {targetHours}h target</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Daily Average
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{dailyAverage.toFixed(1)}h</div>
                  <p className="text-xs text-gray-500 mt-1">per day</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={targetMet ? "default" : "secondary"}>
                    {targetMet ? '✓ On Track' : 'Behind'}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{streak}</div>
                  <p className="text-xs text-gray-500 mt-1">consecutive days</p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Area Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Hours Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center text-gray-500">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
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
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorHours)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Work Sessions</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* All Employees Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userSummaries.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No timesheet data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400">Employee</TableHead>
                      <TableHead className="text-gray-400">Period Hours</TableHead>
                      <TableHead className="text-gray-400">Target</TableHead>
                      <TableHead className="text-gray-400">Streak</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSummaries.map(({ user, hours, target, streak, status }) => {
                      const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                      return (
                        <TableRow key={user.id} className="border-gray-700">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-gray-600 text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-white">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium">{hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-gray-300">{target}h</TableCell>
                          <TableCell className="text-gray-300">
                            {streak >= 3 ? '🔥 ' : ''}{streak} days
                          </TableCell>
                          <TableCell>
                            <Badge variant={status === 'On Track' ? 'default' : 'secondary'}>
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
