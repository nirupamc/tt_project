import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const employeeId = session.user.id;
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, metadata, is_read, created_at")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("notifications fetch error:", error);
      return NextResponse.json({ message: "Failed to fetch notifications" }, { status: 500 });
    }

    // Return all notifications; UI can filter unread by is_read
    return NextResponse.json({ notifications: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // Bulk mark as read: expects { ids: string[] }
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const employeeId = session.user.id;
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : null;
    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "No ids provided" }, { status: 400 });
    }

    // Ensure these notifications belong to the employee
    const { data: owned, error: ownErr } = await supabase
      .from("notifications")
      .select("id")
      .in("id", ids)
      .eq("employee_id", employeeId);

    if (ownErr) {
      console.error("notifications ownership check error:", ownErr);
      return NextResponse.json({ message: "Failed to verify notifications" }, { status: 500 });
    }

    const ownedIds = (owned || []).map((r: any) => r.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ message: "No matching notifications found" }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ownedIds);

    if (updErr) {
      console.error("notifications update error:", updErr);
      return NextResponse.json({ message: "Failed to update notifications" }, { status: 500 });
    }

    return NextResponse.json({ updated: ownedIds.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
