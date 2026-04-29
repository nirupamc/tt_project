import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").toLowerCase();
    const sanitizedDocumentType = documentType.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const blobPath = `employee-documents/${session.user.id}/${sanitizedDocumentType}/${Date.now()}-${sanitizedName}`;

    let blob;
    try {
      blob = await put(blobPath, file, {
        access: "public",
        addRandomSuffix: false,
      });
    } catch (error) {
      console.error("Vercel Blob upload error:", error);
      return NextResponse.json(
        { message: "File upload failed. Please try again." },
        { status: 500 },
      );
    }

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
