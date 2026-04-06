import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// GET single project for employee
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const supabase = createAdminClient();

    // Check enrollment and get start_date
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, start_date")
      .eq("user_id", session.user.id)
      .eq("project_id", projectId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { message: "You are not enrolled in this project" },
        { status: 403 },
      );
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    // Add enrollment start_date to the response
    const projectWithEnrollment = {
      ...project,
      enrollment_start_date: enrollment.start_date,
    };

    // Get days with tasks
    const { data: days } = await supabase
      .from("project_days")
      .select(
        `
        *,
        tasks:tasks(*)
      `,
      )
      .eq("project_id", projectId)
      .order("day_number", { ascending: true });

    // Get user's completions for this project
    const { data: completions } = await supabase
      .from("task_completions")
      .select("task_id, project_day_id")
      .eq("user_id", session.user.id);

    // Calculate which days are complete
    const completedDayNumbers: number[] = [];

    for (const day of days || []) {
      const requiredTasks =
        day.tasks?.filter((t: { is_required: boolean }) => t.is_required) || [];
      const completedTaskIds = new Set(
        completions
          ?.filter((c) => c.project_day_id === day.id)
          .map((c) => c.task_id) || [],
      );

      const allRequiredComplete = requiredTasks.every((t: { id: string }) =>
        completedTaskIds.has(t.id),
      );

      if (allRequiredComplete && requiredTasks.length > 0) {
        completedDayNumbers.push(day.day_number);
      }
    }

    return NextResponse.json({
      project: projectWithEnrollment,
      days: days || [],
      completed_day_numbers: completedDayNumbers,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { message: "Failed to fetch project" },
      { status: 500 },
    );
  }
}
