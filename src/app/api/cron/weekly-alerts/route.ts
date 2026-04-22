import { format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  createNotification,
  getPreviousFullWeek,
  hasSentWeeklyAlert,
  logAlertSent,
  weekRangeLabel,
} from "@/lib/alerts";
import { sendComplianceEmail } from "@/lib/email";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}` || authHeader === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.NEXTAUTH_URL) {
      throw new Error("NEXTAUTH_URL is not configured");
    }

    const supabase = createAdminClient();
    const { weekStart, weekEnd } = getPreviousFullWeek();
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    const weekEndKey = format(weekEnd, "yyyy-MM-dd");
    const weekLabel = weekRangeLabel(weekStart, weekEnd);

    const { data: employees } = await supabase
      .from("users")
      .select("id, name, email, supervisor_id")
      .eq("role", "employee");

    const employeeRows = employees || [];
    const employeeIds = employeeRows.map((user) => user.id);

    const [{ data: supervisors }, { data: weekEntries }, { data: approvals }] = await Promise.all([
      supabase.from("users").select("id, email"),
      supabase
        .from("timesheets")
        .select("id, user_id, hours_logged, work_date")
        .in("user_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"])
        .gte("work_date", weekStartKey)
        .lte("work_date", weekEndKey),
      supabase
        .from("timesheet_approvals")
        .select("id, employee_id, week_start_date")
        .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("week_start_date", weekStartKey),
    ]);

    const supervisorMap = new Map((supervisors || []).map((user) => [user.id, user.email]));
    const entriesByEmployee = new Map<string, { count: number; totalHours: number }>();
    for (const entry of weekEntries || []) {
      const existing = entriesByEmployee.get(entry.user_id) || { count: 0, totalHours: 0 };
      existing.count += 1;
      existing.totalHours += Number(entry.hours_logged || 0);
      entriesByEmployee.set(entry.user_id, existing);
    }
    const approvalSet = new Set((approvals || []).map((item) => `${item.employee_id}:${item.week_start_date}`));

    let missingSent = 0;
    let pendingSent = 0;

    for (const employee of employeeRows) {
      const weekStats = entriesByEmployee.get(employee.id) || { count: 0, totalHours: 0 };
      const hasEntries = weekStats.count > 0;
      const approved = approvalSet.has(`${employee.id}:${weekStartKey}`);

      // Alert 3: employee missing timesheet for previous full week
      if (!hasEntries) {
        const alreadySent = await hasSentWeeklyAlert(employee.id, "timesheet_missing", weekStartKey);
        if (!alreadySent) {
          const timesheetUrl = `${process.env.NEXTAUTH_URL}/dashboard/timesheet`;
          const firstName = employee.name.split(" ")[0] || employee.name;
          await sendComplianceEmail({
            to: employee.email,
            subject: `Reminder — Timesheet Missing for Week of ${weekLabel}`,
            heading: "Timesheet Missing",
            html: `
              <p>Hi ${firstName},</p>
              <p><strong>Week:</strong> ${weekLabel}</p>
              <p>No hours were logged for this week. Please log your daily activity as soon as possible.</p>
              <p><a href="${timesheetUrl}" style="color:#FFD700;">Open my timesheet</a></p>
            `,
          });
          await createNotification({
            recipientUserId: employee.id,
            type: "timesheet_missing",
            message: `Your timesheet for the week of ${weekLabel} has no hours logged. Please update it.`,
            relatedUrl: "/dashboard/timesheet",
          });
          await logAlertSent({
            employeeId: employee.id,
            alertType: "timesheet_missing",
            weekStartDate: weekStartKey,
          });
          missingSent += 1;
        }
      }

      // Alert 4: supervisor sign-off pending for weeks with entries but not approved
      if (hasEntries && !approved && employee.supervisor_id) {
        const alreadySent = await hasSentWeeklyAlert(employee.id, "approval_pending", weekStartKey);
        if (!alreadySent) {
          const supervisorEmail = supervisorMap.get(employee.supervisor_id);
          if (supervisorEmail) {
            const adminTimesheetUrl = `${process.env.NEXTAUTH_URL}/admin/timesheets?filter=pending`;
            await sendComplianceEmail({
              to: supervisorEmail,
              subject: `Approval Needed — ${employee.name}'s Timesheet`,
              heading: "Supervisor Approval Needed",
              html: `
                <p><strong>Employee:</strong> ${employee.name}</p>
                <p><strong>Week:</strong> ${weekLabel}</p>
                <p><strong>Total Hours Logged:</strong> ${weekStats.totalHours.toFixed(1)}h</p>
                <p><a href="${adminTimesheetUrl}" style="color:#FFD700;">Open pending timesheets</a></p>
                <p>Please review and approve this timesheet to maintain STEM OPT compliance records.</p>
              `,
            });
            await createNotification({
              recipientUserId: employee.supervisor_id,
              type: "approval_pending",
              message: `${employee.name}'s timesheet for the week of ${weekLabel} is waiting for your approval.`,
              relatedUrl: "/admin/timesheets?filter=pending",
            });
            await logAlertSent({
              employeeId: employee.id,
              alertType: "approval_pending",
              weekStartDate: weekStartKey,
            });
            pendingSent += 1;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      week_start_date: weekStartKey,
      week_end_date: weekEndKey,
      sent: { timesheet_missing: missingSent, approval_pending: pendingSent },
    });
  } catch (error) {
    console.error("Error running weekly alerts:", error);
    return NextResponse.json({ message: "Failed to run weekly alerts" }, { status: 500 });
  }
}
