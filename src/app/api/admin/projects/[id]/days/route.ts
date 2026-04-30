import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { DayUploadData } from "@/types";

async function importDays(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string,
  days: DayUploadData[],
) {
  let totalDays = 0;
  let totalTasks = 0;

  for (const dayData of days) {
    if (!dayData.day || !dayData.tasks) {
      continue;
    }

    const { data: day, error: dayError } = await supabase
      .from("project_days")
      .upsert(
        {
          project_id: projectId,
          day_number: dayData.day,
          title: dayData.title || `Day ${dayData.day}`,
        },
        {
          onConflict: "project_id,day_number",
        },
      )
      .select()
      .single();

    if (dayError) {
      console.error(`Error creating day ${dayData.day}:`, dayError);
      continue;
    }

    totalDays++;

    for (const taskData of dayData.tasks) {
      const { error: taskError } = await supabase.from("tasks").insert({
        project_day_id: day.id,
        title: taskData.title,
        task_type: taskData.type,
        description: taskData.description,
        is_required: taskData.is_required !== false,
        reading_content_md: taskData.reading_content_md,
        reading_time_minutes: taskData.reading_time_minutes,
        coding_starter_code: taskData.coding_starter_code,
        coding_language: taskData.coding_language,
        quiz_questions: taskData.quiz_questions,
      });

      if (taskError) {
        console.error(`Error creating task "${taskData.title}":`, taskError);
        continue;
      }

      totalTasks++;
    }
  }

  return { totalDays, totalTasks };
}

// GET days for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: days, error } = await supabase
      .from("project_days")
      .select(
        `
        *,
        tasks:tasks(*)
      `,
      )
      .eq("project_id", id)
      .order("day_number", { ascending: true });

    if (error) throw error;

    return NextResponse.json(days || []);
  } catch (error) {
    console.error("Error fetching days:", error);
    return NextResponse.json(
      { message: "Failed to fetch days" },
      { status: 500 },
    );
  }
}

// POST create new day
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabase = createAdminClient();

    const body = await request.json();

    if (Array.isArray(body) || Array.isArray(body?.days)) {
      const days: DayUploadData[] = Array.isArray(body) ? body : body.days;
      if (!days.length) {
        return NextResponse.json(
          { message: "Invalid JSON format. Expected array of days." },
          { status: 400 },
        );
      }

      const { totalDays, totalTasks } = await importDays(supabase, id, days);

      return NextResponse.json({
        message: `Successfully created ${totalDays} days and ${totalTasks} tasks`,
        days_created: totalDays,
        tasks_created: totalTasks,
      });
    }

    const { day_number, title } = body;

    if (!day_number) {
      return NextResponse.json(
        { message: "Day number is required" },
        { status: 400 },
      );
    }

    const { data: day, error } = await supabase
      .from("project_days")
      .insert({
        project_id: id,
        day_number,
        title,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: `Day ${day_number} already exists` },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json(day, { status: 201 });
  } catch (error) {
    console.error("Error creating day:", error);
    return NextResponse.json(
      { message: "Failed to create day" },
      { status: 500 },
    );
  }
}
