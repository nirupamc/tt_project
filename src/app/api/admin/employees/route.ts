import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase";

// GET all employees
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get all employees with their enrollment count
    const { data: employees, error } = await supabase
      .from("users")
      .select(
        `
        *,
        enrollments:enrollments(count)
      `,
      )
      .eq("role", "employee")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the data to include enrollment_count
    const employeesWithCount = employees?.map((emp) => ({
      ...emp,
      enrollment_count: emp.enrollments?.[0]?.count || 0,
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
    const { name, email, password } = body;

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
      })
      .select()
      .single();

    if (error) throw error;

    // Remove password_hash from response
    const { password_hash: _, ...safeEmployee } = employee;

    return NextResponse.json(safeEmployee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { message: "Failed to create employee" },
      { status: 500 },
    );
  }
}
