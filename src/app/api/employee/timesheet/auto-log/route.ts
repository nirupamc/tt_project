import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { format } from "date-fns";

export async function POST() {
  try {
    // Get current user session
    const session = await auth();

    if (!session || !session.user || session.user.role !== "employee") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const today = format(new Date(), "yyyy-MM-dd");
    const supabase = createAdminClient();

    // Fetch all enrollments for this user
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("project_id")
      .eq("user_id", userId);

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        logged: 0,
        message: "No enrollments found",
      });
    }

    let loggedCount = 0;

    // For each enrollment, check and insert timesheet if needed
    for (const enrollment of enrollments) {
      // Check if timesheet already exists for today
      const { data: existing } = await supabase
        .from("timesheets")
        .select("id")
        .eq("user_id", userId)
        .eq("work_date", today)
        .eq("project_id", enrollment.project_id)
        .single();

      // If no record exists, insert new one
      if (!existing) {
        const { error: insertError } = await supabase
          .from("timesheets")
          .insert({
            user_id: userId,
            work_date: today,
            hours_logged: 5,
            project_id: enrollment.project_id,
            notes: "Auto-logged on login",
          });

        if (!insertError) {
          loggedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      logged: loggedCount,
    });
  } catch (error) {
    console.error("Auto-log timesheet error:", error);
    return NextResponse.json(
      { message: "Failed to auto-log timesheet" },
      { status: 500 },
    );
  }
}
