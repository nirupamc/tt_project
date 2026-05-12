"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ComplianceStatus } from "@/app/api/employee/compliance-status/route";

export function ComplianceStatusBanner() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/employee/compliance-status");
        if (response.ok) {
          const data = (await response.json()) as ComplianceStatus;
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch compliance status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return null;
  }

  const bgColor =
    status.status === "red"
      ? "bg-red-50 border-red-200"
      : status.status === "amber"
        ? "bg-amber-50 border-amber-200"
        : "bg-green-50 border-green-200";

  const textColor =
    status.status === "red"
      ? "text-red-900"
      : status.status === "amber"
        ? "text-amber-900"
        : "text-green-900";

  const iconColor =
    status.status === "red"
      ? "text-red-600"
      : status.status === "amber"
        ? "text-amber-600"
        : "text-green-600";

  const Icon =
    status.status === "red"
      ? AlertCircle
      : status.status === "amber"
        ? AlertTriangle
        : CheckCircle2;

  return (
    <div
      className={`border ${bgColor} rounded-lg p-4 mb-6 flex items-start gap-3`}
    >
      <Icon className={`flex-shrink-0 w-5 h-5 mt-0.5 ${iconColor}`} />
      <div>
        <p className={`font-space font-medium ${textColor}`}>
          {status.message}
        </p>
      </div>
    </div>
  );
}
