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
  
  // Filter timesheets for current week, excluding weekends
  const weekTimesheets = timesheets.filter((ts) => {
    const tsDate = parseISO(ts.work_date as any);
    const dayOfWeek = tsDate.getDay();
    // Exclude Saturday (6) and Sunday (0)
    return isSameWeek(tsDate, currentWeekStart, { weekStartsOn: 1 }) && 
           dayOfWeek !== 0 && dayOfWeek !== 6;
  });

  const totalHours = timesheets.reduce((sum, t) => sum + Number(t.hours_logged), 0);
  const weeklyHours = weekTimesheets.reduce((sum, t) => sum + Number(t.hours_logged), 0);
  const dailyAverage = weekTimesheets.length > 0 ? weeklyHours / 5 : 0; // Changed to 5 weekdays
  const targetMet = weeklyHours >= 25; // Changed from 35h to 25h
  
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

  // Chart data - Monday to Friday only
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
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
          <h1 className="font-bebas text-4xl text-[#0A0A0A]">My Timesheet</h1>
          <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)] mt-1">
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek} className="border border-[rgba(10,10,10,0.15)] hover:border-[#FFD700] hover:text-[#C8A800] font-space text-[13px]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek} className="border border-[rgba(10,10,10,0.15)] hover:border-[#FFD700] hover:text-[#C8A800] font-space text-[13px]">
            Current Week
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek} className="border border-[rgba(10,10,10,0.15)] hover:border-[#FFD700] hover:text-[#C8A800] font-space text-[13px]">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-white border-l-[3px] border-l-[#FFD700] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FFD700]" />
              Weekly Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl text-[#0A0A0A]">{weeklyHours.toFixed(1)}h</div>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-1">of 25h target</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#FFD700] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#FFD700]" />
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl text-[#0A0A0A]">{dailyAverage.toFixed(1)}h</div>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-1">per day</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#FFD700] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#FFD700]" />
              Target Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={targetMet ? "default" : "secondary"} className="font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
              {targetMet ? '✓ Met' : 'Not Met'}
            </Badge>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-2">{targetMet ? 'Keep it up!' : 'Keep going!'}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#FFD700] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FFD700]" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl text-[#0A0A0A]">{streak}</div>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-1">consecutive days</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl mb-6">
        <CardHeader>
          <CardTitle className="font-space text-lg font-semibold text-[#0A0A0A]">Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full bg-[rgba(10,10,10,0.05)]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.06)" />
                <XAxis dataKey="name" stroke="rgba(10,10,10,0.5)" style={{ fontFamily: 'var(--font-space)', fontSize: 11, fill: 'rgba(10,10,10,0.5)' }} />
                <YAxis stroke="rgba(10,10,10,0.5)" style={{ fontFamily: 'var(--font-space)', fontSize: 11, fill: 'rgba(10,10,10,0.5)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid rgba(10,10,10,0.08)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`${value}h`, 'Hours']}
                />
                <ReferenceLine y={5} stroke="#C8A800" strokeDasharray="3 3" label="Target" />
                <Bar dataKey="hours" fill="#FFD700" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg font-semibold text-[#0A0A0A]">Work Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-[rgba(10,10,10,0.05)]" />
              ))}
            </div>
          ) : weekTimesheets.length === 0 ? (
            <div className="py-12 text-center font-space text-[13px] text-[rgba(10,10,10,0.6)]">
              <p>No timesheet entries for this week.</p>
              <p className="text-sm mt-2">
                Complete tasks in your projects to automatically log hours.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(10,10,10,0.08)]">
                  <TableHead className="bg-[rgba(255,215,0,0.06)] text-[#C8A800] uppercase font-space text-[11px] tracking-[2px]">Date</TableHead>
                  <TableHead className="bg-[rgba(255,215,0,0.06)] text-[#C8A800] uppercase font-space text-[11px] tracking-[2px]">Project</TableHead>
                  <TableHead className="bg-[rgba(255,215,0,0.06)] text-[#C8A800] uppercase font-space text-[11px] tracking-[2px]">Hours</TableHead>
                  <TableHead className="bg-[rgba(255,215,0,0.06)] text-[#C8A800] uppercase font-space text-[11px] tracking-[2px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekTimesheets.map((ts) => (
                  <TableRow key={ts.id} className="hover:bg-[rgba(255,215,0,0.02)] border-b border-[rgba(10,10,10,0.08)]">
                    <TableCell className="font-space text-[13px] text-[#0A0A0A] font-medium">
                      {format(parseISO(ts.work_date as any), 'EEEE, MMM d')}
                    </TableCell>
                    <TableCell className="font-space text-[13px] text-[#0A0A0A]">{ts.project?.title || 'N/A'}</TableCell>
                    <TableCell className="font-space text-[13px] text-[#0A0A0A] font-medium">
                      {Number(ts.hours_logged).toFixed(1)}h
                    </TableCell>
                    <TableCell className="font-space text-[13px] text-[rgba(10,10,10,0.6)]">{ts.notes || '-'}</TableCell>
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
