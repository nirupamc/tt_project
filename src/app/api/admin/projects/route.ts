import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET all projects
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: projects, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        enrollments:enrollments(count)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the data to include enrollment_count
    const projectsWithCount = projects?.map((proj) => ({
      ...proj,
      enrollment_count: proj.enrollments?.[0]?.count || 0,
      enrollments: undefined,
    }));

    return NextResponse.json(projectsWithCount);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { message: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

// POST create new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      skill_tag,
      total_days,
      start_date,
      thumbnail_url,
      is_published,
      is_active,
      weekdays_only,
      daily_reminder_emails,
    } = body;

    if (!title || !total_days) {
      return NextResponse.json(
        { message: "Title and total days are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        title,
        description,
        skill_tag,
        total_days,
        start_date,
        thumbnail_url,
        is_published: is_published || false,
        is_active: is_active || false,
        weekdays_only: weekdays_only || false,
        daily_reminder_emails: daily_reminder_emails !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 },
    );
  }
}
