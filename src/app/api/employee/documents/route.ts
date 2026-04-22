import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [{ data: documents, error }, { data: user, error: userError }] =
      await Promise.all([
        supabase
          .from("employee_documents")
          .select("*")
          .eq("employee_id", session.user.id),
        supabase
          .from("users")
          .select("ead_end_date")
          .eq("id", session.user.id)
          .single(),
      ]);

    if (error) throw error;
    if (userError) throw userError;

    return NextResponse.json({
      documents: documents || [],
      ead_end_date: user?.ead_end_date || null,
      required_documents: REQUIRED_DOCUMENTS,
    });
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee documents" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { document_type, file_url, expiry_date, version_date } = body;

    if (!document_type) {
      return NextResponse.json(
        { message: "document_type is required" },
        { status: 400 },
      );
    }

    if (!REQUIRED_DOCUMENTS.some((item) => item.type === document_type)) {
      return NextResponse.json(
        { message: "Invalid document type" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("employee_documents")
      .select("expiry_date, version_date, file_url")
      .eq("employee_id", session.user.id)
      .eq("document_type", document_type)
      .maybeSingle();

    const finalFileUrl =
      file_url !== undefined ? file_url || null : existing?.file_url || null;
    const finalExpiryDate =
      expiry_date !== undefined
        ? expiry_date || null
        : existing?.expiry_date || null;
    const finalVersionDate =
      version_date !== undefined
        ? version_date || null
        : existing?.version_date || null;
    const status = finalFileUrl ? "uploaded" : "missing";
    const { data, error } = await supabase
      .from("employee_documents")
      .upsert(
        {
          employee_id: session.user.id,
          document_type,
          file_url: finalFileUrl,
          expiry_date: finalExpiryDate,
          version_date: finalVersionDate,
          status,
          uploaded_at: finalFileUrl ? new Date().toISOString() : null,
        },
        { onConflict: "employee_id,document_type" },
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving employee document:", error);
    return NextResponse.json(
      { message: "Failed to save employee document" },
      { status: 500 },
    );
  }
}
