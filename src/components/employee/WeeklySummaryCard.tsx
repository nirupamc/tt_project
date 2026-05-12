"use client";

import { format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WeeklySummaryProps {
  weekStart: Date;
  totalHours: number;
  requiredHours: number | null;
  trainingHours: number;
  billableHours: number;
  supervisorApproval?: {
    approved_by_name: string;
    approved_at: string;
  } | null;
}

export function WeeklySummaryCard({
  weekStart,
  totalHours,
  requiredHours,
  trainingHours,
  billableHours,
  supervisorApproval,
}: WeeklySummaryProps) {
  const weekEnd = addDays(weekStart, 6);
  const isMetRequired = requiredHours ? totalHours >= requiredHours : null;
  const displayRequired = requiredHours || 40;

  return (
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl print:shadow-none print:border-[rgba(10,10,10,0.2)]">
      <CardHeader className="border-b border-[rgba(10,10,10,0.06)] pb-4 print:pb-3">
        <CardTitle className="font-space text-lg text-[#0A0A0A]">
          Week of {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 print:pt-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5 print:gap-4">
          {/* Total Hours */}
          <div className="space-y-1">
            <p className="text-xs font-space font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)]">
              Total Hours
            </p>
            <p className="text-3xl font-space font-bold text-[#FFD700]">
              {totalHours.toFixed(1)}h
            </p>
          </div>

          {/* Required Hours & Status */}
          <div className="space-y-1">
            <p className="text-xs font-space font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)]">
              Required Hours
            </p>
            <p className="font-space text-sm font-semibold text-[#0A0A0A]">
              {displayRequired.toFixed(1)}h
            </p>
            <div className="mt-2">
              {isMetRequired !== null && (
                <Badge
                  className={`${
                    isMetRequired
                      ? "bg-[rgba(34,197,94,0.12)] text-[#16a34a] border border-[rgba(22,163,74,0.4)]"
                      : "bg-[rgba(239,68,68,0.12)] text-[#dc2626] border border-[rgba(239,68,68,0.4)]"
                  }`}
                >
                  {isMetRequired ? "✓ Met" : "✗ Not Met"}
                </Badge>
              )}
            </div>
          </div>

          {/* Training Hours */}
          <div className="space-y-1">
            <p className="text-xs font-space font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)]">
              Training Hours
            </p>
            <p className="font-space text-sm font-semibold text-[#0A0A0A]">
              {trainingHours.toFixed(1)}h
            </p>
          </div>

          {/* Billable Hours */}
          <div className="space-y-1">
            <p className="text-xs font-space font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)]">
              Billable Hours
            </p>
            <p className="font-space text-sm font-semibold text-[#0A0A0A]">
              {billableHours.toFixed(1)}h
            </p>
          </div>

          {/* Supervisor Approval */}
          <div className="space-y-1 md:col-span-2 lg:col-span-1">
            <p className="text-xs font-space font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)]">
              Approval
            </p>
            {supervisorApproval ? (
              <div className="space-y-1">
                <p className="font-space text-xs text-[rgba(10,10,10,0.8)]">
                  {supervisorApproval.approved_by_name}
                </p>
                <p className="font-space text-xs text-[rgba(10,10,10,0.6)]">
                  {format(new Date(supervisorApproval.approved_at), "MMM d, yyyy")}
                </p>
              </div>
            ) : (
              <Badge className="bg-[rgba(250,204,21,0.18)] text-[#a16207] border border-[rgba(250,204,21,0.45)]">
                ⏳ Awaiting approval
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
