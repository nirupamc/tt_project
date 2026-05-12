"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

interface SupervisorPayload {
  supervisorName: string | null;
  supervisorEmail: string | null;
  lastCheckin: string | null;
  lastCheckinDaysAgo: number | null;
  thisWeekStatus: "approved" | "awaiting_approval" | "not_submitted";
  latestNote: string | null;
  last_approval_date: string | null;
  current_week_status:
    | "approved"
    | "awaiting_approval"
    | "no_entries"
    | "no_supervisor";
}

export function MySupervisorCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupervisorPayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/employee/supervisor");
        if (!response.ok) throw new Error("Failed to fetch supervisor info");
        setData(await response.json());
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to fetch supervisor info",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl mt-6">
        <CardContent className="py-6">
          <p className="font-space text-sm text-[rgba(10,10,10,0.6)]">
            Loading supervisor details...
          </p>
        </CardContent>
      </Card>
    );
  }

  // No supervisor assigned
  if (!data?.supervisorName) {
    return (
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl mt-6">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">
            My Supervisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-space text-sm text-[rgba(10,10,10,0.8)]">
            No supervisor assigned yet. Contact HR at{" "}
            <a
              href="mailto:hr@tantech-llc.com"
              className="text-[#FFD700] hover:underline font-semibold"
            >
              hr@tantech-llc.com
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate if last check-in is more than 7 days ago
  const isOldCheckin =
    data.lastCheckinDaysAgo !== null && data.lastCheckinDaysAgo > 7;

  // Status badge configuration
  const statusConfig = {
    approved: {
      bg: "bg-[rgba(34,197,94,0.12)]",
      text: "text-[#16a34a]",
      border: "border-[rgba(22,163,74,0.4)]",
      label: "✓ Approved",
    },
    awaiting_approval: {
      bg: "bg-[rgba(250,204,21,0.18)]",
      text: "text-[#a16207]",
      border: "border-[rgba(250,204,21,0.45)]",
      label: "⏳ Awaiting Approval",
    },
    not_submitted: {
      bg: "bg-[rgba(239,68,68,0.12)]",
      text: "text-[#dc2626]",
      border: "border-[rgba(239,68,68,0.4)]",
      label: "✗ Not Submitted",
    },
  };

  const status = statusConfig[data.thisWeekStatus];

  return (
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl mt-6">
      <CardHeader>
        <CardTitle className="font-space text-lg text-[#0A0A0A]">
          My Supervisor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supervisor Name & Contact */}
        <div>
          <p className="font-space text-sm font-semibold text-[#0A0A0A] mb-2">
            {data.supervisorName}
          </p>
          {data.supervisorEmail && (
            <a
              href={`mailto:${data.supervisorEmail}`}
              className="inline-flex items-center gap-2 font-space text-xs text-[#FFD700] hover:text-[#FFE44D] font-semibold"
            >
              <Mail className="h-4 w-4" />
              Contact Supervisor
            </a>
          )}
        </div>

        {/* Last Check-in Date */}
        <div className="pt-2 border-t border-[rgba(10,10,10,0.06)]">
          <p className="font-space text-xs font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-1">
            Last Check-in
          </p>
          {data.lastCheckin ? (
            <p
              className={`font-space text-sm ${isOldCheckin ? "text-[#a16207]" : "text-[rgba(10,10,10,0.8)]"}`}
            >
              {format(parseISO(data.lastCheckin), "MMM d, yyyy")}
              {isOldCheckin && (
                <span className="ml-2 text-[#a16207] font-semibold">
                  ({data.lastCheckinDaysAgo} days ago)
                </span>
              )}
            </p>
          ) : (
            <p className="font-space text-sm text-[rgba(10,10,10,0.6)]">
              No check-in logged yet
            </p>
          )}
        </div>

        {/* This Week's Status */}
        <div className="pt-2 border-t border-[rgba(10,10,10,0.06)]">
          <p className="font-space text-xs font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-2">
            This Week's Status
          </p>
          <Badge
            className={`${status.bg} ${status.text} border ${status.border}`}
          >
            {status.label}
          </Badge>
        </div>

        {/* Latest Note */}
        {data.latestNote && (
          <div className="pt-2 border-t border-[rgba(10,10,10,0.06)]">
            <p className="font-space text-xs font-semibold uppercase tracking-wide text-[rgba(10,10,10,0.7)] mb-2">
              What your supervisor noted last week:
            </p>
            <p className="font-space text-sm text-[rgba(10,10,10,0.8)] leading-relaxed">
              {data.latestNote}
              {data.latestNote.length === 200 && "…"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
