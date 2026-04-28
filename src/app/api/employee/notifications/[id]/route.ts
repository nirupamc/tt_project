import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const employeeId = session.user.id;
  const supabase = createAdminClient();

  try {
    // Verify ownership
    const { data: existing, error: existErr } = await supabase
      .from("notifications")
      .select("id, is_read")
      .eq("id", id)
      .eq("employee_id", employeeId)
      .limit(1)
      .maybeSingle();

    if (existErr) {
      console.error("notification fetch error:", existErr);
      return NextResponse.json({ message: "Failed to fetch notification" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    if (existing.is_read) {
      return NextResponse.json({ message: "Already read" });
    }

    const { error: updErr } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updErr) {
      console.error("notification update error:", updErr);
      return NextResponse.json({ message: "Failed to update notification" }, { status: 500 });
    }

    return NextResponse.json({ id, marked: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
