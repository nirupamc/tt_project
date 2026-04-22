// Force dynamic rendering
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";
import { AlertTriangle, FileCheck2, FileClock, ShieldAlert, ClipboardCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";

type AlertType = "missing_docs" | "ead_expiring" | "i983_due" | "timesheet_pending";

interface AlertRow {
  key: string;
  employeeId: string;
  employeeName: string;
  alertType: AlertType;
  daysRemaining: number | null;
  detail: string;
}

function getUrgencyClass(daysRemaining: number | null) {
  if (daysRemaining === null || daysRemaining < 0 || daysRemaining < 14) {
    return "bg-[rgba(239,68,68,0.12)] border-[rgba(248,113,113,0.4)]";
  }
  if (daysRemaining <= 30) {
    return "bg-[rgba(245,158,11,0.12)] border-[rgba(251,191,36,0.45)]";
  }
  return "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.35)]";
}

function getAlertLabel(alertType: AlertType) {
  switch (alertType) {
    case "missing_docs":
      return "Missing Documents";
    case "ead_expiring":
      return "EAD Expiring";
    case "i983_due":
      return "I-983 Due";
    case "timesheet_pending":
      return "Timesheet Pending";
  }
}

async function getComplianceData() {
  const supabase = createAdminClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [
    { data: employees, error: employeesError },
    { data: documents, error: docsError },
    { data: approvals, error: approvalsError },
    { data: timesheets, error: timesheetsError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, role, joining_date, ead_end_date")
      .eq("role", "employee"),
    supabase
      .from("employee_documents")
      .select("employee_id, document_type, status, file_url"),
    supabase
      .from("timesheet_approvals")
      .select("employee_id, week_start_date")
      .eq("week_start_date", format(weekStart, "yyyy-MM-dd")),
    supabase
      .from("timesheets")
      .select("user_id")
      .is("project_id", null)
      .gte("work_date", format(weekStart, "yyyy-MM-dd"))
      .lte("work_date", format(weekEnd, "yyyy-MM-dd")),
  ]);

  if (employeesError) throw employeesError;
  if (docsError) throw docsError;
  if (approvalsError) throw approvalsError;
  if (timesheetsError) throw timesheetsError;

  const employeeList = employees || [];
  const documentsByEmployee = new Map<string, Set<string>>();
  (documents || []).forEach((document) => {
    if (!document.file_url || document.status !== "uploaded") return;
    const current = documentsByEmployee.get(document.employee_id) || new Set<string>();
    current.add(document.document_type);
    documentsByEmployee.set(document.employee_id, current);
  });

  const completeDocsCount = employeeList.filter((employee) => {
    const uploaded = documentsByEmployee.get(employee.id);
    return uploaded && uploaded.size >= REQUIRED_DOCUMENTS.length;
  }).length;

  const employeeWeekEntries = new Set((timesheets || []).map((row) => row.user_id));
  const approvedEmployees = new Set((approvals || []).map((approval) => approval.employee_id));
  const pendingApprovalsCount = Array.from(employeeWeekEntries).filter(
    (employeeId) => !approvedEmployees.has(employeeId),
  ).length;

  const eadExpiringEmployees = employeeList
    .map((employee) => {
      if (!employee.ead_end_date) return null;
      const days = differenceInCalendarDays(new Date(employee.ead_end_date), new Date());
      if (days < 0 || days > 90) return null;
      return { employee, days };
    })
    .filter(Boolean) as { employee: (typeof employeeList)[number]; days: number }[];

  const i983DueEmployees = employeeList
    .map((employee) => {
      if (!employee.joining_date) return null;
      const dueDate = new Date(employee.joining_date);
      dueDate.setDate(dueDate.getDate() + 365);
      const days = differenceInCalendarDays(dueDate, new Date());
      if (days < 0 || days > 30) return null;
      return { employee, days, dueDate };
    })
    .filter(Boolean) as {
    employee: (typeof employeeList)[number];
    days: number;
    dueDate: Date;
  }[];

  const alerts: AlertRow[] = [];

  employeeList.forEach((employee) => {
    const uploadedCount = documentsByEmployee.get(employee.id)?.size || 0;
    if (uploadedCount < REQUIRED_DOCUMENTS.length) {
      alerts.push({
        key: `${employee.id}-missing-docs`,
        employeeId: employee.id,
        employeeName: employee.name,
        alertType: "missing_docs",
        daysRemaining: null,
        detail: `${REQUIRED_DOCUMENTS.length - uploadedCount} documents missing`,
      });
    }

    if (employeeWeekEntries.has(employee.id) && !approvedEmployees.has(employee.id)) {
      alerts.push({
        key: `${employee.id}-timesheet-pending`,
        employeeId: employee.id,
        employeeName: employee.name,
        alertType: "timesheet_pending",
        daysRemaining: differenceInCalendarDays(weekEnd, new Date()),
        detail: "Current week approval pending",
      });
    }
  });

  eadExpiringEmployees.forEach((item) => {
    alerts.push({
      key: `${item.employee.id}-ead`,
      employeeId: item.employee.id,
      employeeName: item.employee.name,
      alertType: "ead_expiring",
      daysRemaining: item.days,
      detail: `EAD expires on ${format(new Date(item.employee.ead_end_date!), "MMM d, yyyy")}`,
    });
  });

  i983DueEmployees.forEach((item) => {
    alerts.push({
      key: `${item.employee.id}-i983`,
      employeeId: item.employee.id,
      employeeName: item.employee.name,
      alertType: "i983_due",
      daysRemaining: item.days,
      detail: `Evaluation due ${format(item.dueDate, "MMM d, yyyy")}`,
    });
  });

  return {
    totalEmployees: employeeList.length,
    completeDocsCount,
    pendingApprovalsCount,
    eadExpiringEmployees,
    i983DueEmployees,
    alerts,
  };
}

export default async function AdminOverviewPage() {
  const data = await getComplianceData();

  const cards = [
    {
      title: "Employees with Complete Documents",
      value: `${data.completeDocsCount} / ${data.totalEmployees}`,
      subtitle: "full document files",
      icon: FileCheck2,
      href: "/admin/overview#active-alerts",
    },
    {
      title: "Timesheets Pending Approval",
      value: String(data.pendingApprovalsCount),
      subtitle: "this week",
      icon: FileClock,
      href: "/admin/timesheets?filter=pending",
    },
    {
      title: "EAD Cards Expiring",
      value: String(data.eadExpiringEmployees.length),
      subtitle: "within 90 days",
      icon: ShieldAlert,
      href: "/admin/overview#active-alerts",
    },
    {
      title: "I-983 Evaluations Due",
      value: String(data.i983DueEmployees.length),
      subtitle: "within 30 days",
      icon: ClipboardCheck,
      href: "/admin/overview#active-alerts",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-[#F5F5F0]">Overview</h1>
        <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-1">
          Compliance health dashboard
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="block bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">
                  {card.title}
                </p>
                <Icon className="h-5 w-5 text-[#FFD700]" />
              </div>
              <div className="font-bebas text-[42px] text-[#F5F5F0] leading-none mt-3">
                {card.value}
              </div>
              <p className="font-space text-[12px] text-[rgba(245,245,240,0.5)] mt-2">
                {card.subtitle}
              </p>
            </Link>
          );
        })}
      </div>

      <div id="active-alerts" className="mt-8">
        <h2 className="font-bebas text-3xl text-[#F5F5F0]">Active Compliance Alerts</h2>
        {data.alerts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[rgba(74,222,128,0.35)] bg-[rgba(74,222,128,0.08)] p-4">
            <p className="font-space text-sm text-[#4ade80]">
              ✓ All employees are compliant. No alerts at this time.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.key}
                className={`rounded-lg border p-4 ${getUrgencyClass(alert.daysRemaining)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#FFD700]" />
                    <Link
                      href={`/admin/employees/${alert.employeeId}`}
                      className="font-space text-sm font-semibold text-[#F5F5F0] hover:text-[#FFD700]"
                    >
                      {alert.employeeName}
                    </Link>
                    <span className="font-space text-xs text-[rgba(245,245,240,0.75)]">
                      {getAlertLabel(alert.alertType)}
                    </span>
                  </div>
                  <p className="font-space text-xs text-[rgba(245,245,240,0.85)]">
                    {alert.daysRemaining === null
                      ? "Overdue"
                      : alert.daysRemaining < 0
                        ? "Overdue"
                        : `${alert.daysRemaining} days remaining`}
                  </p>
                </div>
                <p className="font-space text-xs text-[rgba(245,245,240,0.7)] mt-2">
                  {alert.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
