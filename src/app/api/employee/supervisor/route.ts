import { format, differenceInDays, startOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentWeek } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: employee, error: employeeError } = await supabase
      .from("users")
      .select("id, supervisor_id, supervisor_name, supervisor_email")
      .eq("id", session.user.id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // If no supervisor assigned, return null supervisor info
    if (!employee.supervisor_name) {
      return NextResponse.json({
        supervisor: null,
        supervisorName: null,
        supervisorEmail: null,
        lastCheckin: null,
        lastCheckinDaysAgo: null,
        thisWeekStatus: "not_submitted",
        latestNote: null,
        last_approval_date: null,
        current_week_status: "no_supervisor",
      });
    }

    const { weekStart, weekEnd } = getCurrentWeek();
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    const weekEndKey = format(weekEnd, "yyyy-MM-dd");

    const [
      { data: currentWeekEntries },
      { data: currentWeekApproval },
      { data: lastApproval },
      { data: latestCheckin },
    ] = await Promise.all([
      supabase
        .from("timesheets")
        .select("id")
        .eq("user_id", session.user.id)
        .gte("work_date", weekStartKey)
        .lte("work_date", weekEndKey),
      supabase
        .from("timesheet_approvals")
        .select("id")
        .eq("employee_id", session.user.id)
        .eq("week_start_date", weekStartKey)
        .maybeSingle(),
      supabase
        .from("timesheet_approvals")
        .select("approved_at")
        .eq("employee_id", session.user.id)
        .order("approved_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("supervisor_checkins")
        .select("checkin_date, note")
        .eq("employee_id", session.user.id)
        .order("checkin_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const hasEntriesThisWeek = (currentWeekEntries || []).length > 0;
    const approvedThisWeek = !!currentWeekApproval;
    const currentStatus = approvedThisWeek
      ? "approved"
      : hasEntriesThisWeek
        ? "awaiting_approval"
        : "no_entries";

    // Calculate days since last check-in
    let lastCheckinDaysAgo = null;
    if (latestCheckin?.checkin_date) {
      const checkinDate = new Date(latestCheckin.checkin_date);
      lastCheckinDaysAgo = differenceInDays(new Date(), checkinDate);
    }

    return NextResponse.json({
      supervisor: null, // Keep for backward compatibility
      supervisorName: employee.supervisor_name,
      supervisorEmail: employee.supervisor_email,
      lastCheckin: latestCheckin?.checkin_date || null,
      lastCheckinDaysAgo,
      thisWeekStatus: approvedThisWeek ? "approved" : hasEntriesThisWeek ? "awaiting_approval" : "not_submitted",
      latestNote: latestCheckin?.note ? latestCheckin.note.substring(0, 200) : null,
      last_approval_date: lastApproval?.approved_at || null,
      current_week_status: currentStatus,
    });
  } catch (error) {
    console.error("Error loading supervisor widget:", error);
    return NextResponse.json({ message: "Failed to load supervisor data" }, { status: 500 });
  }
}
