import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase";
import { getUnlockedDayCount } from "@/lib/day-unlock";

export const autoSubmitTimesheet = inngest.createFunction(
  { id: "auto-submit-timesheet", name: "Auto Submit Timesheet" },
  { cron: "0 23 * * 1-5" }, // runs 11:00 PM UTC Mon-Fri (~6PM CT accounting DST)
  async ({ event, step }) => {
    const supabase = createAdminClient();

    try {
      // Compute current date in America/Chicago (CT) as YYYY-MM-DD
      const now = new Date();
      const ctFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const ctParts = ctFormatter.formatToParts(now);
      const ctYear = ctParts.find((p) => p.type === "year")!.value;
      const ctMonth = ctParts.find((p) => p.type === "month")!.value;
      const ctDay = ctParts.find((p) => p.type === "day")!.value;
      const ctDateString = `${ctYear}-${ctMonth}-${ctDay}`; // YYYY-MM-DD in CT

      // Fetch enrollments joined with user and project info
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select(
          `id, user_id, project_id, start_date, users(id, name, email, hours_per_day, role), projects(id, title, total_days)`
        );

      if (enrollErr) {
        throw enrollErr;
      }

      if (!enrollments || enrollments.length === 0) {
        return { message: "No enrollments found" };
      }

      // Process each enrollment one-by-one using step.run
      for (const enrollment of enrollments) {
        // Run per enrollment to allow fine-grained retries
        await step.run(`process-enrollment-${enrollment.id}`, async () => {
          try {
            const user = (enrollment as any).users;
            const project = (enrollment as any).projects || (enrollment as any).project || null;

            // Only employees
            if (!user || user.role !== "employee") return;

            // Ensure start_date exists
            const startDate = enrollment.start_date;
            if (!startDate) return;

            // Ensure project and total_days present
            const totalDays = project?.total_days;
            if (!project || !totalDays) return;

            // Compute unlocked day count
            const unlockedCount = getUnlockedDayCount(startDate, Number(totalDays || 0));
            if (!unlockedCount || unlockedCount <= 0) {
              return; // nothing unlocked today
            }

            const dayNumber = unlockedCount;

            // Fetch project_day for this day number
            const { data: pdData, error: pdErr } = await supabase
              .from("project_days")
              .select("id, title, description")
              .eq("project_id", project.id)
              .eq("day_number", dayNumber)
              .limit(1)
              .maybeSingle();

            if (pdErr) {
              throw pdErr;
            }

            const projectDay = (pdData as any) || null;

            // Fetch tasks for this project_day
            let tasks: any[] = [];
            if (projectDay) {
              const { data: taskData, error: taskErr } = await supabase
                .from("tasks")
                .select("id, title, description")
                .eq("project_day_id", projectDay.id)
                .order("id", { ascending: true });

              if (taskErr) {
                throw taskErr;
              }

              tasks = taskData || [];
            }

            // Check if timesheet already exists for this user & date
            const { data: existing, error: existErr } = await supabase
              .from("timesheets")
              .select("id")
              .eq("employee_id", user.id)
              .eq("work_date", ctDateString)
              .limit(1);

            if (existErr) throw existErr;
            if (existing && existing.length > 0) return; // already has entry

            // Build task_description string
            let taskDescription = "";
            if (tasks.length > 0) {
              taskDescription = tasks
                .map((t: any, i: number) => `Task ${i + 1}: ${t.title} — ${t.description || ""}.`)
                .join(" ");
            } else if (projectDay && projectDay.description) {
              taskDescription = projectDay.description;
            } else if (project && project.title) {
              taskDescription = `Auto-generated timesheet for project ${project.title}.`;
            }

            // Pad to minimum 100 chars using project day or project description if needed
            const padSource = (projectDay && projectDay.description) || project?.title || "Auto-generated entry.";
            while (taskDescription.length < 100) {
              taskDescription += " " + padSource;
              if (taskDescription.length > 1000) break; // safety
            }

            // Determine total_hours
            const hoursPerDay = user.hours_per_day && Number(user.hours_per_day) > 0 ? Number(user.hours_per_day) : 8;

            // Insert timesheet row
            const insertRow: any = {
              user_id: user.id,
              work_date: ctDateString,
              hours_logged: hoursPerDay,
              project_id: project.id,
              task_category: "Training",
              task_description: taskDescription,
              training_hours: 0,
              billable_hours: hoursPerDay,
              is_auto_generated: true,
              i983_objective_mapped: "objective_1",
            };

            const { data: inserted, error: insertErr } = await supabase
              .from("timesheets")
              .insert(insertRow)
              .select("id")
              .single();

            if (insertErr) {
              throw insertErr;
            }

            return { insertedId: inserted?.id };
          } catch (err) {
            // Log and continue (do not crash entire run)
            console.error("Enrollment processing error:", err);
            return { error: String(err) };
          }
        });
      }

      return { message: "autoSubmitTimesheet completed" };
    } catch (err) {
      console.error("autoSubmitTimesheet error:", err);
      throw err;
    }
  }
);
