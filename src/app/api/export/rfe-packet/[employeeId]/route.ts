import { addMonths, differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";
import { RfePacketPdf } from "@/lib/rfe-packet-pdf";
import { createAdminClient } from "@/lib/supabase";

function asDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "supervisor")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employeeId } = await params;
    const supabase = createAdminClient();
    const sixMonthsAgo = addMonths(new Date(), -6);
    const sixMonthsAgoKey = format(sixMonthsAgo, "yyyy-MM-dd");

    const [{ data: employee }, { data: i983Plan }, { data: timesheets }, { data: approvals }, { data: documents }] =
      await Promise.all([
        supabase.from("users").select("*").eq("id", employeeId).single(),
        supabase.from("i983_plans").select("*").eq("employee_id", employeeId).maybeSingle(),
        supabase
          .from("timesheets")
          .select("*")
          .eq("user_id", employeeId)
          .gte("work_date", sixMonthsAgoKey)
          .order("work_date", { ascending: false }),
        supabase
          .from("timesheet_approvals")
          .select("week_start_date, approved_at, approved_by, approved_by_name")
          .eq("employee_id", employeeId)
          .order("week_start_date", { ascending: false }),
        supabase.from("employee_documents").select("*").eq("employee_id", employeeId),
      ]);

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const supervisor = employee.supervisor_id
      ? await supabase.from("users").select("name").eq("id", employee.supervisor_id).maybeSingle()
      : { data: null };

    const objectiveProjectIds = [
      i983Plan?.objective_1_project_id,
      i983Plan?.objective_2_project_id,
      i983Plan?.objective_3_project_id,
    ].filter((value): value is string => !!value);
    const { data: objectiveProjects } = objectiveProjectIds.length
      ? await supabase.from("projects").select("id, title").in("id", objectiveProjectIds)
      : { data: [] as Array<{ id: string; title: string }> };
    const projectMap = new Map((objectiveProjects || []).map((project) => [project.id, project.title]));

    const generatedAt = format(new Date(), "MMMM d, yyyy");
    const profileSummary = [
      ["Full Name", employee.name],
      ["University Name", employee.university_name],
      ["DSO Name", employee.dso_name],
      ["DSO Email", employee.dso_email],
      ["OPT Type", employee.opt_type],
      ["EAD Card Number", employee.ead_number],
      ["EAD Start Date", employee.ead_start_date ? format(new Date(employee.ead_start_date), "MMM d, yyyy") : "—"],
      ["EAD End Date", employee.ead_end_date ? format(new Date(employee.ead_end_date), "MMM d, yyyy") : "—"],
      ["Job Title", employee.job_title],
      ["Pay Rate", employee.pay_rate ? `$${Number(employee.pay_rate).toFixed(2)}/hr` : "—"],
      ["Hours Per Week", employee.hours_per_week ? `${employee.hours_per_week}` : "—"],
      ["E-Verify Case Number", employee.everify_case_number],
      ["E-Verify Status", employee.everify_status],
      ["Assigned Supervisor Name", supervisor.data?.name || "—"],
      ["Work Location", employee.work_location],
      ["Joining Date", employee.joining_date ? format(new Date(employee.joining_date), "MMM d, yyyy") : "—"],
      ["I-9 Completion Date", employee.i9_completion_date ? format(new Date(employee.i9_completion_date), "MMM d, yyyy") : "—"],
    ].map(([key, value]) => ({ key, value: value || "—" }));

    const nextEvalDate = i983Plan?.next_eval_due || (employee.joining_date ? format(addMonths(new Date(employee.joining_date), 12), "yyyy-MM-dd") : null);
    const daysUntilEval = nextEvalDate ? differenceInCalendarDays(new Date(nextEvalDate), new Date()) : null;
    const trainingSummary = [
      ["I-983 Version Date", i983Plan?.version_date ? format(new Date(i983Plan.version_date), "MMM d, yyyy") : "—"],
      ["DSO Submission Date", i983Plan?.dso_submission_date ? format(new Date(i983Plan.dso_submission_date), "MMM d, yyyy") : "—"],
      ["DSO Acknowledgement on File", i983Plan?.dso_ack_uploaded ? "Yes" : "No"],
      ["Next Evaluation Due Date", nextEvalDate ? format(new Date(nextEvalDate), "MMM d, yyyy") : "—"],
      ["Days until next evaluation", daysUntilEval !== null ? `${daysUntilEval}` : "—"],
    ].map(([key, value]) => ({ key, value }));

    const objectives = [
      {
        title: i983Plan?.objective_1_text || "Not set",
        status: i983Plan?.objective_1_status || "Not Started",
        mappedProject: i983Plan?.objective_1_project_id ? projectMap.get(i983Plan.objective_1_project_id) || "Unmapped" : "Unmapped",
      },
      {
        title: i983Plan?.objective_2_text || "Not set",
        status: i983Plan?.objective_2_status || "Not Started",
        mappedProject: i983Plan?.objective_2_project_id ? projectMap.get(i983Plan.objective_2_project_id) || "Unmapped" : "Unmapped",
      },
      {
        title: i983Plan?.objective_3_text || "Not set",
        status: i983Plan?.objective_3_status || "Not Started",
        mappedProject: i983Plan?.objective_3_project_id ? projectMap.get(i983Plan.objective_3_project_id) || "Unmapped" : "Unmapped",
      },
    ];

    const approvalMap = new Map((approvals || []).map((approval) => [approval.week_start_date, approval]));
    const weekMap = new Map<string, number>();
    for (const entry of timesheets || []) {
      const weekStart = format(startOfWeek(parseISO(entry.work_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + Number(entry.hours_logged || 0));
    }
    const weeklyRows = Array.from(weekMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([weekStartKey, total]) => {
        const weekStartDate = new Date(weekStartKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        const approval = approvalMap.get(weekStartKey);
        return [
          `${format(weekStartDate, "MMM d")} – ${format(weekEndDate, "MMM d, yyyy")}`,
          total.toFixed(1),
          approval ? "Approved" : "Pending",
          approval?.approved_by_name || "—",
          approval?.approved_at ? format(new Date(approval.approved_at), "MMM d, yyyy") : "—",
        ];
      });
    const totalHoursSixMonths = Array.from(weekMap.values()).reduce((sum, value) => sum + value, 0).toFixed(1);
    const objectiveLabelMap: Record<"objective_1" | "objective_2" | "objective_3", string> = {
      objective_1: "Objective 1",
      objective_2: "Objective 2",
      objective_3: "Objective 3",
    };

    const dailyRows = (timesheets || []).map((entry) => {
      const mappedObjective = entry.i983_objective_mapped as string | null;
      const objectiveLabel =
        mappedObjective === "objective_1" ||
        mappedObjective === "objective_2" ||
        mappedObjective === "objective_3"
          ? objectiveLabelMap[mappedObjective]
          : "—";
      return [
        format(new Date(entry.work_date), "MMM d, yyyy"),
        Number(entry.hours_logged || 0).toFixed(1),
        entry.task_category || "—",
        entry.task_description
          ? entry.task_description.length > 200
            ? `${entry.task_description.slice(0, 200)}...`
            : entry.task_description
          : "—",
        objectiveLabel,
        entry.training_hours !== null && entry.training_hours !== undefined ? Number(entry.training_hours).toFixed(1) : "—",
        entry.billable_hours !== null && entry.billable_hours !== undefined ? Number(entry.billable_hours).toFixed(1) : "—",
      ];
    });

    const approvalRows = (approvals || []).length
      ? (approvals || []).map((approval) => {
          const weekStartDate = new Date(approval.week_start_date);
          const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
          const approvedAt = asDate(approval.approved_at);
          return [
            `${format(weekStartDate, "MMM d")} – ${format(weekEndDate, "MMM d, yyyy")}`,
            approval.approved_by_name || "—",
            approvedAt ? format(approvedAt, "MMM d, yyyy") : "—",
            approvedAt ? format(approvedAt, "HH:mm 'UTC'") : "—",
          ];
        })
      : [["No supervisor approvals on record.", "—", "—", "—"]];

    const docMap = new Map((documents || []).map((doc) => [doc.document_type, doc]));
    const documentsRows = REQUIRED_DOCUMENTS.map((definition) => {
      const document = docMap.get(definition.type);
      const uploaded = !!document?.file_url && document?.status === "uploaded";
      return [
        definition.name,
        uploaded ? "✓ On File" : "✗ Missing",
        document?.uploaded_at ? format(new Date(document.uploaded_at), "MMM d, yyyy") : "—",
        definition.type === "ead_card" || definition.type === "current_i20"
          ? document?.expiry_date
            ? format(new Date(document.expiry_date), "MMM d, yyyy")
            : "—"
          : "—",
      ];
    });
    const documentsComplete = documentsRows.filter((row) => row[1] === "✓ On File").length;

    const packetDocument = React.createElement(RfePacketPdf, {
      data: {
        generatedAt,
        profileSummary,
        trainingSummary,
        objectives,
        weeklyTable: {
          columns: ["Week", "Total Hours Logged", "Approval Status", "Approved By", "Approval Date"],
          rows: weeklyRows,
        },
        totalHoursSixMonths,
        dailyLogsTable: {
          columns: ["Date", "Total Hours", "Task Category", "Task Description", "I-983 Objective Mapped", "Training Hours", "Billable Hours"],
          rows: dailyRows,
        },
        approvalLogTable: {
          columns: ["Week", "Supervisor Name", "Approval Date", "Approval Time"],
          rows: approvalRows,
        },
        documentsTable: {
          columns: ["Document Name", "Status", "Upload Date", "Expiry Date"],
          rows: documentsRows,
        },
        documentsCompleteText: `Documents Complete: ${documentsComplete} / 9`,
      },
    }) as unknown as React.ReactElement;

    const pdfBuffer = await renderToBuffer(packetDocument as any);

    const firstName = employee.name?.split(" ")[0] || "Employee";
    const lastName = employee.name?.split(" ").slice(1).join("_") || "User";
    const filename = `RFE_Packet_${lastName}_${firstName}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

    const bytes = new Uint8Array(pdfBuffer);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting RFE packet:", error);
    return NextResponse.json({ message: "Failed to export RFE packet" }, { status: 500 });
  }
}
