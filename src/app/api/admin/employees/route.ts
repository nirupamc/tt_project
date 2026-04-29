import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase";
import { backfillTimesheetsForEmployee } from "@/lib/timesheet-backfill";

// GET employees or supervisors
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const supabase = createAdminClient();

    if (scope === "supervisors") {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, job_title")
        .in("role", ["admin", "supervisor"])
        .order("name", { ascending: true });

      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // Get all employees with their enrollment count
    const [{ data: employees, error }, { data: docs }] = await Promise.all([
      supabase
        .from("users")
        .select(
          `
          *,
          enrollments:enrollments(count)
        `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("employee_documents")
        .select("employee_id, status, file_url"),
    ]);

    if (error) throw error;

    const docsCountByEmployee = new Map<string, number>();
    (docs || []).forEach((doc) => {
      if (doc.status !== "uploaded" || !doc.file_url) return;
      docsCountByEmployee.set(
        doc.employee_id,
        (docsCountByEmployee.get(doc.employee_id) || 0) + 1,
      );
    });

    // Transform the data to include enrollment_count
    const employeesWithCount = employees?.map((emp) => ({
      ...emp,
      enrollment_count: emp.enrollments?.[0]?.count || 0,
      documents_uploaded_count: docsCountByEmployee.get(emp.id) || 0,
      enrollments: undefined, // Remove the raw enrollments data
    }));

    return NextResponse.json(employeesWithCount);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { message: "Failed to fetch employees" },
      { status: 500 },
    );
  }
}

// POST create new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      hours_per_day,
      hourly_rate,
      pay_rate,
      joining_date,
      hours_per_week,
      job_title,
      work_location,
      opt_type,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!joining_date) {
      return NextResponse.json(
        { message: "Joining Date is required" },
        { status: 400 },
      );
    }

    if (!job_title) {
      return NextResponse.json(
        { message: "Job Title is required" },
        { status: 400 },
      );
    }

    if (opt_type && !["OPT", "STEM OPT"].includes(opt_type)) {
      return NextResponse.json(
        { message: "OPT Type must be OPT or STEM OPT" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 },
      );
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 12);

    // Create the employee
    const { data: employee, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash,
        role: "employee",
        job_title,
        work_location: work_location || null,
        opt_type: opt_type || null,
        hours_per_day: hours_per_day ? parseFloat(hours_per_day) : 8.0,
        hours_per_week: hours_per_week ? parseFloat(hours_per_week) : 30,
        pay_rate: pay_rate ? parseFloat(pay_rate) : null,
        hourly_rate: pay_rate
          ? parseFloat(pay_rate)
          : hourly_rate
            ? parseFloat(hourly_rate)
            : 0.0,
        joining_date,
      })
      .select()
      .single();

    if (error) throw error;

    // Remove password_hash from response
    const { password_hash: _, ...safeEmployee } = employee;

    try {
      await backfillTimesheetsForEmployee(
        supabase,
        employee.id,
        joining_date,
        hours_per_week ? parseFloat(hours_per_week) : 40,
      );
    } catch (backfillError) {
      console.error("Timesheet backfill after employee creation failed:", backfillError);
    }

    return NextResponse.json(safeEmployee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { message: "Failed to create employee" },
      { status: 500 },
    );
  }
}
