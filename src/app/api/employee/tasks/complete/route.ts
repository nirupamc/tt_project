import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { format } from "date-fns";

// POST complete a task
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, project_day_id, project_id, submission_data } = body;

    if (!task_id || !project_day_id || !project_id) {
      return NextResponse.json(
        { message: "Task ID, project day ID, and project ID are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check if user is enrolled in this project
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("project_id", project_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { message: "You are not enrolled in this project" },
        { status: 403 },
      );
    }

    // Create task completion
    const { data: completion, error: completionError } = await supabase
      .from("task_completions")
      .upsert(
        {
          user_id: session.user.id,
          task_id,
          project_day_id,
          submission_data,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,task_id",
        },
      )
      .select()
      .single();

    if (completionError) throw completionError;

    // Check if all required tasks for this day are complete
    const { data: dayTasks } = await supabase
      .from("tasks")
      .select("id, is_required")
      .eq("project_day_id", project_day_id);

    const requiredTaskIds =
      dayTasks?.filter((t) => t.is_required).map((t) => t.id) || [];

    const { data: completedTasks } = await supabase
      .from("task_completions")
      .select("task_id")
      .eq("user_id", session.user.id)
      .eq("project_day_id", project_day_id);

    const completedTaskIds = new Set(
      completedTasks?.map((t) => t.task_id) || [],
    );
    const allRequiredComplete = requiredTaskIds.every((id) =>
      completedTaskIds.has(id),
    );

    // If all required tasks complete, update timesheet
    if (allRequiredComplete) {
      const today = format(new Date(), "yyyy-MM-dd");

      await supabase.from("timesheets").upsert(
        {
          user_id: session.user.id,
          work_date: today,
          hours_logged: 5,
          project_id,
          notes: "Auto-logged: All required tasks completed",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,work_date,project_id",
        },
      );
    }

    return NextResponse.json({
      completion,
      all_required_complete: allRequiredComplete,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    return NextResponse.json(
      { message: "Failed to complete task" },
      { status: 500 },
    );
  }
}
