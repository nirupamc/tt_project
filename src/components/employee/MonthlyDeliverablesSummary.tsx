"use client";

import { useState, useEffect } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { Deliverable } from "@/types";

export function MonthlyDeliverablesSummary() {
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/employee/deliverables");
        if (!response.ok) throw new Error("Failed to load deliverables");

        const data = await response.json();
        const deliverables = data as Deliverable[];

        // Filter for this month
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const thisMonth = deliverables.filter((d) => {
          const delivDate = new Date(d.date);
          return delivDate >= monthStart && delivDate <= monthEnd;
        });

        // Count unique projects
        const uniqueProjects = new Set(thisMonth.map((d) => d.project_id));

        setThisMonthCount(thisMonth.length);
        setProjectsCount(uniqueProjects.size);
      } catch (error) {
        console.error("Error loading summary:", error);
        toast.error("Failed to load deliverables summary");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-[#FFD700]/5 to-[#FFC700]/5 border border-[#FFD700]/20">
        <CardContent className="pt-6">
          <div className="h-12 bg-[rgba(10,10,10,0.1)] rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFC700]/10 border-2 border-[#FFD700]/30 rounded-lg">
      <CardHeader>
        <CardTitle className="font-space text-[16px] text-[#0A0A0A] flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#FFD700]" />
          This Month's Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)] mb-2">
              Deliverables Logged
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-bebas text-[36px] text-[#FFD700] leading-none">
                {thisMonthCount}
              </span>
              <span className="font-space text-[13px] text-[rgba(10,10,10,0.5)]">
                deliverables
              </span>
            </div>
          </div>
          <div>
            <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)] mb-2">
              Projects Active
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-bebas text-[36px] text-[#FFD700] leading-none">
                {projectsCount}
              </span>
              <span className="font-space text-[13px] text-[rgba(10,10,10,0.5)]">
                project{projectsCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <p className="font-space text-[12px] text-[rgba(10,10,10,0.5)] mt-4 pt-4 border-t border-[#FFD700]/20">
          Keep logging deliverables to track your work and progress. Your supervisor will review them regularly.
        </p>
      </CardContent>
    </Card>
  );
}
