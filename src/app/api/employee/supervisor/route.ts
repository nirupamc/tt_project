import { format } from "date-fns";
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
      .select("id, supervisor_id")
      .eq("id", session.user.id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    if (!employee.supervisor_id) {
      return NextResponse.json({
        supervisor: null,
        last_approval_date: null,
        current_week_status: "no_supervisor",
      });
    }

    const { weekStart, weekEnd } = getCurrentWeek();
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    const weekEndKey = format(weekEnd, "yyyy-MM-dd");

    const [{ data: supervisor }, { data: currentWeekEntries }, { data: currentWeekApproval }, { data: lastApproval }] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, name, email, job_title")
          .eq("id", employee.supervisor_id)
          .single(),
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
      ]);

    const hasEntriesThisWeek = (currentWeekEntries || []).length > 0;
    const approvedThisWeek = !!currentWeekApproval;
    const currentStatus = approvedThisWeek
      ? "approved"
      : hasEntriesThisWeek
        ? "awaiting_approval"
        : "no_entries";

    return NextResponse.json({
      supervisor: supervisor || null,
      last_approval_date: lastApproval?.approved_at || null,
      current_week_status: currentStatus,
    });
  } catch (error) {
    console.error("Error loading supervisor widget:", error);
    return NextResponse.json({ message: "Failed to load supervisor data" }, { status: 500 });
  }
}
