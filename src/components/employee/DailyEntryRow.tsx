"use client";

import { Fragment, useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimesheetEntry {
  id: string;
  work_date: string;
  hours_logged: number;
  is_auto_generated?: boolean;
  task_category: string | null;
  task_description: string | null;
  i983_objective_mapped: string | null;
  training_hours: number | null;
  billable_hours: number | null;
}

interface DailyEntryRowProps {
  day: Date;
  entries: TimesheetEntry[];
  objectiveLabels?: string[];
  hoursPerWeekDaily?: number;
  isApproved?: boolean;
}

export function DailyEntryRow({
  day,
  entries,
  objectiveLabels = ["Objective 1", "Objective 2", "Objective 3"],
  hoursPerWeekDaily = 8,
  isApproved = false,
}: DailyEntryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dayKey = format(day, "yyyy-MM-dd");
  const dayTotal = entries.reduce((sum, entry) => sum + Number(entry.hours_logged || 0), 0);
  const hasEntry = entries.length > 0;
  const isMissing = !hasEntry;
  const missingHours = hoursPerWeekDaily - dayTotal;

  // Map objective values to labels
  const getObjectiveLabel = (value: string | null) => {
    if (!value) return "—";
    const index = parseInt(value.replace("objective_", "")) - 1;
    return objectiveLabels[index] || value;
  };

  if (isMissing) {
    return (
      <tr className="border-b border-[rgba(10,10,10,0.06)] bg-[rgba(239,68,68,0.06)]">
        <td className="py-3 px-3 font-space text-sm text-[#0A0A0A]">
          {format(day, "EEE, MMM d")}
        </td>
        <td className="py-3 px-3 font-space text-sm text-[rgba(10,10,10,0.6)]">
          [No entry — {missingHours.toFixed(1)} hours missing]
        </td>
        <td className="py-3 px-3 font-space text-sm text-center">—</td>
        <td className="py-3 px-3 font-space text-sm text-center">—</td>
        <td className="py-3 px-3 font-space text-sm text-center">—</td>
        <td className="py-3 px-3 font-space text-sm text-center">
          <Badge className="bg-[rgba(239,68,68,0.12)] text-[#dc2626] border border-[rgba(239,68,68,0.4)]">
            Missing
          </Badge>
        </td>
      </tr>
    );
  }

  // Single entry - show in main row
  if (entries.length === 1) {
    const entry = entries[0];
    return (
      <Fragment>
        <tr
          className="cursor-pointer border-b border-[rgba(10,10,10,0.06)] hover:bg-[rgba(10,10,10,0.02)]"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <td className="py-3 px-3 font-space text-sm text-[#0A0A0A]">
            {format(day, "EEE, MMM d")}
          </td>
          <td className="py-3 px-3 font-space text-sm text-[#FFD700] font-semibold">
            {dayTotal.toFixed(1)}h
          </td>
          <td className="py-3 px-3 font-space text-sm text-[rgba(10,10,10,0.8)]">
            {entry.task_category || "—"}
          </td>
          <td className="py-3 px-3 font-space text-sm text-[rgba(10,10,10,0.8)]">
            {getObjectiveLabel(entry.i983_objective_mapped)}
          </td>
          <td className="py-3 px-3 font-space text-sm text-center">
            {entry.is_auto_generated ? (
              <Badge className="bg-[rgba(34,197,94,0.12)] text-[#16a34a] border border-[rgba(22,163,74,0.4)] text-xs">
                Auto
              </Badge>
            ) : (
              "—"
            )}
          </td>
          <td className="py-3 px-3 font-space text-sm text-center">
            {isApproved ? (
              <Badge className="bg-[rgba(34,197,94,0.12)] text-[#16a34a] border border-[rgba(22,163,74,0.4)]">
                ✓
              </Badge>
            ) : (
              <Badge className="bg-[rgba(250,204,21,0.18)] text-[#a16207] border border-[rgba(250,204,21,0.45)]">
                ⏳
              </Badge>
            )}
          </td>
        </tr>
        {isExpanded && (
          <tr className="border-b border-[rgba(10,10,10,0.06)] bg-[rgba(10,10,10,0.02)]">
            <td colSpan={6} className="px-3 py-3">
              <div className="rounded-lg border border-[rgba(10,10,10,0.08)] bg-white p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-space text-xs font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-1">
                      Task Description
                    </p>
                    <p className="font-space text-sm text-[rgba(10,10,10,0.8)] whitespace-pre-wrap">
                      {entry.task_description || "No task description provided."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs font-space">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-1">
                        Training Hours
                      </p>
                      <p className="text-[rgba(10,10,10,0.8)]">
                        {Number(entry.training_hours || 0).toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-1">
                        Billable Hours
                      </p>
                      <p className="text-[rgba(10,10,10,0.8)]">
                        {Number(entry.billable_hours || 0).toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-1">
                        Total Hours
                      </p>
                      <p className="text-[rgba(10,10,10,0.8)]">
                        {Number(entry.hours_logged || 0).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  }

  // Multiple entries - show summary with expand
  return (
    <Fragment>
      <tr
        className="cursor-pointer border-b border-[rgba(10,10,10,0.06)] hover:bg-[rgba(10,10,10,0.02)]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="py-3 px-3 font-space text-sm text-[#0A0A0A]">
          {format(day, "EEE, MMM d")}
        </td>
        <td className="py-3 px-3 font-space text-sm text-[#FFD700] font-semibold">
          {dayTotal.toFixed(1)}h ({entries.length} entries)
        </td>
        <td className="py-3 px-3 font-space text-sm text-[rgba(10,10,10,0.6)]">
          Multiple
        </td>
        <td className="py-3 px-3 font-space text-sm text-center">—</td>
        <td className="py-3 px-3 font-space text-sm text-center">
          <ChevronDown
            className={`h-4 w-4 mx-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </td>
        <td className="py-3 px-3 font-space text-sm text-center">
          {isApproved ? (
            <Badge className="bg-[rgba(34,197,94,0.12)] text-[#16a34a] border border-[rgba(22,163,74,0.4)]">
              ✓
            </Badge>
          ) : (
            <Badge className="bg-[rgba(250,204,21,0.18)] text-[#a16207] border border-[rgba(250,204,21,0.45)]">
              ⏳
            </Badge>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-[rgba(10,10,10,0.06)] bg-[rgba(10,10,10,0.02)]">
          <td colSpan={6} className="px-3 py-3">
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[rgba(10,10,10,0.08)] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="font-space text-sm font-semibold text-[#0A0A0A]">
                      {entry.task_category || "Uncategorized"}
                    </p>
                    {entry.is_auto_generated && (
                      <span className="rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-1 text-[10px] font-space font-semibold text-[#16a34a]">
                        Auto-logged
                      </span>
                    )}
                  </div>
                  <p className="font-space text-xs text-[rgba(10,10,10,0.8)] whitespace-pre-wrap mb-2">
                    {entry.task_description || "No task description."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs font-space text-[rgba(10,10,10,0.7)]">
                    <span>{Number(entry.hours_logged || 0).toFixed(1)}h logged</span>
                    <span>Training: {Number(entry.training_hours || 0).toFixed(1)}h</span>
                    <span>Billable: {Number(entry.billable_hours || 0).toFixed(1)}h</span>
                    <span>Objective: {getObjectiveLabel(entry.i983_objective_mapped)}</span>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
