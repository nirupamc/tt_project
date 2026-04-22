import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("i983_plans")
      .select("*")
      .eq("employee_id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error("Error fetching I-983 plan:", error);
    return NextResponse.json(
      { message: "Failed to fetch I-983 plan" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const payload = {
      employee_id: id,
      version_date: body.version_date || null,
      dso_submission_date: body.dso_submission_date || null,
      dso_ack_uploaded: !!body.dso_ack_uploaded,
      dso_ack_file_url: body.dso_ack_file_url || null,
      next_eval_due: body.next_eval_due || null,
      objective_1_text: body.objective_1_text || null,
      objective_1_status: body.objective_1_status || "Not Started",
      objective_1_project_id: body.objective_1_project_id || null,
      objective_2_text: body.objective_2_text || null,
      objective_2_status: body.objective_2_status || "Not Started",
      objective_2_project_id: body.objective_2_project_id || null,
      objective_3_text: body.objective_3_text || null,
      objective_3_status: body.objective_3_status || "Not Started",
      objective_3_project_id: body.objective_3_project_id || null,
    };

    const { data, error } = await supabase
      .from("i983_plans")
      .upsert(payload, { onConflict: "employee_id" })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving I-983 plan:", error);
    return NextResponse.json(
      { message: "Failed to save I-983 plan" },
      { status: 500 },
    );
  }
}
