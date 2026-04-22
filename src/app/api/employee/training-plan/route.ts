import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [{ data: user, error: userError }, { data: plan, error: planError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("joining_date")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("i983_plans")
          .select(
            `
            *,
            objective_1_project:projects!objective_1_project_id(title),
            objective_2_project:projects!objective_2_project_id(title),
            objective_3_project:projects!objective_3_project_id(title)
          `,
          )
          .eq("employee_id", session.user.id)
          .maybeSingle(),
      ]);

    if (userError) throw userError;
    if (planError) throw planError;

    const nextEvalDate = user?.joining_date
      ? addDays(new Date(user.joining_date), 365)
      : null;

    return NextResponse.json({
      plan: plan || null,
      next_evaluation_due: nextEvalDate ? format(nextEvalDate, "yyyy-MM-dd") : null,
      days_remaining: nextEvalDate
        ? differenceInCalendarDays(nextEvalDate, new Date())
        : null,
    });
  } catch (error) {
    console.error("Error fetching training plan:", error);
    return NextResponse.json(
      { message: "Failed to fetch training plan" },
      { status: 500 },
    );
  }
}
