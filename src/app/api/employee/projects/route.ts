import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getCompletedDummyProjects } from "@/lib/completed-projects";
import { backfillProjectDaysForEnrollment } from "@/lib/project-day-backfill";

// GET employee's enrolled projects (including dummy completed projects)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // First, get user's joining_date for dummy projects calculation
    const { data: userData } = await supabase
      .from("users")
      .select("joining_date")
      .eq("id", session.user.id)
      .single();

    // Get enrollments with project details
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select(
        `
        *,
        project:projects(*)
      `,
      )
      .eq("user_id", session.user.id);

    if (error) throw error;

    // For each project, calculate progress and add assigned_date
    const projectsWithProgress = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const project = enrollment.project;
        if (!project) return null;

        await backfillProjectDaysForEnrollment(supabase, {
          id: enrollment.id,
          user_id: enrollment.user_id,
          project_id: enrollment.project_id,
        });

        // FEATURE 1: Use assigned_date from enrollment (this is start_date field)
        const assignedDate = enrollment.start_date;
        
        if (!assignedDate) {
          console.warn(`Missing assigned_date for enrollment ${enrollment.id}, falling back to today`);
        }

        // Get total days with tasks
        const { count: totalDays } = await supabase
          .from("project_days")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id);

        // Get completed days (where all required tasks are done)
        const { data: completedTasks } = await supabase
          .from("task_completions")
          .select("project_day_id")
          .eq("user_id", session.user.id);

        const completedDayIds = new Set(
          completedTasks?.map((t) => t.project_day_id) || [],
        );

        // Include auto-completed days tracked per enrollment so the dashboard
        // progress bar reflects all completed project days.
        const { data: autoCompletedDays } = await supabase
          .from("enrollment_day_completions")
          .select("project_day_id")
          .eq("enrollment_id", enrollment.id);

        (autoCompletedDays || []).forEach((day) => {
          completedDayIds.add(day.project_day_id);
        });

        return {
          ...project,
          assigned_date: assignedDate || new Date().toISOString().split('T')[0], // Fallback to today
          progress: {
            completed_days: completedDayIds.size,
            total_days: totalDays || project.total_days,
          },
          is_dummy: false,
        };
      }),
    );

    // FEATURE 2: Get dummy completed projects based on tenure
    const dummyProjects = getCompletedDummyProjects(userData?.joining_date || null);

    // Merge dummy and real projects
    const allProjects = [
      ...dummyProjects,
      ...projectsWithProgress.filter(Boolean),
    ];

    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching employee projects:", error);
    return NextResponse.json(
      { message: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
