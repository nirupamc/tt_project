"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  eachDayOfInterval,
  format,
  isFuture,
  isSameMonth,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { getTaskCategoriesForJobTitle } from "@/lib/task-categories";
import { WeeklySummaryCard } from "@/components/employee/WeeklySummaryCard";
import { DailyEntryRow } from "@/components/employee/DailyEntryRow";

type ViewMode = "chart" | "day" | "week" | "month";

type ObjectiveValue = "objective_1" | "objective_2" | "objective_3";

interface TimesheetEntry {
  id: string;
  work_date: string;
  hours_logged: number;
  is_auto_generated?: boolean;
  task_category: string | null;
  task_description: string | null;
  i983_objective_mapped: ObjectiveValue | null;
  training_hours: number | null;
  billable_hours: number | null;
}

interface ApprovalEntry {
  week_start_date: string;
  approved_at: string;
  approved_by_name: string;
}

const CATEGORY_OPTIONS = [
  "Frontend Development",
  "Backend Development",
  "API Integration",
  "Database",
  "Testing & QA",
  "DevOps",
  "Training",
  "Research",
  "Meeting",
  "Documentation",
] as const;

type CategoryValue = string;

interface TimesheetFormState {
  work_date: string;
  total_hours: string;
  task_category: CategoryValue;
  task_description: string;
  i983_objective_mapped: ObjectiveValue;
  training_hours: string;
  billable_hours: string;
}

