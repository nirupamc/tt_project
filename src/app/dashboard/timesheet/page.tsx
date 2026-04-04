'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Timesheet, Project } from '@/types';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock, Calendar, Target, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimesheetWithProject extends Timesheet {
  project: Project | null;
}

export default function EmployeeTimesheetPage() {
  const [timesheets, setTimesheets] = useState<TimesheetWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    const fetchTimesheets = async () => {
      try {
        const res = await fetch('/api/employee/timesheet');
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

    fetchTimesheets();
  }, []);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekTimesheets = timesheets.filter((ts) =>
    isSameWeek(parseISO(ts.work_date as any), currentWeekStart, { weekStartsOn: 1 })
  );

  const totalHours = timesheets.reduce((sum, t) => sum + Number(t.hours_logged), 0);
  const weeklyHours = weekTimesheets.reduce((sum, t) => sum + Number(t.hours_logged), 0);
  const dailyAverage = weekTimesheets.length > 0 ? weeklyHours / 7 : 0;
  const targetMet = weeklyHours >= 35;
  
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
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = days.map((day, idx) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + idx);
    const dayData = weekTimesheets.filter(ts => 
      format(parseISO(ts.work_date as any), 'EEE') === day
    );
    const hours = dayData.reduce((sum, ts) => sum + Number(ts.hours_logged), 0);
    return { name: day, hours };
  });

  const goToPrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div>
      {/* Week Navigation Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timesheet</h1>
          <p className="text-gray-600 mt-1">
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Current Week
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{weeklyHours.toFixed(1)}h</div>
            <p className="text-xs text-gray-500 mt-1">of 35h target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dailyAverage.toFixed(1)}h</div>
            <p className="text-xs text-gray-500 mt-1">per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={targetMet ? "default" : "secondary"} className="text-sm">
              {targetMet ? '✓ Met' : 'Not Met'}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">{targetMet ? 'Keep it up!' : 'Keep going!'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{streak}</div>
            <p className="text-xs text-gray-500 mt-1">consecutive days</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`${value}h`, 'Hours']}
                />
                <ReferenceLine y={5} stroke="#818cf8" strokeDasharray="3 3" label="Target" />
                <Bar dataKey="hours" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : weekTimesheets.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No timesheet entries for this week.</p>
              <p className="text-sm mt-2">
                Complete tasks in your projects to automatically log hours.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekTimesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(ts.work_date as any), 'EEEE, MMM d')}
                    </TableCell>
                    <TableCell>{ts.project?.title || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-indigo-600">
                      {Number(ts.hours_logged).toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-gray-500">{ts.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
