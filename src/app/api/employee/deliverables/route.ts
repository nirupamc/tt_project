import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import type { Deliverable } from "@/types";

// GET deliverables for a project
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: deliverables, error } = await supabase
      .from("deliverables")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("project_id", projectId)
      .order("date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(deliverables || []);
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return NextResponse.json(
      { message: "Failed to fetch deliverables" },
      { status: 500 },
    );
  }
}

// POST create new deliverable
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      date,
      title,
      description,
      file_url,
      file_name,
      external_link,
      status,
    } = body;

    // Validation
    if (!projectId || !date || !title || !description) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    if (title.length < 10) {
      return NextResponse.json(
        { message: "Title must be at least 10 characters" },
        { status: 400 },
      );
    }

    if (description.length < 80) {
      return NextResponse.json(
        { message: "Description must be at least 80 characters" },
        { status: 400 },
      );
    }

    // Validate date is not in future
    const deliverableDate = new Date(date);
    if (deliverableDate > new Date()) {
      return NextResponse.json(
        { message: "Deliverable date cannot be in the future" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: deliverable, error } = await supabase
      .from("deliverables")
      .insert({
        user_id: session.user.id,
        project_id: projectId,
        date,
        title,
        description,
        file_url: file_url || null,
        file_name: file_name || null,
        external_link: external_link || null,
        status: status || "in_progress",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(deliverable);
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return NextResponse.json(
      { message: "Failed to create deliverable" },
      { status: 500 },
    );
  }
}
