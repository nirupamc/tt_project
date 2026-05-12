"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

interface SupervisorData {
  supervisorName: string | null;
  supervisorEmail: string | null;
  lastCheckin: string | null;
  lastCheckinDaysAgo: number | null;
  thisWeekStatus: "approved" | "awaiting_approval" | "not_submitted";
  latestNote: string | null;
}

export function MySupervisorWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupervisorData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/employee/supervisor");
        if (!response.ok) throw new Error("Failed to load supervisor data");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching supervisor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">
            My Supervisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-[rgba(10,10,10,0.05)] rounded w-1/3" />
            <div className="h-4 bg-[rgba(10,10,10,0.05)] rounded w-2/3" />
            <div className="h-4 bg-[rgba(10,10,10,0.05)] rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No supervisor assigned
  if (!data?.supervisorName) {
    return (
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">
            My Supervisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="font-space text-sm text-[rgba(10,10,10,0.8)]">
              No supervisor assigned yet. Contact HR at{" "}
              <a
                href="mailto:hr@tantech-llc.com"
                className="text-[#FFD700] hover:underline font-semibold"
              >
                hr@tantech-llc.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate if last check-in is more than 7 days ago
  const isOldCheckin =
    data.lastCheckinDaysAgo !== null && data.lastCheckinDaysAgo > 7;

  // Status badge colors
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
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
      <CardHeader>
        <CardTitle className="font-space text-lg text-[#0A0A0A]">
          My Supervisor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
          <div>
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
          <div>
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
        </div>
      </CardContent>
    </Card>
  );
}
