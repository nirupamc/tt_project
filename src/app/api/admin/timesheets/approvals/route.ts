import { NextResponse } from "next/server";
import { startOfWeek, format } from "date-fns";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("timesheet_approvals")
      .select("*")
      .order("approved_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { message: "Failed to fetch approvals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "supervisor") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, week_start_date } = body;

    if (!employee_id || !week_start_date) {
      return NextResponse.json(
        { message: "employee_id and week_start_date are required" },
        { status: 400 },
      );
    }

    const normalizedWeekStart = format(
      startOfWeek(new Date(week_start_date), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("timesheet_approvals")
      .upsert(
        {
          employee_id,
          week_start_date: normalizedWeekStart,
          approved_by: session.user.id,
          approved_by_name: session.user.name,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,week_start_date" },
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error approving week:", error);
    return NextResponse.json(
      { message: "Failed to approve week" },
      { status: 500 },
    );
  }
}
