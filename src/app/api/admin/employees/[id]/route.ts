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
      .select("*")
      .eq("id", id)
      .eq("role", "employee")
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    // Get enrollments with project details
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `
        *,
        project:projects(*)
      `,
      )
      .eq("user_id", id);

    // Remove password_hash from response
    const { password_hash: _, ...safeEmployee } = employee;

    return NextResponse.json({
      ...safeEmployee,
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
