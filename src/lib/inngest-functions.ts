import { Inngest } from "inngest";
import { createAdminClient } from "./supabase";
import { Resend } from "resend";
import { getUnlockedDayCount } from "./day-unlock";

// Create a local Inngest client instance to avoid circular dependency
const inngest = new Inngest({
  id: "tantech-upskill",
  name: "TanTech Upskill",
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const dailyReminder = inngest.createFunction(
  { 
    id: "daily-reminder",
    name: "Daily Task Reminder Emails",
    triggers: [{ cron: "0 9 * * *" }], // Every day at 9 AM UTC (3 AM CT / 4 AM CDT)
  },
  async ({ step }) => {
    const result = await step.run("send-daily-reminders", async () => {
      const supabase = createAdminClient();
      
      // Get all active enrollments with project info
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          user_id,
          project_id,
          start_date,
          users!inner(
            id,
            name,
            email
          ),
          projects!inner(
            id,
            title,
            total_days,
            is_active,
            daily_reminder_emails
          )
        `)
        .eq("projects.is_active", true)
        .eq("projects.daily_reminder_emails", true);

      if (error || !enrollments) {
        console.error("Error fetching enrollments:", error);
        return { success: false, sent: 0 };
      }

      let emailsSent = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const enrollment of enrollments) {
        try {
          const user = enrollment.users as any;
          const project = enrollment.projects as any;
          
          if (!enrollment.start_date) continue;

          // Calculate which day should be unlocked today
          const unlockedDays = getUnlockedDayCount(enrollment.start_date, project.total_days);
          
          if (unlockedDays === 0) {
            // Project hasn't started yet for this employee
            continue;
          }

          // Get today's day (the most recently unlocked day)
          const currentDay = unlockedDays;

          // Fetch tasks for today's day
          const { data: projectDay } = await supabase
            .from("project_days")
            .select(`
              id,
              day_number,
              title,
              tasks(
                id,
                title,
                task_type,
                is_required
              )
            `)
            .eq("project_id", project.id)
            .eq("day_number", currentDay)
            .single();

          if (!projectDay || !projectDay.tasks || projectDay.tasks.length === 0) {
            continue;
          }

          // Check if user already completed this day
          const { data: completions } = await supabase
            .from("task_completions")
            .select("task_id")
            .eq("user_id", user.id)
            .eq("project_day_id", projectDay.id);

          const completedTaskIds = new Set(completions?.map(c => c.task_id) || []);
          const remainingTasks = (projectDay.tasks as any[]).filter(
            task => task.is_required && !completedTaskIds.has(task.id)
          );

          if (remainingTasks.length === 0) {
            // Day already completed
            continue;
          }

          // Send email
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "noreply@tantech-llc.com",
            to: user.email,
            subject: `${project.title} - Day ${currentDay} Tasks`,
            html: generateEmailHTML({
              userName: user.name,
              projectTitle: project.title,
              dayNumber: currentDay,
              dayTitle: projectDay.title,
              tasks: remainingTasks,
              projectId: project.id,
            }),
          });

          emailsSent++;
        } catch (error) {
          console.error("Error sending email:", error);
        }
      }

      return { success: true, sent: emailsSent };
    });

    return result;
  }
);

function generateEmailHTML({
  userName,
  projectTitle,
  dayNumber,
  dayTitle,
  tasks,
  projectId,
}: {
  userName: string;
  projectTitle: string;
  dayNumber: number;
  dayTitle: string | null;
  tasks: any[];
  projectId: string;
}) {
  const taskList = tasks.map(task => {
    const iconMap: Record<string, string> = {
      reading: "📖",
      coding: "💻",
      quiz: "❓",
      video: "🎥",
    };
    const icon = iconMap[task.task_type] || "✓";
    
    return `<li style="margin: 8px 0; font-size: 15px;">${icon} ${task.title}</li>`;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Space Grotesk', Arial, sans-serif; background-color: #FAFAF8; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #0A0A0A; padding: 30px 20px; text-align: center;">
          <h1 style="font-family: 'Bebas Neue', Arial, sans-serif; color: #FFD700; margin: 0; font-size: 32px; letter-spacing: 2px;">
            TANTECH UPSKILL
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #0A0A0A; margin: 0 0 10px 0; font-size: 18px;">
            Hi ${userName},
          </h2>
          
          <p style="color: rgba(10,10,10,0.7); line-height: 1.6; margin: 0 0 20px 0;">
            You have new tasks available for <strong>${projectTitle}</strong>!
          </p>

          <div style="background-color: rgba(255,215,0,0.08); border-left: 4px solid #FFD700; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 5px 0; color: #0A0A0A; font-size: 20px;">
              Day ${dayNumber}${dayTitle ? `: ${dayTitle}` : ''}
            </h3>
            <p style="margin: 0; color: rgba(10,10,10,0.6); font-size: 14px;">
              ${tasks.length} task${tasks.length !== 1 ? 's' : ''} remaining
            </p>
          </div>

          <h4 style="color: #0A0A0A; margin: 20px 0 10px 0; font-size: 16px;">
            Today's Tasks:
          </h4>
          
          <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
            ${taskList}
          </ul>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/projects/${projectId}/day/${dayNumber}" 
               style="display: inline-block; background-color: #FFD700; color: #0A0A0A; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Start Learning
            </a>
          </div>

          <p style="color: rgba(10,10,10,0.5); font-size: 13px; margin: 20px 0 0 0; text-align: center;">
            Keep up the great work! 🚀
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F5F5F3; padding: 20px; text-align: center; border-top: 1px solid rgba(10,10,10,0.1);">
          <p style="color: rgba(10,10,10,0.5); font-size: 12px; margin: 0;">
            TanTech LLC © ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}