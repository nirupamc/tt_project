"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SupervisorPayload {
  supervisor: {
    id: string;
    name: string;
    email: string;
    job_title: string | null;
  } | null;
  last_approval_date: string | null;
  current_week_status: "approved" | "awaiting_approval" | "no_entries" | "no_supervisor";
}

function StatusBadge({ status }: { status: SupervisorPayload["current_week_status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(34,197,94,0.14)] border border-[rgba(34,197,94,0.35)] px-3 py-1 text-xs font-space font-semibold text-green-700">
        ✓ This week approved
      </span>
    );
  }
  if (status === "awaiting_approval") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.35)] px-3 py-1 text-xs font-space font-semibold text-amber-700">
        ⏳ Awaiting approval
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[rgba(107,114,128,0.15)] border border-[rgba(107,114,128,0.35)] px-3 py-1 text-xs font-space font-semibold text-gray-700">
      No entries this week
    </span>
  );
}

export function MySupervisorCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupervisorPayload | null>(null);
  const supervisorEmail =
    data?.supervisor?.email === "admin@tantechllc.com"
      ? "omer@tantech-llc.com"
      : data?.supervisor?.email;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/employee/supervisor");
        if (!response.ok) throw new Error("Failed to fetch supervisor info");
        setData(await response.json());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch supervisor info");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.18)] rounded-xl mt-6">
        <CardContent className="py-6">
          <p className="font-space text-sm text-[rgba(245,245,240,0.65)]">Loading supervisor details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.supervisor || data.current_week_status === "no_supervisor") {
    return (
      <Card className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.18)] rounded-xl mt-6">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#FFD700]">My Supervisor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-space text-sm text-[rgba(245,245,240,0.7)]">
            No supervisor assigned yet. Please contact HR.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.18)] rounded-xl mt-6">
      <CardHeader>
        <CardTitle className="font-space text-lg text-[#FFD700]">My Supervisor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-space text-lg font-semibold text-[#F5F5F0]">{data.supervisor.name}</p>
          <p className="font-space text-sm text-[rgba(245,245,240,0.65)]">{supervisorEmail}</p>
        </div>
        <div>
          <a
            href={`mailto:${supervisorEmail}`}
            className="inline-flex items-center justify-center rounded-md border border-[#FFD700] px-4 py-2 text-sm font-medium text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] transition-colors"
          >
            Contact Supervisor
          </a>
        </div>
        <p className="font-space text-sm text-[rgba(245,245,240,0.72)]">
          {data.last_approval_date
            ? `Last approved: ${format(new Date(data.last_approval_date), "MMMM d, yyyy")}`
            : "No approvals yet."}
        </p>
        <StatusBadge status={data.current_week_status} />
      </CardContent>
    </Card>
  );
}
