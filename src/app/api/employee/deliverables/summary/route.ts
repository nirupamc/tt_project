import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get start and end of current month
    const monthStart = startOfMonth(new Date()).toISOString().split("T")[0];
    const monthEnd = endOfMonth(new Date()).toISOString().split("T")[0];

    // Get deliverables for this month
    const { data: deliverables, error } = await supabase
      .from("deliverables")
      .select("id, project_id")
      .eq("user_id", session.user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    if (error) throw error;

    // Count unique projects
    const projectIds = new Set(deliverables?.map((d) => d.project_id) || []);

    return NextResponse.json({
      month_deliverables: deliverables?.length || 0,
      projects_with_deliverables: projectIds.size,
    });
  } catch (error) {
    console.error("Error fetching deliverables summary:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch summary",
        month_deliverables: 0,
        projects_with_deliverables: 0,
      },
      { status: 500 },
    );
  }
}
