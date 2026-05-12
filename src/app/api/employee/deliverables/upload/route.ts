import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 },
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "File type not allowed. Accepted: PNG, JPG, PDF, DOCX, XLSX, ZIP",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `deliverables/${session.user.id}/${projectId}/${Date.now()}-${sanitizedName}`;

    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      filename: sanitizedName,
    });
  } catch (error) {
    console.error("Error uploading deliverable file:", error);
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 },
    );
  }
}
