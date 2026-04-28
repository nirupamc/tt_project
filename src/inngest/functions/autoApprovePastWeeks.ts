import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase";
import { startOfWeek, format } from "date-fns";

export const autoApprovePastWeeks = inngest.createFunction(
  {
    id: "auto-approve-past-weeks",
    name: "Auto-Approve Past Weeks Timesheets",
  },
  // Every Friday at 11:59 PM CT (Saturday 05:59 UTC)
  { cron: "59 5 * * 6" },
  async ({ step }) => {
    await step.run("approve-past-weeks", async () => {
      const supabase = createAdminClient();

      // Get the start of the current week (Monday)
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

      // Get the admin user id to use as approver
      const { data: adminUser, error: adminError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (adminError || !adminUser) {
        console.error("Auto-approve: could not find admin user", adminError);
        return { error: "No admin user found" };
      }

      // Find all employee + week combinations that have entries but no approval
      // for any week BEFORE the current week
      const { data: timesheets, error: tsError } = await supabase
        .from("timesheets")
        .select("employee_id, work_date")
        .lt("work_date", format(currentWeekStart, "yyyy-MM-dd"));

      if (tsError || !timesheets) {
        console.error("Auto-approve: failed to fetch timesheets", tsError);
        return { error: "Failed to fetch timesheets" };
      }

      // Group by employee_id + week_start_date
      const weekMap = new Map<
        string,
        { employee_id: string; week_start_date: string }
      >();
      for (const ts of timesheets) {
        const weekStart = format(
          startOfWeek(new Date(ts.work_date), { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );
        const key = `${ts.employee_id}__${weekStart}`;
        if (!weekMap.has(key)) {
          weekMap.set(key, {
            employee_id: ts.employee_id,
            week_start_date: weekStart,
          });
        }
      }

      // Check existing approvals and insert missing ones
      let approvedCount = 0;
      for (const [, entry] of weekMap) {
        const { data: existing } = await supabase
          .from("timesheet_approvals")
          .select("id")
          .eq("employee_id", entry.employee_id)
          .eq("week_start_date", entry.week_start_date)
          .limit(1)
          .single();

        if (!existing) {
          const { error: insertError } = await supabase
            .from("timesheet_approvals")
            .insert({
              employee_id: entry.employee_id,
              week_start_date: entry.week_start_date,
              approved_by: adminUser.id,
              approved_at: new Date().toISOString(),
            });

          if (!insertError) {
            approvedCount++;
          } else {
            console.error(
              `Auto-approve: failed to insert approval for ${entry.employee_id} week ${entry.week_start_date}`,
              insertError
            );
          }
        }
      }

      console.log(`Auto-approve: inserted ${approvedCount} new approvals`);
      return { approvedCount };
    });
  }
);
