import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { DayUploadData } from "@/types";

// POST bulk upload tasks from JSON
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const days: DayUploadData[] = body.days || body;

    if (!Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { message: "Invalid JSON format. Expected array of days." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    let totalDays = 0;
    let totalTasks = 0;

    for (const dayData of days) {
      if (!dayData.day || !dayData.tasks) {
        continue;
      }

      // Create or update the project day
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

      // Create tasks for this day
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

    return NextResponse.json({
      message: `Successfully created ${totalDays} days and ${totalTasks} tasks`,
      days_created: totalDays,
      tasks_created: totalTasks,
    });
  } catch (error) {
    console.error("Error uploading tasks:", error);
    return NextResponse.json(
      { message: "Failed to upload tasks" },
      { status: 500 },
    );
  }
}
