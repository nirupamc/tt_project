import { eachDayOfInterval, format, isAfter, isWeekend, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function backfillTimesheetsForEmployee(
  supabase: SupabaseClient,
  employeeId: string,
  joiningDate: string,
  hoursPerWeek: number,
) {
  const joining = parseISO(joiningDate);
  const today = new Date();

  if (isAfter(joining, today)) {
    return { inserted: 0 };
  }

  const allDays = eachDayOfInterval({ start: joining, end: today });
  const weekdays = allDays.filter((day) => !isWeekend(day));

  if (weekdays.length === 0) {
    return { inserted: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from("timesheets")
    .select("work_date")
    .eq("user_id", employeeId)
    .gte("work_date", format(joining, "yyyy-MM-dd"))
    .lte("work_date", format(today, "yyyy-MM-dd"));

  if (existingError) {
    throw existingError;
  }

  const existingDates = new Set((existing || []).map((row) => row.work_date));
  const hoursPerDay = hoursPerWeek / 5;
  const rows = weekdays
    .filter((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return !existingDates.has(dateKey);
    })
    .map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayLabel = format(day, "EEEE, dd MMM yyyy");
      const description = [
        `Auto-generated entry for ${dayLabel}.`,
        "Daily training and project work as part of onboarding compliance.",
        "Hours are logged according to the employee's assigned work schedule.",
      ].join(" ");

      return {
        user_id: employeeId,
        work_date: dateKey,
        hours_logged: hoursPerDay,
        project_id: null,
        notes: "Auto-generated backfill",
        task_category: "Training",
        task_description: description,
        training_hours: 0,
        billable_hours: hoursPerDay,
        i983_objective_mapped: "objective_1",
        is_auto_generated: true,
      };
    });

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const { error: insertError } = await supabase.from("timesheets").insert(rows);
  if (insertError) {
    throw insertError;
  }

  return { inserted: rows.length };
}