import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { format, isFuture, startOfWeek } from "date-fns";

const CATEGORY_OPTIONS = [
  "Frontend Development",
  "Backend Development",
  "API Integration",
  "Database",
  "Testing & QA",
  "DevOps",
  "Training",
  "Research",
  "Meeting",
  "Documentation",
];

// GET employee's daily timesheets + approval/objective context
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [{ data: timesheets, error }, { data: approvals }, { data: i983Plan }] =
      await Promise.all([
        supabase
          .from("timesheets")
          .select("*")
          .eq("user_id", session.user.id)
          .is("project_id", null)
          .order("work_date", { ascending: false }),
        supabase
          .from("timesheet_approvals")
          .select("week_start_date, approved_at, approved_by_name")
          .eq("employee_id", session.user.id),
        supabase
          .from("i983_plans")
          .select("objective_1_text, objective_2_text, objective_3_text")
          .eq("employee_id", session.user.id)
          .maybeSingle(),
      ]);

    if (error) throw error;

    const objectiveLabels = [
      i983Plan?.objective_1_text
        ? `Objective 1: ${i983Plan.objective_1_text.slice(0, 60)}`
        : "Objective 1",
      i983Plan?.objective_2_text
        ? `Objective 2: ${i983Plan.objective_2_text.slice(0, 60)}`
        : "Objective 2",
      i983Plan?.objective_3_text
        ? `Objective 3: ${i983Plan.objective_3_text.slice(0, 60)}`
        : "Objective 3",
    ];

    return NextResponse.json({
      entries: timesheets || [],
      approvals: approvals || [],
      objective_labels: objectiveLabels,
    });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { message: "Failed to fetch timesheets" },
      { status: 500 },
    );
  }
}

// POST create/update a daily activity log entry
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      work_date,
      total_hours,
      task_category,
      task_description,
      i983_objective_mapped,
      training_hours,
      billable_hours,
    } = body;

    if (!work_date || !total_hours || !task_category || !task_description) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const workDate = new Date(work_date);
    if (isFuture(workDate)) {
      return NextResponse.json(
        { message: "Date cannot be in the future" },
        { status: 400 },
      );
    }

    if (!CATEGORY_OPTIONS.includes(task_category)) {
      return NextResponse.json(
        { message: "Invalid task category" },
        { status: 400 },
      );
    }

    const parsedTotal = Number(total_hours);
    const parsedTraining = Number(training_hours);
    const parsedBillable = Number(billable_hours);

    if (parsedTotal < 0.5 || parsedTotal > 12) {
      return NextResponse.json(
        { message: "Total Hours must be between 0.5 and 12" },
        { status: 400 },
      );
    }

    if (task_description.trim().length < 100) {
      return NextResponse.json(
        {
          message:
            "Please describe your work in more detail (minimum 100 characters)",
        },
        { status: 400 },
      );
    }

    if (Number((parsedTraining + parsedBillable).toFixed(2)) !== Number(parsedTotal.toFixed(2))) {
      return NextResponse.json(
        { message: "Training Hours + Billable Hours must equal Total Hours" },
        { status: 400 },
      );
    }

    if (!["objective_1", "objective_2", "objective_3"].includes(i983_objective_mapped)) {
      return NextResponse.json(
        { message: "Invalid objective mapping" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const dateKey = format(workDate, "yyyy-MM-dd");

    const { data: existing } = await supabase
      .from("timesheets")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("work_date", dateKey)
      .is("project_id", null)
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: session.user.id,
      work_date: dateKey,
      hours_logged: parsedTotal,
      project_id: null,
      notes: "Daily activity log",
      task_category,
      task_description,
      i983_objective_mapped,
      training_hours: parsedTraining,
      billable_hours: parsedBillable,
    };

    let saved;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("timesheets")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("timesheets")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      saved = data;
    }

    // If this week was already approved, keep approval record; UI still reflects approved week.
    const weekStart = format(startOfWeek(workDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
    await supabase
      .from("timesheet_approvals")
      .select("id")
      .eq("employee_id", session.user.id)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error saving daily activity log:", error);
    return NextResponse.json(
      { message: "Failed to save daily activity log" },
      { status: 500 },
    );
  }
}
