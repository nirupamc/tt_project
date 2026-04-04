import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// POST create task for a day
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  try {
    const { dayId } = await params;
    const body = await request.json();
    const {
      title,
      task_type,
      description,
      is_required,
      reading_content_md,
      reading_time_minutes,
      coding_starter_code,
      coding_language,
      quiz_questions,
    } = body;

    if (!title || !task_type) {
      return NextResponse.json(
        { message: "Title and task type are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_day_id: dayId,
        title,
        task_type,
        description,
        is_required: is_required !== false,
        reading_content_md,
        reading_time_minutes,
        coding_starter_code,
        coding_language,
        quiz_questions,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { message: "Failed to create task" },
      { status: 500 },
    );
  }
}

// DELETE task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { message: "Task ID is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) throw error;

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { message: "Failed to delete task" },
      { status: 500 },
    );
  }
}
