import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET all timesheets (admin view)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = createAdminClient();

    let query = supabase
      .from("timesheets")
      .select(
        `
        *,
        user:users(id, name, email, avatar_url),
        project:projects(id, title)
      `,
      )
      .order("work_date", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (startDate) {
      query = query.gte("work_date", startDate);
    }

    if (endDate) {
      query = query.lte("work_date", endDate);
    }

    const { data: timesheets, error } = await query;

    if (error) throw error;

    return NextResponse.json(timesheets || []);
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { message: "Failed to fetch timesheets" },
      { status: 500 },
    );
  }
}
