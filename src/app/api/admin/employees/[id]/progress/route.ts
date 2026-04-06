import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET employee's project progress
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params;
    const supabase = createAdminClient();

    // Get all enrollments for this user
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select(
        `
        *,
        project:projects(*)
      `,
      )
      .eq("user_id", userId);

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json([]);
    }

    // For each enrollment, calculate progress
    const progressData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const projectId = enrollment.project.id;

        // Get all tasks for this project
        const { data: days } = await supabase
          .from("project_days")
          .select("id")
          .eq("project_id", projectId);

        if (!days || days.length === 0) {
          return {
            project_id: projectId,
            project: enrollment.project,
            total_tasks: 0,
            completed_tasks: 0,
            progress: 0,
            status: "Not Started",
          };
        }

        const dayIds = days.map((d) => d.id);

        // Get all tasks for these days
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id")
          .in("project_day_id", dayIds);

        const totalTasks = tasks?.length || 0;

        // Get completed tasks for this user
        const { data: completions } = await supabase
          .from("task_completions")
          .select("task_id")
          .eq("user_id", userId)
          .in("task_id", tasks?.map((t) => t.id) || []);

        const completedTasks = completions?.length || 0;
        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        let status = "Not Started";
        if (progress === 100) {
          status = "Completed";
        } else if (progress > 0) {
          status = "In Progress";
        }

        return {
          project_id: projectId,
          project: enrollment.project,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          progress,
          status,
        };
      }),
    );

    return NextResponse.json(progressData);
  } catch (error) {
    console.error("Error fetching employee progress:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee progress" },
      { status: 500 },
    );
  }
}
