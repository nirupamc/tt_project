import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "supervisor")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const [{ data: notifications, error }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", session.user.id)
        .eq("is_read", false),
    ]);

    if (error) throw error;

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: count || 0,
    });
  } catch (error) {
    console.error("Error loading notifications:", error);
    return NextResponse.json({ message: "Failed to load notifications" }, { status: 500 });
  }
}
