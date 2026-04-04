import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET days for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: days, error } = await supabase
      .from("project_days")
      .select(
        `
        *,
        tasks:tasks(*)
      `,
      )
      .eq("project_id", id)
      .order("day_number", { ascending: true });

    if (error) throw error;

    return NextResponse.json(days || []);
  } catch (error) {
    console.error("Error fetching days:", error);
    return NextResponse.json(
      { message: "Failed to fetch days" },
      { status: 500 },
    );
  }
}

// POST create new day
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { day_number, title } = body;

    if (!day_number) {
      return NextResponse.json(
        { message: "Day number is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: day, error } = await supabase
      .from("project_days")
      .insert({
        project_id: id,
        day_number,
        title,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: `Day ${day_number} already exists` },
          { status: 400 },
        );
      }
      throw error;
    }

    return NextResponse.json(day, { status: 201 });
  } catch (error) {
    console.error("Error creating day:", error);
    return NextResponse.json(
      { message: "Failed to create day" },
      { status: 500 },
    );
  }
}
