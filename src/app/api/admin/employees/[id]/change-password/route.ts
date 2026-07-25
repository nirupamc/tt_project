import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Only full admins may reset passwords. Middleware lets supervisors
    // into /api/admin/*, and this route can target ANY user id — without
    // this check a supervisor could take over an admin account.
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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
