import { Inngest } from "inngest";
import { createAdminClient } from "@/lib/supabase";
import { countElapsedWorkingDays } from "@/lib/day-unlock";

const inngest = new Inngest({
  id: "archway",
  name: "Archway",
});

/**
 * Auto-Complete Project Days
 * 
 * Runs every weekday at 6 PM CT (11 PM UTC) to:
 * 1. Calculate elapsed working days for each enrolled employee
 * 2. Auto-complete project days where day_number <= elapsed working days
 * 3. Auto-complete all tasks for those days
 * 4. Update enrollment progress
 * 
 * Uses per-enrollment completion tracking (enrollment_day_completions table)
 * so that shared project_days rows don't create state collisions between employees.
 */
export const autoCompleteProjectDays = inngest.createFunction(
  {
    id: "auto-complete-project-days",
    name: "Auto-Complete Project Days",
  },
  // Same schedule as auto-timesheet: 6PM CT weekdays = 11PM UTC Mon-Fri
  { cron: "0 23 * * 1-5" },
  async ({ step }) => {
    return await step.run("auto-complete-all-enrollments", async () => {
      const supabase = createAdminClient();

      let totalDaysCompleted = 0;
      let totalTasksCompleted = 0;
      const results: any[] = [];

      try {
        // Fetch all active enrollments with employee joining_date and project info
        const { data: enrollments, error } = await supabase
          .from("enrollments")
          .select(`
            id,
            user_id,
            project_id,
            completed_days,
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
          console.error(
            "[autoCompleteProjectDays] failed to fetch enrollments:",
            error
          );
          return {
            error: "Failed to fetch enrollments",
            totalDaysCompleted: 0,
            totalTasksCompleted: 0,
          };
        }

        // Process each active enrollment
        for (const enrollment of enrollments) {
          const employee = (enrollment.users as any) || {};
          const project = (enrollment.projects as any) || {};

          // Skip if no joining_date
          if (!employee.joining_date) {
            console.log(
              `[autoCompleteProjectDays] Skipping enrollment ${enrollment.id}: no joining_date`
            );
            continue;
          }

          // Calculate elapsed working days since joining
          const elapsedDays = countElapsedWorkingDays(employee.joining_date);

          if (elapsedDays === 0) {
            console.log(
              `[autoCompleteProjectDays] Skipping ${employee.name}: joining date is today or future`
            );
            continue;
          }

          // Fetch all project_days for this enrollment's project
          const { data: projectDays, error: pdError } = await supabase
            .from("project_days")
            .select("id, day_number, title")
            .eq("project_id", enrollment.project_id)
            .order("day_number", { ascending: true });

          if (pdError || !projectDays) {
            console.error(
              `[autoCompleteProjectDays] Failed to fetch project_days for project ${enrollment.project_id}:`,
              pdError
            );
            continue;
          }

          // Determine which days need to be completed for this enrollment
          // These are days where day_number <= elapsed working days
          const daysToComplete = projectDays.filter(
            (pd) => pd.day_number <= elapsedDays
          );

          // For each day that should be completed, check if it's already completed for this enrollment
          for (const projectDay of daysToComplete) {
            // Check if this day is already completed for this enrollment
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

            // Mark this day as completed for this enrollment
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
                `[autoCompleteProjectDays] Failed to mark day ${projectDay.day_number} as completed for ${employee.name}:`,
                insertError
              );
              continue;
            }

            // Mark all tasks for this project_day as completed (only non-completed ones)
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
                `[autoCompleteProjectDays] Failed to complete tasks for day ${projectDay.day_number}:`,
                taskError
              );
              continue;
            }

            totalDaysCompleted++;
            totalTasksCompleted++;

            console.log(
              `[autoCompleteProjectDays] Auto-completed: ${employee.name} — Day ${projectDay.day_number}: ${projectDay.title}`
            );
          }

          // Count total completed days for this enrollment
          const { count: completedCount } = await supabase
            .from("enrollment_day_completions")
            .select("id", { count: "exact" })
            .eq("enrollment_id", enrollment.id);

          // Update enrollment progress
          const { error: updateError } = await supabase
            .from("enrollments")
            .update({
              completed_days: completedCount || 0,
              last_auto_completed_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);

          if (updateError) {
            console.error(
              `[autoCompleteProjectDays] Failed to update enrollment ${enrollment.id}:`,
              updateError
            );
          }

          results.push({
            enrollmentId: enrollment.id,
            employee: employee.name,
            joiningDate: employee.joining_date,
            elapsedWorkingDays: elapsedDays,
            daysCompletedInThisBatch: daysToComplete.length,
            totalCompletedDays: completedCount || 0,
            totalProjectDays: projectDays.length,
          });
        }

        console.log(
          `[autoCompleteProjectDays] completed ${totalDaysCompleted} days, ${totalTasksCompleted} task sets`
        );

        return {
          success: true,
          totalDaysCompleted,
          totalTasksCompleted,
          results,
        };
      } catch (error) {
        console.error(
          "[autoCompleteProjectDays] unexpected error:",
          error
        );
        return {
          error: error instanceof Error ? error.message : "Unknown error",
          totalDaysCompleted,
          totalTasksCompleted,
        };
      }
    });
  }
);
