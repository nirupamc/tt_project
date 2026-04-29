import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { format, isBefore, parseISO } from "date-fns";

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

    // Fetch user's hours_per_week and joining_date
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("hours_per_week, joining_date")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    if (user?.joining_date && isBefore(parseISO(today), parseISO(user.joining_date))) {
      return NextResponse.json({
        success: true,
        logged: 0,
        message: "Joining date not reached yet",
      });
    }

    const hoursToLog = (user?.hours_per_week ?? 40) / 5;

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

      const payload = {
        user_id: userId,
        work_date: today,
        hours_logged: hoursToLog,
        project_id: enrollment.project_id,
        notes: "Auto-logged on login",
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from("timesheets")
          .update(payload)
          .eq("id", existing.id);

        if (!updateError) {
          loggedCount++;
        }
        continue;
      }

      const { error: insertError } = await supabase
        .from("timesheets")
        .insert(payload);

      if (!insertError) {
        loggedCount++;
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
