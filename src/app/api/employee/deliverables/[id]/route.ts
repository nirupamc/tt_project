import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// GET specific deliverable
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("deliverables")
      .select(
        `
        *,
        project:projects(id, title)
      `,
      )
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: "Deliverable not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching deliverable:", error);
    return NextResponse.json(
      { message: "Failed to fetch deliverable" },
      { status: 500 },
    );
  }
}

// PUT update deliverable
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { date, title, description, file_url, file_name, external_link, status } =
      body;

    // Validation
    if (title && title.length < 10) {
      return NextResponse.json(
        { message: "Title must be at least 10 characters" },
        { status: 400 },
      );
    }

    if (description && description.length < 80) {
      return NextResponse.json(
        { message: "Description must be at least 80 characters" },
        { status: 400 },
      );
    }

    if (date) {
      const deliverableDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliverableDate > today) {
        return NextResponse.json(
          { message: "Date cannot be in the future" },
          { status: 400 },
        );
      }
    }

    // Employees may only set these statuses; client_reviewed/completed are
    // reserved for supervisor/admin review flows
    const EMPLOYEE_ALLOWED_STATUSES = ["in_progress", "submitted"];
    if (status !== undefined && !EMPLOYEE_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: "Status must be 'in_progress' or 'submitted'" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (date !== undefined) updateData.date = date;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (file_url !== undefined) updateData.file_url = file_url || null;
    if (file_name !== undefined) updateData.file_name = file_name || null;
    if (external_link !== undefined) updateData.external_link = external_link || null;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("deliverables")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select(
        `
        *,
        project:projects(id, title)
      `,
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: "Deliverable not found or update failed" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return NextResponse.json(
      { message: "Failed to update deliverable" },
      { status: 500 },
    );
  }
}

// DELETE deliverable
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("deliverables")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Deliverable deleted" });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return NextResponse.json(
      { message: "Failed to delete deliverable" },
      { status: 500 },
    );
  }
}
