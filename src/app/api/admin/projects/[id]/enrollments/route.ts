import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET enrollments for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("enrollments")
      .select("*, users(*)")
      .eq("project_id", projectId);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { message: "Failed to fetch enrollments" },
      { status: 500 },
    );
  }
}

// POST enroll employees in project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { user_ids, start_date } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 },
      );
    }

    if (!start_date) {
      return NextResponse.json(
        { message: "Start date is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Create enrollment records with start_date
    const enrollments = user_ids.map((user_id: string) => ({
      user_id,
      project_id: projectId,
      start_date,
    }));

    const { data, error } = await supabase
      .from("enrollments")
      .insert(enrollments)
      .select();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Some employees are already enrolled" },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error enrolling employees:", error);
    return NextResponse.json(
      { message: "Failed to enroll employees" },
      { status: 500 },
    );
  }
}

// DELETE remove enrollment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ message: "Enrollment removed" });
  } catch (error) {
    console.error("Error removing enrollment:", error);
    return NextResponse.json(
      { message: "Failed to remove enrollment" },
      { status: 500 },
    );
  }
}
