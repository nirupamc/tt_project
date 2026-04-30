import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { countElapsedWorkingDays } from "@/lib/day-unlock";

/**
 * POST /api/admin/backfill-project-days
 * 
 * One-time backfill endpoint to immediately process all existing employees
 * without waiting for the 6PM cron job. Auto-completes project days based
 * on elapsed working days since joining_date.
 * 
 * Admin-only. Call once after feature deployment.
 */
export async function POST() {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    let totalDaysCompleted = 0;
    let totalTasksCompleted = 0;
    const results: any[] = [];

    // Fetch all active enrollments with employee and project info
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select(`
        id,
        user_id,
        project_id,
        users!user_id (
          id,
          name,
          joining_date
        ),
        projects (
          id,
          title,
          total_days
        )
      `)
      .eq("status", "active");

    if (error || !enrollments) {
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    console.log(
      `[backfill-project-days] Processing ${enrollments.length} active enrollments`
    );

    // Process each enrollment
    for (const enrollment of enrollments) {
      const employee = (enrollment.users as any) || {};
      const project = (enrollment.projects as any) || {};

      if (!employee.joining_date) {
        console.log(`[backfill-project-days] Skipping enrollment ${enrollment.id}: no joining_date`);
        continue;
      }

      // Calculate elapsed working days
      const elapsedDays = countElapsedWorkingDays(employee.joining_date);
      if (elapsedDays === 0) {
        console.log(
          `[backfill-project-days] Skipping ${employee.name}: joining date is today or future`
        );
        continue;
      }

      // Fetch project days for this enrollment's project
      const { data: projectDays } = await supabase
        .from("project_days")
        .select("id, day_number, title")
        .eq("project_id", enrollment.project_id)
        .order("day_number", { ascending: true });

      if (!projectDays) {
        console.log(
          `[backfill-project-days] No project days found for project ${enrollment.project_id}`
        );
        continue;
      }

      // Days to complete are those where day_number <= elapsed days
      const daysToComplete = projectDays.filter(
        (pd) => pd.day_number <= elapsedDays
      );

      let daysCompletedForThis = 0;

      // For each day, insert completion record and mark tasks as completed
      for (const projectDay of daysToComplete) {
        // Check if already completed for this enrollment
        const { data: existing } = await supabase
          .from("enrollment_day_completions")
          .select("id")
          .eq("enrollment_id", enrollment.id)
          .eq("project_day_id", projectDay.id)
          .single();

        if (existing) {
          // Already completed, skip
          continue;
        }

        // Insert completion record
        const { error: insertError } = await supabase
          .from("enrollment_day_completions")
          .insert({
            enrollment_id: enrollment.id,
            project_day_id: projectDay.id,
            completed_at: new Date().toISOString(),
            completed_by_auto: true,
          });

        if (insertError) {
          console.error(
            `[backfill-project-days] Failed to insert completion for day ${projectDay.day_number}:`,
            insertError
          );
          continue;
        }

        // Mark all tasks for this day as completed
        const { error: taskError } = await supabase
          .from("tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by_auto: true,
          })
          .eq("project_day_id", projectDay.id)
          .neq("status", "completed");

        if (taskError) {
          console.error(
            `[backfill-project-days] Failed to complete tasks for day ${projectDay.day_number}:`,
            taskError
          );
          continue;
        }

        daysCompletedForThis++;
        totalDaysCompleted++;
        totalTasksCompleted++;
      }

      // Count total completed days for this enrollment
      const { count: completedCount } = await supabase
        .from("enrollment_day_completions")
        .select("id", { count: "exact" })
        .eq("enrollment_id", enrollment.id);

      // Update enrollment progress
      await supabase
        .from("enrollments")
        .update({
          completed_days: completedCount || 0,
          last_auto_completed_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id);

      results.push({
        enrollmentId: enrollment.id,
        employee: employee.name,
        joiningDate: employee.joining_date,
        elapsedWorkingDays: elapsedDays,
        daysCompletedNow: daysCompletedForThis,
        totalCompletedDays: completedCount || 0,
        totalProjectDays: projectDays.length,
      });
    }

    console.log(
      `[backfill-project-days] completed ${totalDaysCompleted} days, ${totalTasksCompleted} task sets`
    );

    return NextResponse.json({
      success: true,
      totalDaysCompleted,
      totalTasksCompleted,
      results,
    });
  } catch (error) {
    console.error("[backfill-project-days] error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
