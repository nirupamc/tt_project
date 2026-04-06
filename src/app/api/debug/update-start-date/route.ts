import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const startDate = searchParams.get("startDate") || "2026-04-04";

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Update project start_date
  const { data, error } = await supabase
    .from("projects")
    .update({ start_date: startDate })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Updated project start_date to ${startDate}`,
    project: data,
  });
}
