import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET single project with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    // Get enrolled employees
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `
        *,
        user:users(id, name, email, avatar_url)
      `,
      )
      .eq("project_id", id);

    // Get project days with tasks
    const { data: days } = await supabase
      .from("project_days")
      .select(
        `
        *,
        tasks:tasks(*)
      `,
      )
      .eq("project_id", id)
      .order("day_number", { ascending: true });

    return NextResponse.json({
      ...project,
      enrollments: enrollments || [],
      days: days || [],
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { message: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

// PUT update project
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: project, error } = await supabase
      .from("projects")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { message: "Failed to update project" },
      { status: 500 },
    );
  }
}

// DELETE project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Project deleted" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { message: "Failed to delete project" },
      { status: 500 },
    );
  }
}
