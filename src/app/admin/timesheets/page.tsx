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
        <h1 className="font-bebas text-4xl text-[#F5F5F0]">Timesheets</h1>
        <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-1">Track employee work hours across all projects</p>
      </div>

      {/* Controls Bar */}
      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">Employee</Label>
              <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value || '')}>
                <SelectTrigger className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)]">
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
              <Label className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">Date Range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)]">
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">Actions</Label>
              <Button
                onClick={exportCSV}
                disabled={filteredTimesheets.length === 0}
                className="w-full bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150"
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
            <Skeleton key={i} className="h-32 bg-[#2A2A2A]" />
          ))}
        </div>
      ) : selectedUserId ? (
        <>
          {/* Selected Employee View - Two Panels */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Left: Summary Stats */}
            <div className="space-y-4">
              <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)] flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#FFD700]" />
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bebas text-[42px] text-[#F5F5F0] leading-none">{totalHours.toFixed(1)}h</div>
                  <p className="font-space text-[12px] text-[rgba(245,245,240,0.5)] mt-1">of {targetHours}h target</p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#FFD700]" />
                    Daily Average
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bebas text-[42px] text-[#F5F5F0] leading-none">{dailyAverage.toFixed(1)}h</div>
                  <p className="font-space text-[12px] text-[rgba(245,245,240,0.5)] mt-1">per day</p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)] flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#FFD700]" />
                    Target Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={targetMet ? "default" : "secondary"} className={targetMet ? "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1" : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1"}>
                    {targetMet ? '✓ On Track' : 'Behind'}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)] flex items-center gap-2">
                    <Flame className="h-5 w-5 text-[#FFD700]" />
                    Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bebas text-[42px] text-[#F5F5F0] leading-none">{streak}</div>
                  <p className="font-space text-[12px] text-[rgba(245,245,240,0.5)] mt-1">consecutive days</p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Area Chart */}
            <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
              <CardHeader>
                <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Hours Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">No data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,215,0,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(245,245,240,0.5)" style={{ fontFamily: 'var(--font-space)', fontSize: 11 }} />
                      <YAxis stroke="rgba(245,245,240,0.5)" style={{ fontFamily: 'var(--font-space)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid rgba(255,215,0,0.15)',
                          borderRadius: '8px',
                          color: '#F5F5F0',
                          fontFamily: 'var(--font-space)',
                        }}
                        formatter={(value: any) => [`${value}h`, 'Hours']}
                      />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="#FFD700"
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
          <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
            <CardHeader>
              <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Work Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[rgba(255,215,0,0.08)] hover:bg-transparent">
                    <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Date</TableHead>
                    <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Project</TableHead>
                    <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Hours</TableHead>
                    <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimesheets.map((ts) => (
                    <TableRow key={ts.id} className="border-b border-[rgba(255,215,0,0.06)] hover:bg-[rgba(255,215,0,0.03)]">
                      <TableCell className="font-space text-[13px] text-[#F5F5F0]">
                        {format(parseISO(ts.work_date as any), 'EEE, MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-space text-[13px] text-[#F5F5F0]">{ts.project?.title || 'N/A'}</TableCell>
                      <TableCell className="font-space text-[13px] text-[#F5F5F0] font-medium">
                        {Number(ts.hours_logged).toFixed(1)}h
                      </TableCell>
                      <TableCell className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">{ts.notes || '-'}</TableCell>
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
          <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
            <CardHeader>
              <CardTitle className="font-bebas text-2xl text-[#F5F5F0] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#FFD700]" />
                All Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userSummaries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">No timesheet data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(255,215,0,0.08)] hover:bg-transparent">
                      <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Employee</TableHead>
                      <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Period Hours</TableHead>
                      <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Target</TableHead>
                      <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Streak</TableHead>
                      <TableHead className="bg-[rgba(255,215,0,0.05)] text-[#FFD700] uppercase text-[11px] tracking-[2px] font-space">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSummaries.map(({ user, hours, target, streak, status }) => {
                      const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                      return (
                        <TableRow key={user.id} className="border-b border-[rgba(255,215,0,0.06)] hover:bg-[rgba(255,215,0,0.03)]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border-2 border-[#FFD700]">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-[#1A1A1A] text-[#F5F5F0] font-space text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-space font-medium text-[#F5F5F0]">{user.name}</p>
                                <p className="font-space text-[12px] text-[rgba(245,245,240,0.5)]">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-space text-[13px] text-[#F5F5F0] font-medium">{hours.toFixed(1)}h</TableCell>
                          <TableCell className="font-space text-[13px] text-[#F5F5F0]">{target}h</TableCell>
                          <TableCell className="font-space text-[13px] text-[#F5F5F0]">
                            {streak >= 3 ? '🔥 ' : ''}{streak} days
                          </TableCell>
                          <TableCell>
                            <Badge variant={status === 'On Track' ? 'default' : 'secondary'} className={status === 'On Track' ? "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1" : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1"}>
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
