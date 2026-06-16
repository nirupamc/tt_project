"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";

type FilterMode = "all" | "pending";

interface TimesheetEntry {
  id: string;
  user_id: string;
  work_date: string;
  hours_logged: number;
  task_category: string | null;
  task_description: string | null;
  i983_objective_mapped: string | null;
  training_hours: number | null;
  billable_hours: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Approval {
  id: string;
  employee_id: string;
  week_start_date: string;
  approved_at: string;
  approved_by_name: string;
}

interface WeekGroup {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  weekStart: string;
  entries: TimesheetEntry[];
  totalHours: number;
  approval?: Approval;
}

function AdminTimesheetsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("pending");
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkApprovingWeek, setBulkApprovingWeek] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [timesheetsRes, approvalsRes] = await Promise.all([
        fetch("/api/admin/timesheets"),
        fetch("/api/admin/timesheets/approvals"),
      ]);
      if (!timesheetsRes.ok || !approvalsRes.ok) {
        throw new Error("Failed to load timesheet data");
      }
      const timesheetsData = await timesheetsRes.json();
      const approvalsData = await approvalsRes.json();
      const detailedEntries = (timesheetsData || []).filter(
        (entry: TimesheetEntry) => entry.task_description,
      );
      setEntries(detailedEntries);
      setApprovals(approvalsData || []);
    } catch (error) {
      setLoadError(true);
      toast.error(error instanceof Error ? error.message : "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter === "all") {
      setFilterMode("all");
    }
    if (filter === "pending") {
      setFilterMode("pending");
    }
  }, [searchParams]);

  const groupedWeeks = useMemo(() => {
    const approvalMap = new Map(
      approvals.map((approval) => [`${approval.employee_id}:${approval.week_start_date}`, approval]),
    );
    const map = new Map<string, WeekGroup>();

    entries.forEach((entry) => {
      const weekStart = format(
        startOfWeek(parseISO(entry.work_date), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      const key = `${entry.user_id}:${weekStart}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          employeeId: entry.user_id,
          employeeName: entry.user.name,
          employeeEmail: entry.user.email,
          weekStart,
          entries: [entry],
          totalHours: Number(entry.hours_logged),
          approval: approvalMap.get(key),
        });
      } else {
        existing.entries.push(entry);
        existing.totalHours += Number(entry.hours_logged);
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => a.work_date.localeCompare(b.work_date)),
      }))
      .sort((a, b) => {
        if (a.weekStart === b.weekStart) return a.employeeName.localeCompare(b.employeeName);
        return b.weekStart.localeCompare(a.weekStart);
      });
  }, [entries, approvals]);

  const visibleWeeks = groupedWeeks.filter((group) => {
    if (filterMode === "pending" && group.approval) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !group.employeeName.toLowerCase().includes(q) &&
      !group.employeeEmail.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  // Group employee-weeks under their week so the page reads
  // week-by-week instead of one endless list
  const weekSections = useMemo(() => {
    const sections = new Map<string, WeekGroup[]>();
    visibleWeeks.forEach((group) => {
      const existing = sections.get(group.weekStart) || [];
      existing.push(group);
      sections.set(group.weekStart, existing);
    });
    return Array.from(sections.entries()); // insertion order = weekStart desc
  }, [visibleWeeks]);

  const approveWeek = async (group: WeekGroup) => {
    const key = `${group.employeeId}:${group.weekStart}`;
    setApprovingKey(key);
    try {
      const response = await fetch("/api/admin/timesheets/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: group.employeeId,
          week_start_date: group.weekStart,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve week");
      }
      const approval = await response.json();
      setApprovals((prev) => {
        const withoutExisting = prev.filter(
          (item) =>
            !(item.employee_id === approval.employee_id && item.week_start_date === approval.week_start_date),
        );
        return [approval, ...withoutExisting];
      });
      toast.success("Week approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve week");
    } finally {
      setApprovingKey(null);
    }
  };

  const approveAllInWeek = async (weekStart: string, groups: WeekGroup[]) => {
    const pending = groups.filter((group) => !group.approval);
    if (pending.length === 0) return;
    setBulkApprovingWeek(weekStart);
    let approved = 0;
    let failed = 0;
    for (const group of pending) {
      try {
        const response = await fetch("/api/admin/timesheets/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: group.employeeId,
            week_start_date: group.weekStart,
          }),
        });
        if (!response.ok) throw new Error();
        const approval = await response.json();
        setApprovals((prev) => {
          const withoutExisting = prev.filter(
            (item) =>
              !(item.employee_id === approval.employee_id && item.week_start_date === approval.week_start_date),
          );
          return [approval, ...withoutExisting];
        });
        approved += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkApprovingWeek(null);
    if (failed === 0) {
      toast.success(`Approved ${approved} timesheet${approved === 1 ? "" : "s"}`);
    } else {
      toast.error(`Approved ${approved}, failed ${failed} — retry the remaining ones`);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-[#F5F5F0] tracking-wider">TIMESHEETS</h1>
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.6)] mt-1">
            Weekly supervisor approvals (Mon-Sun)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(245,245,240,0.5)]" />
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
            />
          </div>
          <Button
            onClick={() => setFilterMode("all")}
            className={
              filterMode === "all"
                ? "bg-[#FFD700] text-[#0A0A0A]"
                : "bg-[#1A1A1A] text-[#F5F5F0] border border-[rgba(255,215,0,0.15)]"
            }
          >
            Show All
          </Button>
          <Button
            onClick={() => setFilterMode("pending")}
            className={
              filterMode === "pending"
                ? "bg-[#FFD700] text-[#0A0A0A]"
                : "bg-[#1A1A1A] text-[#F5F5F0] border border-[rgba(255,215,0,0.15)]"
            }
          >
            Pending Approval Only
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 bg-[#2A2A2A] rounded-xl" />
          ))}
        </div>
      ) : loadError ? (
        <Card className="bg-[#1A1A1A] border border-[rgba(248,113,113,0.35)] rounded-xl">
          <CardContent className="py-10 text-center">
            <p className="font-space text-[13px] text-[#f87171]">Couldn&apos;t load timesheets.</p>
            <Button
              onClick={loadData}
              className="mt-4 bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : weekSections.length === 0 ? (
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardContent className="py-10">
            <p className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">
              {search || filterMode === "pending"
                ? "No timesheets match the current filters."
                : "No weekly timesheets found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {weekSections.map(([weekStart, groups], sectionIndex) => {
            const weekStartDate = parseISO(weekStart);
            const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
            const pendingCount = groups.filter((group) => !group.approval).length;
            return (
              <details key={weekStart} open={sectionIndex === 0} className="group">
                <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(255,215,0,0.15)] bg-[#1A1A1A] px-5 py-3 hover:border-[rgba(255,215,0,0.3)]">
                  <div className="flex items-center gap-3">
                    <span className="font-bebas text-[22px] text-[#F5F5F0] tracking-wide">
                      Week of {format(weekStartDate, "MMM d")} – {format(weekEndDate, "MMM d, yyyy")}
                    </span>
                    <span className="font-space text-xs text-[rgba(245,245,240,0.55)] tabular-nums">
                      {groups.length} employee{groups.length === 1 ? "" : "s"}
                      {pendingCount > 0 && ` · ${pendingCount} pending`}
                    </span>
                  </div>
                  {pendingCount > 1 && (
                    <Button
                      size="sm"
                      disabled={bulkApprovingWeek === weekStart}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        approveAllInWeek(weekStart, groups);
                      }}
                      className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-[12px] font-semibold"
                    >
                      {bulkApprovingWeek === weekStart
                        ? "Approving..."
                        : `Approve All (${pendingCount})`}
                    </Button>
                  )}
                </summary>
                <div className="mt-3 space-y-4">
          {groups.map((group) => {
            const approvalKey = `${group.employeeId}:${group.weekStart}`;
            return (
              <Card
                key={approvalKey}
                className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="font-space text-lg text-[#F5F5F0]">
                        {group.employeeName}
                      </CardTitle>
                      <p className="font-space text-xs text-[rgba(245,245,240,0.55)] mt-1">
                        {group.employeeEmail}
                      </p>
                      <p className="font-space text-sm text-[#FFD700] mt-2 tabular-nums">
                        {group.totalHours.toFixed(1)}h logged
                      </p>
                    </div>
                    {group.approval ? (
                      <Badge className="bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.35)]">
                        Approved {format(parseISO(group.approval.approved_at), "MMM d, yyyy")}
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => approveWeek(group)}
                        disabled={approvingKey === approvalKey || bulkApprovingWeek === weekStart}
                        className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space font-semibold"
                      >
                        {approvingKey === approvalKey ? "Approving..." : "Approve Week"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,215,0,0.1)]">
                        <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.7)]">
                          Date
                        </th>
                        <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.7)]">
                          Category
                        </th>
                        <th className="py-2 text-right font-space text-xs uppercase text-[rgba(245,245,240,0.7)]">
                          Hours
                        </th>
                        <th className="py-2 text-right font-space text-xs uppercase text-[rgba(245,245,240,0.7)]">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-[rgba(255,215,0,0.06)]">
                          <td className="py-2 font-space text-sm text-[#F5F5F0]">
                            {format(parseISO(entry.work_date), "EEE, MMM d")}
                          </td>
                          <td className="py-2 font-space text-sm text-[rgba(245,245,240,0.75)]">
                            {entry.task_category || "—"}
                          </td>
                          <td className="py-2 font-space text-sm text-right text-[#FFD700] font-semibold">
                            {Number(entry.hours_logged).toFixed(1)}h
                          </td>
                          <td className="py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[rgba(255,215,0,0.25)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)]"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.2)] text-[#F5F5F0] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-space text-lg text-[#FFD700]">
              Daily Activity Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-3 font-space text-sm">
              <ReadOnlyRow label="Date" value={format(parseISO(selectedEntry.work_date), "MMM d, yyyy")} />
              <ReadOnlyRow label="Total Hours" value={`${Number(selectedEntry.hours_logged).toFixed(1)}h`} />
              <ReadOnlyRow label="Task Category" value={selectedEntry.task_category || "—"} />
              <ReadOnlyRow
                label="I-983 Objective Mapped"
                value={selectedEntry.i983_objective_mapped || "—"}
              />
              <ReadOnlyRow
                label="Training Hours"
                value={`${Number(selectedEntry.training_hours || 0).toFixed(1)}h`}
              />
              <ReadOnlyRow
                label="Billable Hours"
                value={`${Number(selectedEntry.billable_hours || 0).toFixed(1)}h`}
              />
              <div>
                <p className="text-[rgba(245,245,240,0.65)] mb-1">Task Description</p>
                <p className="text-[#F5F5F0] leading-relaxed whitespace-pre-wrap">
                  {selectedEntry.task_description || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTimesheetsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[rgba(245,245,240,0.6)] font-space">Loading timesheets...</div>}>
      <AdminTimesheetsContent />
    </Suspense>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <p className="text-[rgba(245,245,240,0.65)]">{label}</p>
      <p className="col-span-2 text-[#F5F5F0]">{value}</p>
    </div>
  );
}
