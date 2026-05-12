import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [
      { data: user, error: userError },
      { data: plan, error: planError },
      { data: timesheetEntries, error: timesheetError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("joining_date, i983_version_date")
        .eq("id", session.user.id)
        .single(),
      supabase
        .from("i983_plans")
        .select(
          `
          *,
          objective_1_project:projects!objective_1_project_id(id, title),
          objective_2_project:projects!objective_2_project_id(id, title),
          objective_3_project:projects!objective_3_project_id(id, title)
        `,
        )
        .eq("employee_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("timesheets")
        .select("i983_objective_mapped")
        .eq("user_id", session.user.id),
    ]);

    if (userError) {
      console.error("❌ User query error:", userError);
      throw userError;
    }
    if (planError) {
      console.error("❌ Training plan query error:", planError);
      throw planError;
    }
    if (timesheetError) {
      console.error("❌ Timesheet query error:", timesheetError);
      throw timesheetError;
    }

    const nextEvalDate = user?.joining_date
      ? addDays(new Date(user.joining_date), 365)
      : null;

    // Count entries per objective
    const objectiveCounts = {
      objective_1:
        timesheetEntries?.filter(
          (e) => e.i983_objective_mapped === "objective_1",
        ).length || 0,
      objective_2:
        timesheetEntries?.filter(
          (e) => e.i983_objective_mapped === "objective_2",
        ).length || 0,
      objective_3:
        timesheetEntries?.filter(
          (e) => e.i983_objective_mapped === "objective_3",
        ).length || 0,
    };

    return NextResponse.json({
      plan: plan || null,
      next_evaluation_due: nextEvalDate
        ? format(nextEvalDate, "yyyy-MM-dd")
        : null,
      days_remaining: nextEvalDate
        ? differenceInCalendarDays(nextEvalDate, new Date())
        : null,
      i983_version_date: user?.i983_version_date || null,
      objective_entry_counts: objectiveCounts,
    });
  } catch (error) {
    console.error("❌ Error fetching training plan:", error);
    return NextResponse.json(
      { message: "Failed to fetch training plan", error: String(error) },
      { status: 500 },
    );
  }
}
