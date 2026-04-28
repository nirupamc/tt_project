import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase";
import { getUnlockedDayCount } from "@/lib/day-unlock";
import { addDays, startOfWeek, endOfWeek, format } from "date-fns";

export const fridayWeeklySummary = inngest.createFunction(
  { id: "friday-weekly-summary", name: "Friday Weekly Summary" },
  { cron: "0 1 * * 6" }, // runs 01:00 UTC Saturday (~7PM CT Friday with DST caveat)
  async ({ event, step }) => {
    const supabase = createAdminClient();

    try {
      // Determine current week (Monday - Friday) in server local (use UTC dates but compute week boundaries)
      const now = new Date();
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      const friday = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch enrollments joined with user and project
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("id, user_id, project_id, start_date, users(id, name, email, hours_per_day, role), projects(id, title, total_days)");

      if (enrollErr) throw enrollErr;
      if (!enrollments || enrollments.length === 0) return { message: "No enrollments" };

      for (const enrollment of enrollments) {
        await step.run(`process-weekly-${enrollment.id}`, async () => {
          try {
            const user = (enrollment as any).users;
            const project = (enrollment as any).projects || (enrollment as any).project || null;
            if (!user || user.role !== "employee") return;
            if (!project) return;

            // Week start/end formatted
            const weekStart = format(monday, "yyyy-MM-dd");
            const weekEnd = format(friday, "yyyy-MM-dd");

            // Query timesheets for this user between weekStart and weekEnd (Mon-Fri)
            const { data: timesheets, error: tsErr } = await supabase
              .from("timesheets")
              .select("*")
              .eq("employee_id", user.id)
              .gte("work_date", weekStart)
              .lte("work_date", weekEnd);

            if (tsErr) throw tsErr;

            const totalHours = (timesheets || []).reduce((s: number, t: any) => s + Number(t.total_hours || 0), 0);
            const daysWorked = (timesheets || []).length;

            // Determine project progress
            const totalDays = Number(project.total_days || 0);
            const unlockedDays = getUnlockedDayCount(enrollment.start_date, totalDays);
            const progressPct = totalDays > 0 ? (unlockedDays / totalDays) * 100 : 0;

            // Determine tasks for the unlocked day this week (if any)
            const tasksRes = await supabase
              .from("project_days")
              .select("id, day_number, title")
              .eq("project_id", project.id)
              .lte("day_number", unlockedDays)
              .order("day_number", { ascending: false })
              .limit(1);

            const projectDay = tasksRes.data && tasksRes.data.length ? tasksRes.data[0] : null;

            // If we have a projectDay unlocked this week, mark its tasks completed and count them
            let tasksCompletedCount = 0;
            let tasksTotalCount = 0;
            if (projectDay) {
              const { data: tAll, error: tAllErr } = await supabase
                .from("tasks")
                .select("id")
                .eq("project_day_id", projectDay.id);
              if (tAllErr) throw tAllErr;
              tasksTotalCount = (tAll || []).length;

              if (tasksTotalCount > 0) {
                const { data: upd, error: updErr } = await supabase
                  .from("tasks")
                  .update({ status: "completed", completed_at: new Date().toISOString(), completed_by_auto: true })
                  .eq("project_day_id", projectDay.id);
                if (updErr) throw updErr;
                tasksCompletedCount = tasksTotalCount;
              }
            }

            // Insert weekly_summaries row (upsert unique constraint)
            const summaryRow = {
              employee_id: user.id,
              project_id: project.id,
              week_start: weekStart,
              week_end: weekEnd,
              total_hours: totalHours,
              days_worked: daysWorked,
              tasks_completed: tasksCompletedCount,
              tasks_total: tasksTotalCount,
              project_progress_pct: Number(progressPct.toFixed(2)),
            };

            const { data: inserted, error: insertErr } = await supabase
              .from("weekly_summaries")
              .upsert(summaryRow, { onConflict: ["employee_id", "project_id", "week_start"] })
              .select("id");

            if (insertErr) throw insertErr;

            return { inserted: inserted?.[0]?.id };
          } catch (err) {
            console.error("fridayWeeklySummary enrollment error:", err);
            return { error: String(err) };
          }
        });
      }

      return { message: "fridayWeeklySummary completed" };
    } catch (err) {
      console.error("fridayWeeklySummary error:", err);
      throw err;
    }
  }
);
