import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";
import type { EmployeeDocument } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json((data || []) as EmployeeDocument[]);
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee documents" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
      .eq("employee_id", id)
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
          employee_id: id,
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
