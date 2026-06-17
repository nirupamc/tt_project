import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { password } = await request.json();

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const password_hash = await bcrypt.hash(password, 12);

    const { error } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error("Error changing employee password:", error);
    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 },
    );
  }
}
