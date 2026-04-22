import { addDays, differenceInCalendarDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createNotification, hasSentAlertToday, logAlertSent } from "@/lib/alerts";
import { sendComplianceEmail } from "@/lib/email";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}` || authHeader === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.ADMIN_ALERT_EMAIL) {
      throw new Error("ADMIN_ALERT_EMAIL is not configured");
    }
    if (!process.env.NEXTAUTH_URL) {
      throw new Error("NEXTAUTH_URL is not configured");
    }

    const supabase = createAdminClient();
    const today = new Date();
    const eadWindowEnd = addDays(today, 90);
    const i983WindowEnd = addDays(today, 30);

    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, ead_number, ead_end_date, joining_date, supervisor_id")
      .eq("role", "employee");

    const employeeRows = users || [];
    const employeeIds = employeeRows.map((user) => user.id);

    const [{ data: supervisors }, { data: plans }] = await Promise.all([
      supabase.from("users").select("id, email, role"),
      supabase
        .from("i983_plans")
        .select(
          "employee_id, objective_1_text, objective_1_status, objective_2_text, objective_2_status, objective_3_text, objective_3_status",
        )
        .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const supervisorEmailMap = new Map((supervisors || []).map((user) => [user.id, user.email]));
    const adminUsers = (supervisors || []).filter((user) => user.role === "admin");
    const i983PlanMap = new Map((plans || []).map((plan) => [plan.employee_id, plan]));

    let eadSent = 0;
    let i983Sent = 0;

    for (const employee of employeeRows) {
      // Alert 1: EAD expiry warning to admin
      if (employee.ead_end_date) {
        const expiryDate = new Date(employee.ead_end_date);
        if (expiryDate >= today && expiryDate <= eadWindowEnd) {
          const alreadySent = await hasSentAlertToday(employee.id, "ead_expiry");
          if (!alreadySent) {
            const days = differenceInCalendarDays(expiryDate, today);
            const profileUrl = `${process.env.NEXTAUTH_URL}/admin/employees/${employee.id}`;
            await sendComplianceEmail({
              to: process.env.ADMIN_ALERT_EMAIL,
              subject: `Action Required — EAD Expiring: ${employee.name}`,
              heading: "Action Required — EAD Expiry Warning",
              html: `
                <p><strong>Employee:</strong> ${employee.name}</p>
                <p><strong>EAD Card Number:</strong> ${employee.ead_number || "Not on file"}</p>
                <p><strong>EAD Expiry Date:</strong> ${format(expiryDate, "MMMM d, yyyy")}</p>
                <p><strong>Days Remaining:</strong> ${days} days remaining</p>
                <p><a href="${profileUrl}" style="color:#FFD700;">Open employee profile</a></p>
                <p>Please initiate EAD renewal or OPT extension process immediately.</p>
              `,
            });
            await logAlertSent({ employeeId: employee.id, alertType: "ead_expiry" });
            for (const admin of adminUsers) {
              await createNotification({
                recipientUserId: admin.id,
                type: "ead_expiry",
                message: `${employee.name}'s EAD expires on ${format(expiryDate, "MMM d, yyyy")}.`,
                relatedUrl: `/admin/employees/${employee.id}`,
              });
            }
            eadSent += 1;
          }
        }
      }

      // Alert 2: I-983 evaluation due to supervisor + employee
      if (employee.joining_date) {
        const joiningDate = new Date(employee.joining_date);
        const dueDate = addDays(joiningDate, 365);
        if (dueDate >= today && dueDate <= i983WindowEnd) {
          const alreadySent = await hasSentAlertToday(employee.id, "i983_due");
          if (!alreadySent) {
            const supervisorEmail = employee.supervisor_id
              ? supervisorEmailMap.get(employee.supervisor_id)
              : undefined;
            const recipientEmails = [employee.email, supervisorEmail].filter(
              (mail): mail is string => !!mail,
            );
            if (recipientEmails.length > 0) {
              const plan = i983PlanMap.get(employee.id);
              const trainingPlanUrl = `${process.env.NEXTAUTH_URL}/admin/employees/${employee.id}`;
              const days = differenceInCalendarDays(dueDate, today);
              await sendComplianceEmail({
                to: recipientEmails,
                subject: `I-983 Evaluation Due — ${employee.name}`,
                heading: "I-983 Evaluation Due",
                html: `
                  <p><strong>Employee:</strong> ${employee.name}</p>
                  <p><strong>Evaluation Due Date:</strong> ${format(dueDate, "MMMM d, yyyy")}</p>
                  <p><strong>Days Remaining:</strong> ${days} days remaining</p>
                  <p><strong>Objective 1:</strong> ${plan?.objective_1_text || "Objective 1"} (${plan?.objective_1_status || "Not Started"})</p>
                  <p><strong>Objective 2:</strong> ${plan?.objective_2_text || "Objective 2"} (${plan?.objective_2_status || "Not Started"})</p>
                  <p><strong>Objective 3:</strong> ${plan?.objective_3_text || "Objective 3"} (${plan?.objective_3_status || "Not Started"})</p>
                  <p><a href="${trainingPlanUrl}" style="color:#FFD700;">Open employee Training Plan</a></p>
                  <p>The STEM OPT I-983 evaluation must be completed before the due date to maintain compliance.</p>
                `,
              });
              await logAlertSent({ employeeId: employee.id, alertType: "i983_due" });
              if (employee.supervisor_id) {
                await createNotification({
                  recipientUserId: employee.supervisor_id,
                  type: "i983_due",
                  message: `I-983 evaluation is due soon for ${employee.name}.`,
                  relatedUrl: `/admin/employees/${employee.id}`,
                });
              }
              i983Sent += 1;
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, sent: { ead_expiry: eadSent, i983_due: i983Sent } });
  } catch (error) {
    console.error("Error running daily alerts:", error);
    return NextResponse.json({ message: "Failed to run daily alerts" }, { status: 500 });
  }
}
