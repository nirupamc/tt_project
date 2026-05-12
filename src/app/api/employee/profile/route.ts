import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

// GET employee profile data (includes all profile sections)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    return NextResponse.json(
      { message: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH to update editable profile fields (Education & Contact)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Only allow students to edit specific fields
    const editableFields = [
      "degree_field",
      "graduation_year",
      "personal_email",
      "phone_number",
      "linkedin_url",
      "portfolio_url",
    ];

    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      if (editableFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating employee profile:", error);
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 }
    );
  }
}