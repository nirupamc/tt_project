import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const employeeId = session.user.id;
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("weekly_summaries")
      .select(`*, projects:projects(id, title)`)
      .eq("employee_id", employeeId)
      .order("week_start", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("employee weekly summaries fetch error:", error);
      return NextResponse.json({ message: "Failed to fetch summaries" }, { status: 500 });
    }

    const rows = (data || []).map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      project_title: row.projects?.title || null,
      week_start: row.week_start,
      week_end: row.week_end,
      total_hours: row.total_hours,
      days_worked: row.days_worked,
      tasks_completed: row.tasks_completed,
      tasks_total: row.tasks_total,
      project_progress_pct: row.project_progress_pct,
      created_at: row.created_at,
    }));

    return NextResponse.json({ summaries: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
