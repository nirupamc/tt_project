import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase";
import { getZoomAccessToken, createZoomMeeting } from "@/lib/zoom";
import { format, addDays } from "date-fns";
import { sendEmail } from "@/lib/resend";

export const dailyZoomMeeting = inngest.createFunction(
  { id: "daily-zoom-meeting", name: "Daily Zoom Meeting" },
  { cron: "30 15 * * 1-5" }, // 15:30 UTC = 9:00 PM IST (approx)
  async ({ event, step }) => {
    const supabase = createAdminClient();

    try {
      // Create Zoom meeting for today (IST 21:00)
      const today = new Date();
      const dateString = format(today, "yyyy-MM-dd");
      const startTimeISO = new Date().toISOString();
      const topic = `Daily Standup — ${dateString}`;

      // Get token in a step
      const tokenResult = await step.run("get-zoom-token", async () => {
        const t = await getZoomAccessToken();
        return t;
      });

      const accessToken = tokenResult?.access_token;

      // Create meeting
      const meeting = await step.run("create-zoom-meeting", async () => {
        return await createZoomMeeting({ topic, start_time: startTimeISO, duration: 60 }, accessToken);
      });

      // Persist zoom_meetings row
      const { data: zoomRow, error: zoomErr } = await supabase
        .from("zoom_meetings")
        .insert({ zoom_meeting_id: meeting.id, topic: meeting.topic, join_url: meeting.join_url, passcode: meeting.password || meeting.passcode, start_time: meeting.start_time, duration_mins: meeting.duration || 60 })
        .select("id")
        .single();

      if (zoomErr) throw zoomErr;

      // Associate with projects (link to all active projects) or specific project logic; here we link to all projects for simplicity
      const { data: projects } = await supabase.from("projects").select("id");

      if (projects && projects.length) {
        const inserts = projects.map((p: any) => ({ project_id: p.id, zoom_meeting_id: zoomRow.id, meeting_date: dateString }));
        const { error: pzErr } = await supabase.from("project_zoom_meetings").insert(inserts);
        if (pzErr) console.error("Failed to link projects to zoom meeting:", pzErr);
      }

      // Fetch active employees (role employee + active enrollments)
      const { data: employees } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "employee");

      if (!employees || employees.length === 0) return { message: "No employees" };

      // Send emails and notifications per employee in steps
      for (const employee of employees) {
        await step.run(`notify-${employee.id}`, async () => {
          // Send email via Resend - use a helper sendEmail if exists else fetch directly
          try {
            const html = `<p>Your daily standup meeting is ready.</p><p><a href="${meeting.join_url}">Join Meeting</a></p>`;
            // Use resend helper if available, otherwise use fetch
            if (typeof sendEmail === 'function') {
              await sendEmail({ to: employee.email, subject: `Daily Standup Meeting — ${dateString}`, html });
            } else {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "no-reply@archway.tantech",
                  to: employee.email,
                  subject: `Daily Standup Meeting — ${dateString}`,
                  html,
                }),
              });
            }

            // Insert notification
            const { error: notifErr } = await supabase.from("notifications").insert({
              employee_id: employee.id,
              type: "zoom_meeting",
              title: `Daily Standup — ${dateString}`,
              body: `Your daily standup meeting is ready. Join: ${meeting.join_url}`,
              metadata: { join_url: meeting.join_url, meeting_id: meeting.id, passcode: meeting.password || meeting.passcode },
            });

            if (notifErr) console.error("Failed to insert notification:", notifErr);
          } catch (err) {
            console.error("Failed to notify employee", employee.id, err);
            return { error: String(err) };
          }
        });
      }

      return { message: "dailyZoomMeeting completed" };
    } catch (err) {
      console.error("dailyZoomMeeting error:", err);
      throw err;
    }
  }
);
