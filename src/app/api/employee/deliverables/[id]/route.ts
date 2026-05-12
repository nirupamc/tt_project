import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// PATCH update deliverable
export async function PATCH(
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

    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("deliverables")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { message: "Deliverable not found" },
        { status: 404 },
      );
    }

    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Validate fields if provided
    if (body.title && body.title.length < 10) {
      return NextResponse.json(
        { message: "Title must be at least 10 characters" },
        { status: 400 },
      );
    }

    if (body.description && body.description.length < 80) {
      return NextResponse.json(
        { message: "Description must be at least 80 characters" },
        { status: 400 },
      );
    }

    if (body.date) {
      const deliverableDate = new Date(body.date);
      if (deliverableDate > new Date()) {
        return NextResponse.json(
          { message: "Deliverable date cannot be in the future" },
          { status: 400 },
        );
      }
    }

    const { data: updated, error } = await supabase
      .from("deliverables")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
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

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("deliverables")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { message: "Deliverable not found" },
        { status: 404 },
      );
    }

    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase.from("deliverables").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return NextResponse.json(
      { message: "Failed to delete deliverable" },
      { status: 500 },
    );
  }
}
