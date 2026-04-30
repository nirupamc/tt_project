import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { countElapsedWorkingDays } from "@/lib/day-unlock";

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
    const { enrollments: enrollmentsData } = body;

    if (!enrollmentsData || !Array.isArray(enrollmentsData) || enrollmentsData.length === 0) {
      return NextResponse.json(
        { message: "Enrollments data is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Create enrollment records with individual start_dates
    const enrollments = enrollmentsData.map((enrollment: { user_id: string; start_date: string }) => ({
      user_id: enrollment.user_id,
      project_id: projectId,
      start_date: enrollment.start_date,
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

    // Step 7: Trigger inline backfill for newly enrolled employees
    // Auto-complete project days for any elapsed working days since joining_date
    try {
      for (const enrollment of data || []) {
        // Fetch user joining_date
        const { data: user } = await supabase
          .from("users")
          .select("joining_date")
          .eq("id", enrollment.user_id)
          .single();

        if (!user?.joining_date) {
          console.log(`[enrollments] Skipping backfill for enrollment ${enrollment.id}: no joining_date`);
          continue;
        }

        // Calculate elapsed working days
        const elapsedDays = countElapsedWorkingDays(user.joining_date);
        if (elapsedDays === 0) {
          console.log(`[enrollments] Skipping backfill for enrollment ${enrollment.id}: joining date is today or future`);
          continue;
        }

        // Fetch project days for this project
        const { data: projectDays } = await supabase
          .from("project_days")
          .select("id, day_number, title")
          .eq("project_id", projectId)
          .order("day_number", { ascending: true });

        if (!projectDays || projectDays.length === 0) {
          console.log(`[enrollments] No project days found for project ${projectId}`);
          continue;
        }

        // Days to complete are those where day_number <= elapsed days
        const daysToComplete = projectDays.filter((pd) => pd.day_number <= elapsedDays);
        let daysCompletedCount = 0;

        // For each day, insert completion record and mark tasks as completed
        for (const projectDay of daysToComplete) {
          // Insert completion record
          const { error: insertError } = await supabase
            .from("enrollment_day_completions")
            .insert({
              enrollment_id: enrollment.id,
              project_day_id: projectDay.id,
              completed_at: new Date().toISOString(),
              completed_by_auto: true,
            });

          if (insertError) {
            console.error(`[enrollments] Failed to insert completion for day ${projectDay.day_number}:`, insertError);
            continue;
          }

          // Mark all tasks for this day as completed
          const { error: taskError } = await supabase
            .from("tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              completed_by_auto: true,
            })
            .eq("project_day_id", projectDay.id)
            .neq("status", "completed");

          if (taskError) {
            console.error(`[enrollments] Failed to complete tasks for day ${projectDay.day_number}:`, taskError);
            continue;
          }

          daysCompletedCount++;
        }

        // Update enrollment progress
        if (daysCompletedCount > 0) {
          const { count: completedCount } = await supabase
            .from("enrollment_day_completions")
            .select("id", { count: "exact" })
            .eq("enrollment_id", enrollment.id);

          await supabase
            .from("enrollments")
            .update({
              completed_days: completedCount || 0,
              last_auto_completed_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);

          console.log(`[enrollments] Auto-completed ${daysCompletedCount} days for enrollment ${enrollment.id}`);
        }
      }
    } catch (backfillError) {
      console.error("[enrollments] Backfill failed:", backfillError);
      // Don't fail the enrollment request if backfill fails
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
