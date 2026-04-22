import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("document_type");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (typeof documentType !== "string") {
      return NextResponse.json(
        { message: "document_type is required" },
        { status: 400 },
      );
    }

    if (!REQUIRED_DOCUMENTS.some((item) => item.type === documentType)) {
      return NextResponse.json(
        { message: "Invalid document type" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PDF, JPG, and PNG files are allowed" },
        { status: 400 },
      );
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `employee-documents/${id}/${documentType}/${Date.now()}-${sanitizedName}`;

    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      file_url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error("Error uploading employee document:", error);
    return NextResponse.json(
      { message: "Failed to upload document" },
      { status: 500 },
    );
  }
}
