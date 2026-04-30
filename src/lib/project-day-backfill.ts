import type { SupabaseClient } from "@supabase/supabase-js";
import { countElapsedWorkingDays } from "@/lib/day-unlock";

type EnrollmentSummary = {
  id: string;
  user_id: string;
  project_id: string;
};

type ProjectDayRow = {
  id: string;
  day_number: number;
  title: string | null;
};

/**
 * Backfill project day completions for a single enrollment.
 *
 * This is idempotent and safe to call from read paths:
 * - inserts missing enrollment_day_completions rows
 * - marks all tasks for completed days as completed
 * - updates enrollments.completed_days and last_auto_completed_at
 */
export async function backfillProjectDaysForEnrollment(
  supabase: SupabaseClient,
  enrollment: EnrollmentSummary,
): Promise<{ daysCompleted: number; totalCompletedDays: number } | null> {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("joining_date, name")
    .eq("id", enrollment.user_id)
    .single();

  if (userError || !user?.joining_date) {
    return null;
  }

  const elapsedDays = countElapsedWorkingDays(user.joining_date);
  if (elapsedDays <= 0) {
    return null;
  }

  const { data: projectDays, error: projectDaysError } = await supabase
    .from("project_days")
    .select("id, day_number, title")
    .eq("project_id", enrollment.project_id)
    .order("day_number", { ascending: true });

  if (projectDaysError || !projectDays || projectDays.length === 0) {
    return null;
  }

  const daysToComplete = (projectDays as ProjectDayRow[]).filter(
    (projectDay) => projectDay.day_number <= elapsedDays,
  );

  if (daysToComplete.length === 0) {
    return null;
  }

  const timestamp = new Date().toISOString();

  await supabase.from("enrollment_day_completions").upsert(
    daysToComplete.map((projectDay) => ({
      enrollment_id: enrollment.id,
      project_day_id: projectDay.id,
      completed_at: timestamp,
      completed_by_auto: true,
    })),
    {
      onConflict: "enrollment_id,project_day_id",
      ignoreDuplicates: true,
    },
  );

  for (const projectDay of daysToComplete) {
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: timestamp,
        completed_by_auto: true,
      })
      .eq("project_day_id", projectDay.id)
      .neq("status", "completed");
  }

  const { count: completedCount } = await supabase
    .from("enrollment_day_completions")
    .select("id", { count: "exact" })
    .eq("enrollment_id", enrollment.id);

  await supabase
    .from("enrollments")
    .update({
      completed_days: completedCount || 0,
      last_auto_completed_at: timestamp,
    })
    .eq("id", enrollment.id);

  return {
    daysCompleted: daysToComplete.length,
    totalCompletedDays: completedCount || 0,
  };
}