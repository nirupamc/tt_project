import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// GET employee profile data for timesheet generation
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    const { data: user, error } = await supabase
      .from("users")
      .select("joining_date, hours_per_day")
      .eq("id", session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      joining_date: user.joining_date,
      hours_per_day: user.hours_per_day || 8,
    });
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    return NextResponse.json(
      { message: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}