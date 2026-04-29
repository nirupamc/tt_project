import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET single employee with enrollments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: employee, error } = await supabase
      .from("users")
      .select("*, supervisor:users!supervisor_id(id, name, email, job_title)")
      .eq("id", id)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    // Get enrollments with project details
    const [{ data: enrollments }, { data: supervisor }] = await Promise.all([
      supabase
        .from("enrollments")
        .select(
          `
          *,
          project:projects(*)
        `,
        )
        .eq("user_id", id),
      employee.supervisor_id
        ? supabase
            .from("users")
            .select("id, name, email, job_title")
            .eq("id", employee.supervisor_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Remove password_hash from response
    const { password_hash: _, ...safeEmployee } = employee;

    return NextResponse.json({
      ...safeEmployee,
      supervisor: supervisor || null,
      enrollments: enrollments || [],
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee" },
      { status: 500 },
    );
  }
}

// DELETE employee
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", "employee");

    if (error) throw error;

    return NextResponse.json({ message: "Employee deleted" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { message: "Failed to delete employee" },
      { status: 500 },
    );
  }
}

// PUT update employee profile/compliance fields
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.joining_date) {
      return NextResponse.json(
        { message: "Joining Date is required" },
        { status: 400 },
      );
    }

    if (body.dso_email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(body.dso_email)) {
        return NextResponse.json(
          { message: "DSO Email must be a valid email address" },
          { status: 400 },
        );
      }
    }

    const payload = {
      name: body.name,
      email: body.email,
      joining_date: body.joining_date,
      hours_per_day:
        body.hours_per_day !== undefined ? Number(body.hours_per_day) : null,
      hourly_rate:
        body.hourly_rate !== undefined ? Number(body.hourly_rate) : null,
      opt_type: body.opt_type || null,
      ead_number: body.ead_number || null,
      ead_start_date: body.ead_start_date || null,
      ead_end_date: body.ead_end_date || null,
      job_title: body.job_title || null,
      hours_per_week:
        body.hours_per_week !== undefined && body.hours_per_week !== null
          ? Number(body.hours_per_week)
          : null,
      pay_rate:
        body.pay_rate !== undefined && body.pay_rate !== null
          ? Number(body.pay_rate)
          : null,
      work_location: body.work_location || null,
      university_name: body.university_name || null,
      dso_name: body.dso_name || null,
      dso_email: body.dso_email || null,
      i9_completion_date: body.i9_completion_date || null,
      everify_case_number: body.everify_case_number || null,
      everify_status: body.everify_status || null,
      supervisor_id: body.supervisor_id || null,
    };

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { message: "Failed to update employee" },
      { status: 500 },
    );
  }
}
