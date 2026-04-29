import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_FIELDS = [
  "opt_type",
  "ead_number",
  "ead_start_date",
  "ead_end_date",
  "i9_completion_date",
  "everify_case_number",
  "everify_status",
  "university_name",
  "dso_name",
  "dso_email",
] as const;

type ComplianceUpdatePayload = Partial<Record<(typeof ALLOWED_FIELDS)[number], string | null>>;

function normalizeValue(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "employee") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const sanitizedPayload: ComplianceUpdatePayload = {};

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        sanitizedPayload[field] = normalizeValue(body[field]);
      }
    }

    if (Object.keys(sanitizedPayload).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided" },
        { status: 400 },
      );
    }

    if (
      sanitizedPayload.ead_start_date &&
      sanitizedPayload.ead_end_date &&
      sanitizedPayload.ead_end_date < sanitizedPayload.ead_start_date
    ) {
      return NextResponse.json(
        { message: "EAD End Date must be on or after EAD Start Date" },
        { status: 400 },
      );
    }

    if (sanitizedPayload.dso_email && !EMAIL_PATTERN.test(sanitizedPayload.dso_email)) {
      return NextResponse.json(
        { message: "DSO Email must be a valid email address" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update(sanitizedPayload)
      .eq("id", session.user.id)
      .select(
        "id, name, email, avatar_url, job_title, joining_date, opt_type, ead_number, ead_start_date, ead_end_date, hours_per_week, pay_rate, work_location, university_name, dso_name, dso_email, i9_completion_date, everify_case_number, everify_status, supervisor_id",
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating employee compliance profile:", error);
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 },
    );
  }
}