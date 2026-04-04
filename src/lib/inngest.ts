import { Inngest } from "inngest";
import { createAdminClient } from "./supabase";
import { resend, FROM_EMAIL } from "./resend";
import { addDays, isWeekend, format } from "date-fns";

// Create the Inngest client
export const inngest = new Inngest({
  id: "tantech-upskill",
  name: "TanTech Upskill",
});

// Calculate which day number is "today" for a project
function calculateCurrentDayNumber(
  startDate: string,
  weekdaysOnly: boolean,
): number {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dayNumber = 0;
  let date = new Date(start);

  while (date <= today) {
    if (!weekdaysOnly || !isWeekend(date)) {
      dayNumber++;
    }
    date = addDays(date, 1);
  }

  return dayNumber;
}

// Daily reminder email function (runs at 8 AM IST)
export const dailyReminderEmail = inngest.createFunction(
  {
    id: "daily-reminder-email",
    name: "Daily Task Reminder Email",
    triggers: [{ cron: "TZ=Asia/Kolkata 0 8 * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient();

    // Step 1: Get all active, published projects with daily emails enabled
    const projects = await step.run("get-active-projects", async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_published", true)
        .eq("is_active", true)
        .eq("daily_reminder_emails", true)
        .not("start_date", "is", null);

      if (error) throw error;
      return data || [];
    });

    let emailsSent = 0;

    // Step 2: Process each project
    for (const project of projects) {
      const currentDay = calculateCurrentDayNumber(
        project.start_date!,
        project.weekdays_only,
      );

      // Skip if before start date or past end date
      if (currentDay < 1 || currentDay > project.total_days) {
        continue;
      }

      // Get the project day and tasks
      const dayData = await step.run(`get-day-${project.id}`, async () => {
        const { data: projectDay } = await supabase
          .from("project_days")
          .select(
            `
            *,
            tasks:tasks(id, title, task_type, description, is_required)
          `,
          )
          .eq("project_id", project.id)
          .eq("day_number", currentDay)
          .single();

        return projectDay;
      });

      if (!dayData || !dayData.tasks?.length) {
        continue;
      }

      // Get enrolled employees
      const enrollments = await step.run(
        `get-enrollments-${project.id}`,
        async () => {
          const { data } = await supabase
            .from("enrollments")
            .select(
              `
            user:users(id, name, email)
          `,
            )
            .eq("project_id", project.id);

          return data || [];
        },
      );

      // Send email to each enrolled employee
      for (const enrollment of enrollments) {
        const userData = enrollment.user as unknown as {
          id: string;
          name: string;
          email: string;
        } | null;
        if (!userData) continue;

        await step.run(`send-email-${userData.id}-${project.id}`, async () => {
          const taskListHtml = dayData.tasks
            .map(
              (task: {
                title: string;
                task_type: string;
                description?: string;
                is_required: boolean;
              }) => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                  <strong>${task.title}</strong>
                  ${task.is_required ? '<span style="color: #ef4444; margin-left: 8px;">(Required)</span>' : ""}
                  <br>
                  <small style="color: #6b7280; text-transform: capitalize;">${task.task_type}</small>
                  ${task.description ? `<br><small style="color: #9ca3af;">${task.description}</small>` : ""}
                </td>
              </tr>
            `,
            )
            .join("");

          const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/projects/${project.id}/day/${currentDay}`;

          if (!resend) {
            console.warn("Resend client not initialized - skipping email");
            return;
          }

          await resend.emails.send({
            from: FROM_EMAIL,
            to: userData.email,
            subject: `Your tasks for today — ${project.title}, Day ${currentDay}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Good Morning, ${userData.name}! 👋</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Here are your learning tasks for today</p>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  <h2 style="margin: 0 0 5px 0; color: #1f2937;">${project.title}</h2>
                  <p style="margin: 0 0 20px 0; color: #6b7280;">Day ${currentDay}: ${dayData.title || "Today's Tasks"}</p>
                  
                  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                      <tr style="background: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Today's Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${taskListHtml}
                    </tbody>
                  </table>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">Start Learning →</a>
                  </div>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0;">TanTech Upskill — This is an automated daily reminder</p>
                  <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} TanTech LLC</p>
                </div>
              </body>
              </html>
            `,
          });

          emailsSent++;
        });
      }
    }

    return { emailsSent, projectsProcessed: projects.length };
  },
);

// Auto-complete tasks at end of day (11:59 PM IST)
export const autoCompleteTasksCron = inngest.createFunction(
  {
    id: "auto-complete-tasks",
    name: "Auto Complete Tasks at EOD",
    triggers: [{ cron: "TZ=Asia/Kolkata 59 23 * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient();
    const today = format(new Date(), "yyyy-MM-dd");

    // Get all active projects
    const projects = await step.run("get-active-projects", async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true)
        .not("start_date", "is", null);

      return data || [];
    });

    let completionsCreated = 0;
    let timesheetsUpdated = 0;

    for (const project of projects) {
      const currentDay = calculateCurrentDayNumber(
        project.start_date!,
        project.weekdays_only,
      );

      if (currentDay < 1 || currentDay > project.total_days) {
        continue;
      }

      // Get today's project day
      const dayData = await step.run(`get-day-${project.id}`, async () => {
        const { data } = await supabase
          .from("project_days")
          .select("id")
          .eq("project_id", project.id)
          .eq("day_number", currentDay)
          .single();

        return data;
      });

      if (!dayData) continue;

      // Get all enrolled users
      const enrollments = await step.run(
        `get-enrollments-${project.id}`,
        async () => {
          const { data } = await supabase
            .from("enrollments")
            .select("user_id")
            .eq("project_id", project.id);

          return data || [];
        },
      );

      // Get tasks for this day
      const tasks = await step.run(`get-tasks-${project.id}`, async () => {
        const { data } = await supabase
          .from("tasks")
          .select("id")
          .eq("project_day_id", dayData.id);

        return data || [];
      });

      // Auto-complete tasks and update timesheets
      for (const enrollment of enrollments) {
        await step.run(
          `auto-complete-${enrollment.user_id}-${project.id}`,
          async () => {
            // Mark all incomplete tasks as complete
            for (const task of tasks) {
              const { data: existing } = await supabase
                .from("task_completions")
                .select("id")
                .eq("user_id", enrollment.user_id)
                .eq("task_id", task.id)
                .single();

              if (!existing) {
                await supabase.from("task_completions").insert({
                  user_id: enrollment.user_id,
                  task_id: task.id,
                  project_day_id: dayData.id,
                  submission_data: { auto_completed: true },
                });
                completionsCreated++;
              }
            }

            // Update timesheet
            const { data: existingTimesheet } = await supabase
              .from("timesheets")
              .select("id")
              .eq("user_id", enrollment.user_id)
              .eq("work_date", today)
              .eq("project_id", project.id)
              .single();

            if (!existingTimesheet) {
              await supabase.from("timesheets").insert({
                user_id: enrollment.user_id,
                work_date: today,
                hours_logged: 5,
                project_id: project.id,
                notes: "Auto-logged at end of day",
              });
              timesheetsUpdated++;
            }
          },
        );
      }
    }

    return { completionsCreated, timesheetsUpdated };
  },
);
