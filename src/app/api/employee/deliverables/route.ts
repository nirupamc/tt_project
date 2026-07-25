import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { parseISO } from "date-fns";

// GET all deliverables for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("deliverables")
      .select(
        `
        *,
        project:projects(id, title)
      `,
      )
      .eq("user_id", session.user.id)
      .order("date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
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
      project_id,
      date,
      title,
      description,
      file_url,
      file_name,
      external_link,
      status,
    } = body;

    // Validation
    if (!project_id || !date || !title || !description) {
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

    // Employees may only set these statuses; client_reviewed/completed are
    // reserved for supervisor/admin review flows
    const EMPLOYEE_ALLOWED_STATUSES = ["in_progress", "submitted"];
    if (status && !EMPLOYEE_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: "Status must be 'in_progress' or 'submitted'" },
        { status: 400 },
      );
    }

    // Validate date is not in future
    const deliverableDate = parseISO(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deliverableDate > today) {
      return NextResponse.json(
        { message: "Date cannot be in the future" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify user has access to this project
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("project_id", project_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { message: "You don't have access to this project" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("deliverables")
      .insert({
        user_id: session.user.id,
        project_id,
        date,
        title,
        description,
        file_url: file_url || null,
        file_name: file_name || null,
        external_link: external_link || null,
        status: status || "in_progress",
      })
      .select(
        `
        *,
        project:projects(id, title)
      `,
      )
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return NextResponse.json(
      { message: "Failed to create deliverable" },
      { status: 500 },
    );
  }
}
