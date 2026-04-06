"use client";

import { useEffect } from "react";
import { EmployeeNav } from "@/components/employee/EmployeeNav";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { format } from "date-fns";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Auto-log timesheet on login (once per day)
    const autoLogTimesheet = async () => {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const lastLogged = sessionStorage.getItem("timesheet_logged_today");

        // Skip if already logged today
        if (lastLogged === today) {
          return;
        }

        // Call auto-log API
        const response = await fetch("/api/employee/timesheet/auto-log", {
          method: "POST",
        });

        if (response.ok) {
          // Mark as logged for today
          sessionStorage.setItem("timesheet_logged_today", today);
        }
      } catch (error) {
        // Handle errors silently - don't show to user
        console.error("Auto-log timesheet failed:", error);
      }
    };

    autoLogTimesheet();
  }, []);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#FAFAF8]">
        <EmployeeNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Toaster />
      </div>
    </SessionProvider>
  );
}
