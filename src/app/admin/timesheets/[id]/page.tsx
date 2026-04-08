"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { format, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, User, ArrowLeft, Clock, Target, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import Link from "next/link";
import {
  generateTimesheetEntries,
  calculateSummary,
  getEntriesForMonth,
  getEntriesForWeek,
  type TimesheetEntry,
} from "@/lib/timesheet";

type ViewMode = "chart" | "day" | "week" | "month";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  joining_date: string;
  hours_per_day: number;
}

export default function AdminEmployeeTimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEmployeeData();
  }, [resolvedParams.id]);

  const fetchEmployeeData = async () => {
    try {
      const res = await fetch(`/api/admin/employees/${resolvedParams.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          notFound();
        }
        throw new Error("Failed to fetch employee");
      }

      const data = await res.json();
      setEmployee(data);

      // Generate timesheet entries
      const generated = generateTimesheetEntries(
        data.joining_date,
        data.hours_per_day || 8
      );
      setEntries(generated);
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6 bg-[rgba(10,10,10,0.05)]" />
          <Skeleton className="h-8 w-48 bg-[rgba(10,10,10,0.05)]" />
        </div>
        <Skeleton className="h-32 w-full bg-[rgba(10,10,10,0.05)]" />
        <Skeleton className="h-96 w-full bg-[rgba(10,10,10,0.05)]" />
      </div>
    );
  }

  if (!employee) {
    notFound();
  }

  const weekSummary = calculateSummary(entries, "week");
  const monthSummary = calculateSummary(entries, "month");

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/timesheets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">
              {employee.name.toUpperCase()}
            </h1>
            <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)]">
              {employee.role} • {employee.email}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl p-12 text-center">
          <Calendar className="h-16 w-16 text-[rgba(10,10,10,0.3)] mx-auto mb-4" />
          <h3 className="font-space text-lg font-medium text-[#0A0A0A] mb-2">
            No Timesheet Data Yet
          </h3>
          <p className="font-space text-[14px] text-[rgba(10,10,10,0.6)]">
            This employee's timesheet will appear here from their first working day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/timesheets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">
            {employee.name.toUpperCase()}
          </h1>
          <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)]">
            {employee.role} • {employee.email}
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#FFD700] to-[#C8A800] rounded-xl p-6 text-[#0A0A0A]">
          <div className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80 mb-2">
            This Week
          </div>
          <div className="font-bebas text-4xl tracking-wider">
            {weekSummary.total_hours_worked}hrs
          </div>
          <div className="font-space text-[12px] opacity-70 mt-1">
            {weekSummary.working_days_so_far} of {weekSummary.expected_working_days} days
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl p-6 text-[#FFD700]">
          <div className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80 mb-2">
            This Month
          </div>
          <div className="font-bebas text-4xl tracking-wider">
            {monthSummary.total_hours_worked}hrs
          </div>
          <div className="font-space text-[12px] opacity-70 mt-1">
            {monthSummary.working_days_so_far} of {monthSummary.expected_working_days} days
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        {(["chart", "day", "week", "month"] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`font-space text-[13px] font-semibold tracking-wider uppercase ${
              viewMode === mode
                ? "bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A]"
                : "bg-white text-[#0A0A0A] border border-[rgba(10,10,10,0.08)] hover:bg-[rgba(10,10,10,0.03)]"
            }`}
          >
            {mode}
          </Button>
        ))}
      </div>

      {/* Views */}
      {viewMode === "chart" && (
        <ChartView entries={entries} employee={employee} />
      )}
      {viewMode === "day" && <DayView entries={entries} />}
      {viewMode === "week" && (
        <WeekView
          entries={entries}
          currentDate={currentDate}
          onPrevWeek={() => setCurrentDate(subWeeks(currentDate, 1))}
          onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
        />
      )}
      {viewMode === "month" && (
        <MonthView
          entries={entries}
          currentDate={currentDate}
          onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
          onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        />
      )}
    </div>
  );
}

// Chart View Component
function ChartView({ entries, employee }: { entries: TimesheetEntry[]; employee: Employee }) {
  const weekSummary = calculateSummary(entries, "week");
  const monthSummary = calculateSummary(entries, "month");

  // Calculate current week entries for chart
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEntries = getEntriesForWeek(entries, currentWeekStart);

  // Chart data - Monday to Friday only
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const chartData = days.map((day, idx) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + idx);
    const dayData = weekEntries.filter(entry => 
      format(new Date(entry.date), 'EEE') === day
    );
    const hours = dayData.reduce((sum, entry) => sum + entry.hours, 0);
    return { name: day, hours };
  });

  // Calculate streak
  const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse();
  let streak = 0;
  let lastDate = new Date();
  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);
    const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      streak++;
      lastDate = date;
    } else {
      break;
    }
  }

  const targetMet = weekSummary.total_hours_worked >= (employee.hours_per_day * 5);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-l-[3px] border-l-[#0A0A0A] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0A0A0A]" />
              Weekly Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl text-[#0A0A0A]">{weekSummary.total_hours_worked}h</div>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-1">
              of {employee.hours_per_day * 5}h target
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#0A0A0A] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0A0A0A]" />
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl text-[#0A0A0A]">
              {weekSummary.working_days_so_far > 0 ? (weekSummary.total_hours_worked / weekSummary.working_days_so_far).toFixed(1) : 0}h
            </div>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-1">per day</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#0A0A0A] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#0A0A0A]" />
              Target Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={targetMet ? "default" : "secondary"} 
              className={`font-space text-[10px] font-semibold tracking-[1.5px] uppercase ${
                targetMet 
                  ? "bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A]" 
                  : "bg-[rgba(10,10,10,0.1)] text-[rgba(10,10,10,0.7)]"
              }`}
            >
              {targetMet ? '✓ Met' : 'Not Met'}
            </Badge>
            <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] mt-2">
              {targetMet ? 'Keep it up!' : 'Keep going!'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-[3px] border-l-[#0A0A0A] border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(10,10,10,0.5)] flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#0A0A0A]" />
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
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg font-semibold text-[#0A0A0A]">Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(10,10,10,0.5)" 
                style={{ 
                  fontFamily: 'var(--font-space)', 
                  fontSize: 11, 
                  fill: 'rgba(10,10,10,0.7)' 
                }} 
              />
              <YAxis 
                stroke="rgba(10,10,10,0.5)" 
                style={{ 
                  fontFamily: 'var(--font-space)', 
                  fontSize: 11, 
                  fill: 'rgba(10,10,10,0.7)' 
                }} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid rgba(10,10,10,0.08)',
                  borderRadius: '8px',
                  color: '#0A0A0A'
                }}
                formatter={(value: any) => [`${value}h`, 'Hours']}
              />
              <ReferenceLine 
                y={employee.hours_per_day} 
                stroke="#0A0A0A" 
                strokeDasharray="3 3" 
                label={{ value: "Target", style: { fill: '#0A0A0A' } }}
              />
              <Bar dataKey="hours" fill="#0A0A0A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[#0A0A0A] to-[#2A2A2A] text-white">
          <CardHeader className="pb-3">
            <CardTitle className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl tracking-wider text-[#FFD700]">
              {weekSummary.total_hours_worked}hrs
            </div>
            <div className="font-space text-[12px] opacity-70 mt-1">
              {weekSummary.working_days_so_far} of {weekSummary.expected_working_days} days
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#F8F8F8] to-[#E8E8E8] text-[#0A0A0A] border">
          <CardHeader className="pb-3">
            <CardTitle className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl tracking-wider text-[#0A0A0A]">
              {monthSummary.total_hours_worked}hrs
            </div>
            <div className="font-space text-[12px] opacity-70 mt-1">
              {monthSummary.working_days_so_far} of {monthSummary.expected_working_days} days
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Day View Component
function DayView({ entries }: { entries: TimesheetEntry[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  // Show newest first in day view
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const paginatedEntries = sortedEntries.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);

  return (
    <div className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-[rgba(10,10,10,0.03)]">
          <tr>
            <th className="px-6 py-4 text-left font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
              Date
            </th>
            <th className="px-6 py-4 text-left font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
              Day
            </th>
            <th className="px-6 py-4 text-right font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
              Hours
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedEntries.map((entry, idx) => (
            <tr
              key={entry.date}
              className={idx % 2 === 0 ? "bg-white" : "bg-[rgba(10,10,10,0.02)]"}
            >
              <td className="px-6 py-4 font-space text-[14px] text-[#0A0A0A]">
                {format(new Date(entry.date), "MMM d, yyyy")}
              </td>
              <td className="px-6 py-4 font-space text-[14px] text-[rgba(10,10,10,0.7)]">
                {entry.day_of_week}
              </td>
              <td className="px-6 py-4 font-space text-[14px] font-semibold text-[#FFD700] text-right">
                {entry.hours}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-[rgba(10,10,10,0.08)] px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
            className="font-space text-[12px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="font-space text-[13px] text-[rgba(10,10,10,0.7)]">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            variant="outline"
            size="sm"
            className="font-space text-[12px]"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Week View Component
function WeekView({
  entries,
  currentDate,
  onPrevWeek,
  onNextWeek,
}: {
  entries: TimesheetEntry[];
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEntries = getEntriesForWeek(entries, weekStart);
  
  // Generate all weekdays (Mon-Fri)
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addWeeks(weekStart, 1),
  }).filter((d) => !isWeekend(d));

  const weekTotal = weekEntries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button onClick={onPrevWeek} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-space text-[16px] font-semibold text-[#0A0A0A]">
          Week of {format(weekStart, "MMM d, yyyy")}
        </div>
        <Button onClick={onNextWeek} variant="outline" size="sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Table */}
      <div className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[rgba(10,10,10,0.03)]">
            <tr>
              <th className="px-6 py-4 text-left font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Date
              </th>
              <th className="px-6 py-4 text-left font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Day
              </th>
              <th className="px-6 py-4 text-right font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Hours
              </th>
            </tr>
          </thead>
          <tbody>
            {weekDays.map((day) => {
              const entry = weekEntries.find(
                (e) => e.date === format(day, "yyyy-MM-dd")
              );
              const isFutureDay = isFuture(day);

              return (
                <tr key={day.toString()} className="border-t border-[rgba(10,10,10,0.08)]">
                  <td className="px-6 py-4 font-space text-[14px] text-[#0A0A0A]">
                    {format(day, "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 font-space text-[14px] text-[rgba(10,10,10,0.7)]">
                    {format(day, "EEEE")}
                  </td>
                  <td className="px-6 py-4 font-space text-[14px] font-semibold text-right">
                    {isFutureDay ? (
                      <span className="text-[rgba(10,10,10,0.3)]">—</span>
                    ) : entry ? (
                      <span className="text-[#FFD700]">{entry.hours}h</span>
                    ) : (
                      <span className="text-[rgba(10,10,10,0.3)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[rgba(255,215,0,0.1)] border-t-2 border-[#FFD700]">
            <tr>
              <td colSpan={2} className="px-6 py-4 font-space text-[14px] font-semibold text-[#0A0A0A]">
                Week Total
              </td>
              <td className="px-6 py-4 font-bebas text-[24px] text-[#FFD700] text-right">
                {weekTotal}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  entries,
  currentDate,
  onPrevMonth,
  onNextMonth,
}: {
  entries: TimesheetEntry[];
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthEntries = getEntriesForMonth(
    entries,
    currentDate.getFullYear(),
    currentDate.getMonth()
  );

  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Organize into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  daysInMonth.forEach((day) => {
    if (currentWeek.length === 0) {
      // Pad start of first week
      const dayOfWeek = day.getDay();
      const padding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      for (let i = 0; i < padding; i++) {
        currentWeek.push(new Date(0)); // Placeholder
      }
    }
    
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(0)); // Placeholder
    }
    weeks.push(currentWeek);
  }

  const monthTotal = monthEntries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button onClick={onPrevMonth} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-space text-[16px] font-semibold text-[#0A0A0A]">
          {format(currentDate, "MMMM yyyy")}
        </div>
        <Button onClick={onNextMonth} variant="outline" size="sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="text-center font-space text-[11px] font-semibold tracking-wider uppercase text-[rgba(10,10,10,0.5)]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-2 mb-2">
            {week.map((day, dayIdx) => {
              if (day.getTime() === 0) {
                // Placeholder
                return <div key={dayIdx} className="aspect-square" />;
              }

              const isWeekendDay = isWeekend(day);
              const isFutureDay = isFuture(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const entry = monthEntries.find(
                (e) => e.date === format(day, "yyyy-MM-dd")
              );

              return (
                <div
                  key={dayIdx}
                  className={`aspect-square border rounded-lg p-2 flex flex-col items-center justify-center ${
                    !isCurrentMonth
                      ? "bg-[rgba(10,10,10,0.02)] border-[rgba(10,10,10,0.05)]"
                      : isWeekendDay
                      ? "bg-[rgba(10,10,10,0.04)] border-[rgba(10,10,10,0.08)]"
                      : isFutureDay
                      ? "bg-[rgba(10,10,10,0.02)] border-[rgba(10,10,10,0.05)]"
                      : "bg-white border-[rgba(10,10,10,0.08)] hover:border-[#FFD700] hover:bg-[rgba(255,215,0,0.05)]"
                  }`}
                >
                  <div
                    className={`font-space text-[13px] ${
                      isWeekendDay || !isCurrentMonth || isFutureDay
                        ? "text-[rgba(10,10,10,0.3)]"
                        : "text-[#0A0A0A]"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {entry && (
                    <div className="font-space text-[11px] font-semibold text-[#0A0A0A] bg-[rgba(10,10,10,0.08)] px-1 rounded mt-1">
                      {entry.hours}h
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Month Total */}
        <div className="mt-6 pt-6 border-t border-[rgba(10,10,10,0.08)] flex justify-between items-center">
          <div className="font-space text-[14px] font-semibold text-[#0A0A0A]">
            Month Total
          </div>
          <div className="font-bebas text-[32px] text-[#0A0A0A] tracking-wider">
            {monthTotal}h
          </div>
        </div>
      </div>
    </div>
  );
}