export default function EmployeeTimesheetPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalEntry[]>([]);
  const [objectiveLabels, setObjectiveLabels] = useState<string[]>([
    "Objective 1",
    "Objective 2",
    "Objective 3",
  ]);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(
    Array.from(getTaskCategoriesForJobTitle(null))
  );
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedWeekDay, setExpandedWeekDay] = useState<string | null>(null);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [hoursTouched, setHoursTouched] = useState(false);
  // Get initial categories for form state
  const initialCategories = Array.from(getTaskCategoriesForJobTitle(null));
  const [form, setForm] = useState<TimesheetFormState>({
    work_date: format(new Date(), "yyyy-MM-dd"),
    total_hours: "8",
    task_category: initialCategories[0],
    task_description: "",
    i983_objective_mapped: "objective_1" as ObjectiveValue,
    training_hours: "0",
    billable_hours: "8",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch timesheet data
      const timesheetResponse = await fetch("/api/employee/timesheet");
      if (!timesheetResponse.ok) throw new Error("Failed to load timesheet");
      const timesheetData = await timesheetResponse.json();
      setEntries(timesheetData.entries || []);
      setApprovals(timesheetData.approvals || []);
      setObjectiveLabels(timesheetData.objective_labels || ["Objective 1", "Objective 2", "Objective 3"]);
      
      // Fetch user profile to get job_title and hours_per_week
      const profileResponse = await fetch("/api/employee/profile");
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setJobTitle(profileData.job_title || null);
        if (profileData.hours_per_week) {
          setHoursPerWeek(profileData.hours_per_week);
        }
        const categories = Array.from(getTaskCategoriesForJobTitle(profileData.job_title));
        setAvailableCategories(categories);
        
        // Update form's task_category to first available category if current one isn't available
        if (!categories.includes(form.task_category)) {
          setForm((prev) => ({
            ...prev,
            task_category: categories[0],
          }));
        }
      } else {
        // Fallback to general categories if profile fetch fails
        const categories = Array.from(getTaskCategoriesForJobTitle(null));
        setAvailableCategories(categories);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load timesheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const entryMap = useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    entries.forEach((entry) => map.set(entry.work_date, entry));
    return map;
  }, [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimesheetEntry[]>();
    entries.forEach((entry) => {
      const current = map.get(entry.work_date) || [];
      current.push(entry);
      map.set(entry.work_date, current);
    });
    return map;
  }, [entries]);

  const descriptionLength = form.task_description.trim().length;
  const totalHours = Number(form.total_hours);
  const trainingHours = Number(form.training_hours);
  const billableHours = Number(form.billable_hours);
  const hoursMatch =
    Number((trainingHours + billableHours).toFixed(2)) === Number(totalHours.toFixed(2));
  const isFutureDate = isFuture(new Date(form.work_date));
  const isFormValid =
    !!form.work_date &&
    !!form.task_category &&
    descriptionLength >= 100 &&
    !isFutureDate &&
    totalHours >= 0.5 &&
    totalHours <= 12 &&
    hoursMatch;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEntries = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })
    .filter((day) => !isWeekend(day))
    .map((day) => ({
      day,
      entries: entriesByDate.get(format(day, "yyyy-MM-dd")) || [],
    }));

  const weekTotal = weekEntries.reduce(
    (sum, item) =>
      sum + item.entries.reduce((daySum, entry) => daySum + Number(entry.hours_logged || 0), 0),
    0,
  );
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthTotal = monthDays.reduce((sum, day) => {
    const dayEntries = entriesByDate.get(format(day, "yyyy-MM-dd")) || [];
    return sum + dayEntries.reduce((daySum, entry) => daySum + Number(entry.hours_logged || 0), 0);
  }, 0);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const chartData = ["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, index) => {
    const date = addWeeks(currentWeekStart, 0);
    date.setDate(currentWeekStart.getDate() + index);
    const key = format(date, "yyyy-MM-dd");
    return {
      name: label,
      hours: entryMap.get(key)?.hours_logged || 0,
    };
  });

  const approvalMap = new Map(
    approvals.map((approval) => [approval.week_start_date, approval]),
  );
  const visibleWeekApproval = approvalMap.get(format(weekStart, "yyyy-MM-dd"));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDescriptionTouched(true);
    setHoursTouched(true);
    if (!isFormValid) return;

    setSaving(true);
    try {
      const response = await fetch("/api/employee/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_date: form.work_date,
          total_hours: Number(form.total_hours),
          task_category: form.task_category,
          task_description: form.task_description,
          i983_objective_mapped: form.i983_objective_mapped,
          training_hours: Number(form.training_hours),
          billable_hours: Number(form.billable_hours),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save entry");
      }
      toast.success("Daily activity log saved");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64 bg-[rgba(10,10,10,0.05)]" />
        <Skeleton className="h-80 w-full bg-[rgba(10,10,10,0.05)]" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">MY TIMESHEET</h1>

      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">
            Daily Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Date">
                <Input
                  type="date"
                  max={format(new Date(), "yyyy-MM-dd")}
                  value={form.work_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, work_date: event.target.value }))
                  }
                />
              </Field>
              <Field label="Total Hours">
                <Input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={form.total_hours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, total_hours: event.target.value }))
                  }
                />
              </Field>
              <Field label="Task Category">
                <Select
                  value={form.task_category}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, task_category: value as CategoryValue }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="I-983 Objective Mapped">
                <Select
                  value={form.i983_objective_mapped}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, i983_objective_mapped: value as ObjectiveValue }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective_1">{objectiveLabels[0]}</SelectItem>
                    <SelectItem value="objective_2">{objectiveLabels[1]}</SelectItem>
                    <SelectItem value="objective_3">{objectiveLabels[2]}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Training Hours">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.training_hours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, training_hours: event.target.value }))
                  }
                />
              </Field>
              <Field label="Billable Hours">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.billable_hours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, billable_hours: event.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Task Description">
              <Textarea
                value={form.task_description}
                onBlur={() => setDescriptionTouched(true)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, task_description: event.target.value }))
                }
                className="min-h-28"
              />
              <p
                className={`font-space text-xs mt-1 ${descriptionLength >= 100 ? "text-green-600" : "text-[rgba(10,10,10,0.6)]"}`}
              >
                {descriptionLength} / 100 characters
              </p>
              {descriptionTouched && descriptionLength < 100 && (
                <p className="font-space text-xs text-red-600">
                  Please describe your work in more detail (minimum 100 characters)
                </p>
              )}
            </Field>

            {hoursTouched && !hoursMatch && (
              <p className="font-space text-xs text-red-600">
                Training Hours + Billable Hours must equal Total Hours
              </p>
            )}
            {isFutureDate && (
              <p className="font-space text-xs text-red-600">
                Date cannot be in the future
              </p>
            )}

            <Button
              type="submit"
              disabled={saving || !isFormValid}
              onClick={() => {
                setDescriptionTouched(true);
                setHoursTouched(true);
              }}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space font-semibold"
            >
              {saving ? "Saving..." : "Save Daily Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
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

      {viewMode === "chart" && (
        <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-space text-lg font-semibold text-[#0A0A0A]">Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.1)" />
                <XAxis dataKey="name" stroke="rgba(10,10,10,0.5)" />
                <YAxis stroke="rgba(10,10,10,0.5)" />
                  <Tooltip formatter={(value) => [`${Number(value || 0)}h`, "Hours"]} />
                <Bar dataKey="hours" fill="#FFD700" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewMode === "day" && (
        <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardContent className="pt-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(10,10,10,0.08)]">
                  <th className="text-left py-3 font-space text-xs uppercase">Date</th>
                  <th className="text-left py-3 font-space text-xs uppercase">Category</th>
                  <th className="text-right py-3 font-space text-xs uppercase">Hours</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[rgba(10,10,10,0.06)]">
                    <td className="py-3 font-space text-sm">{format(parseISO(entry.work_date), "MMM d, yyyy")}</td>
                    <td className="py-3 font-space text-sm">{entry.task_category || "—"}</td>
                    <td className="py-3 font-space text-sm text-right text-[#FFD700] font-semibold">
                      {Number(entry.hours_logged).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {viewMode === "week" && (
        <div className="space-y-4" id="week-view">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print this week
            </Button>
            <Button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Card */}
          <WeeklySummaryCard
            weekStart={weekStart}
            totalHours={weekTotal}
            requiredHours={hoursPerWeek}
            trainingHours={weekEntries.reduce((sum, { entries: dayEntries }) => 
              sum + dayEntries.reduce((daySum, e) => daySum + Number(e.training_hours || 0), 0), 0)}
            billableHours={weekEntries.reduce((sum, { entries: dayEntries }) => 
              sum + dayEntries.reduce((daySum, e) => daySum + Number(e.billable_hours || 0), 0), 0)}
            supervisorApproval={visibleWeekApproval}
          />

          {/* Daily Entries Table */}
          <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl print:shadow-none print:border-[rgba(10,10,10,0.2)]">
            <CardContent className="pt-6 print:pt-4 px-0 print:px-0">
              <table className="w-full">
                <thead className="print:bg-[rgba(10,10,10,0.05)]">
                  <tr className="border-b border-[rgba(10,10,10,0.08)]">
                    <th className="text-left py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)]">
                      Day
                    </th>
                    <th className="text-left py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)]">
                      Hours
                    </th>
                    <th className="text-left py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)]">
                      Task Category
                    </th>
                    <th className="text-left py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)]">
                      I-983 Objective
                    </th>
                    <th className="text-center py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)] print:hidden">
                      Notes
                    </th>
                    <th className="text-center py-3 px-3 font-space text-xs uppercase font-semibold text-[rgba(10,10,10,0.7)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weekEntries.map(({ day, entries: dayEntries }) => (
                    <DailyEntryRow
                      key={format(day, "yyyy-MM-dd")}
                      day={day}
                      entries={dayEntries}
                      objectiveLabels={objectiveLabels}
                      hoursPerWeekDaily={hoursPerWeek / 5}
                      isApproved={!!visibleWeekApproval}
                    />
                  ))}
                </tbody>
                <tfoot className="border-t border-[rgba(10,10,10,0.08)] print:border-t-2">
                  <tr className="print:bg-[rgba(10,10,10,0.05)]">
                    <td colSpan={2} className="py-3 px-3 font-space text-sm font-bold text-[#0A0A0A]">
                      Week Total
                    </td>
                    <td className="py-3 px-3 font-space text-sm font-bold text-[#FFD700]">
                      {weekTotal.toFixed(1)}h
                    </td>
                    <td colSpan={3} className="text-right py-3 px-3 font-space text-xs text-[rgba(10,10,10,0.6)]">
                      Required: {hoursPerWeek.toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Print-only footer */}
          <style>{`
            @media print {
              body {
                background: white;
              }
              #week-view {
                box-shadow: none;
              }
              .print\\:hidden {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}

      {viewMode === "month" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => setCurrentDate(subMonths(currentDate, 1))} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-space text-sm font-semibold text-[#0A0A0A]">
              {format(currentDate, "MMMM yyyy")}
            </p>
            <Button onClick={() => setCurrentDate(addMonths(currentDate, 1))} variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
            <CardContent className="pt-6">
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEntries = entriesByDate.get(key) || [];
                  const dayTotal = dayEntries.reduce(
                    (sum, entry) => sum + Number(entry.hours_logged || 0),
                    0,
                  );
                  return (
                    <div
                      key={key}
                      className={`aspect-square border rounded-lg p-2 ${isSameMonth(day, currentDate) ? "bg-white border-[rgba(10,10,10,0.08)]" : "bg-[rgba(10,10,10,0.02)] border-[rgba(10,10,10,0.05)]"}`}
                    >
                      <p className="font-space text-xs text-[rgba(10,10,10,0.7)]">{format(day, "d")}</p>
                      {dayEntries.length > 0 && (
                        <p className="font-space text-xs text-[#FFD700] font-semibold mt-1">
                          {dayTotal.toFixed(1)}h
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="font-space text-sm font-semibold mt-4 text-[#0A0A0A]">
                Month Total: <span className="text-[#FFD700]">{monthTotal.toFixed(1)}h</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-space text-xs uppercase tracking-wider text-[rgba(10,10,10,0.6)]">
        {label}
      </Label>
      {children}
    </div>
  );
}
