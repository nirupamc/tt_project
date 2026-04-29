import { addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employeeId } = await params;
    if (session.user.role === "employee" && session.user.id !== employeeId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: employee, error: employeeError } = await supabase
      .from("users")
      .select(
        "id, name, email, avatar_url, job_title, joining_date, opt_type, ead_number, ead_start_date, ead_end_date, hours_per_week, pay_rate, work_location, university_name, dso_name, dso_email, i9_completion_date, everify_case_number, everify_status, supervisor_id, supervisor:users!supervisor_id(id, name, email, job_title)",
      )
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    const weekEndKey = format(weekEnd, "yyyy-MM-dd");

    const [
      { data: documents, error: docsError },
      { data: i983Plan, error: planError },
      { data: approvals, error: approvalsError },
      { data: currentWeekEntries, error: entriesError },
    ] = await Promise.all([
      supabase.from("employee_documents").select("*").eq("employee_id", employeeId),
      supabase
        .from("i983_plans")
        .select(
          `
            *,
            objective_1_project:projects!objective_1_project_id(title),
            objective_2_project:projects!objective_2_project_id(title),
            objective_3_project:projects!objective_3_project_id(title)
          `,
        )
        .eq("employee_id", employeeId)
        .maybeSingle(),
      supabase
        .from("timesheet_approvals")
        .select("id, week_start_date, approved_at, approved_by_name")
        .eq("employee_id", employeeId)
        .order("approved_at", { ascending: false }),
      supabase
        .from("timesheets")
        .select("id")
        .eq("user_id", employeeId)
        .gte(
          "work_date",
          employee.joining_date && employee.joining_date > weekStartKey
            ? employee.joining_date
            : weekStartKey,
        )
        .lte("work_date", weekEndKey),
    ]);

    if (docsError || planError || approvalsError || entriesError) {
      throw docsError || planError || approvalsError || entriesError;
    }

    const docsByType = new Map((documents || []).map((doc) => [doc.document_type, doc]));
    const orderedDocuments = REQUIRED_DOCUMENTS.map((definition) => ({
      ...definition,
      ...(docsByType.get(definition.type) || {
        employee_id: employeeId,
        document_type: definition.type,
        file_url: null,
        uploaded_at: null,
        expiry_date: null,
        version_date: null,
        status: "missing",
      }),
    }));

    const uploadedCount = orderedDocuments.filter(
      (doc) => !!doc.file_url && doc.status === "uploaded",
    ).length;

    const currentWeekApproved = (approvals || []).some(
      (approval) => approval.week_start_date === weekStartKey,
    );
    const hasCurrentWeekEntries = (currentWeekEntries || []).length > 0;
    const currentWeekStatus = currentWeekApproved
      ? "approved"
      : hasCurrentWeekEntries
        ? "awaiting_approval"
        : "no_entries";

    const nextEvaluationDue = employee.joining_date
      ? addDays(new Date(employee.joining_date), 365)
      : null;

    const complianceFields = [
      employee.joining_date,
      employee.job_title,
      employee.hours_per_week,
      employee.pay_rate,
      employee.work_location,
      employee.opt_type,
      employee.ead_number,
      employee.ead_start_date,
      employee.ead_end_date,
      employee.i9_completion_date,
      employee.everify_case_number,
      employee.everify_status,
      employee.university_name,
      employee.dso_name,
      employee.dso_email,
      employee.supervisor_id,
    ];

    const hasI983Content = !!(
      i983Plan &&
      (i983Plan.objective_1_text ||
        i983Plan.objective_2_text ||
        i983Plan.objective_3_text ||
        i983Plan.version_date)
    );
    const hasComplianceContent = complianceFields.some((value) => !!value);
    const hasDocumentsContent = uploadedCount > 0;

    return NextResponse.json({
      employee,
      supervisor: (employee as any).supervisor || null,
      documents: orderedDocuments,
      documents_uploaded_count: uploadedCount,
      i983_plan: i983Plan || null,
      next_evaluation_due: nextEvaluationDue ? format(nextEvaluationDue, "yyyy-MM-dd") : null,
      timesheet: {
        last_approval_date: approvals?.[0]?.approved_at || null,
        current_week_status: currentWeekStatus,
      },
      empty_state: !hasComplianceContent && !hasI983Content && !hasDocumentsContent,
    });
  } catch (error) {
    console.error("Error fetching employee profile payload:", error);
    return NextResponse.json({ message: "Failed to fetch profile payload" }, { status: 500 });
  }
}
