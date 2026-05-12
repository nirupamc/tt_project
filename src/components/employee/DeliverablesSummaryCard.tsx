"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export function DeliverablesSummaryCard() {
  const [summary, setSummary] = useState<{
    month_deliverables: number;
    projects_with_deliverables: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/employee/deliverables/summary");
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error("Failed to fetch summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading || !summary) {
    return null;
  }

  const { month_deliverables, projects_with_deliverables } = summary;

  if (month_deliverables === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-[#FFD700] to-[#E6C200] border-0 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0A0A0A] rounded-lg">
            <Package className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div>
            <p className="font-bebas text-[24px] text-[#0A0A0A] leading-none">
              This month:{" "}
              <span className="font-bold">{month_deliverables}</span>{" "}
              deliverable{month_deliverables === 1 ? "" : "s"}
            </p>
            <p className="font-space text-[13px] text-[rgba(10,10,10,0.7)] mt-1">
              across{" "}
              <span className="font-semibold">
                {projects_with_deliverables}
              </span>{" "}
              project{projects_with_deliverables === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
