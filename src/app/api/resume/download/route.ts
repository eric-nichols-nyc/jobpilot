import { NextRequest, NextResponse } from "next/server";

import { createInsforgeServer } from "@/lib/insforge-server";
import { getCurrentUser } from "@/lib/auth";
import { resolveResumeStoragePath } from "@/lib/resume-storage";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insforge = await createInsforgeServer();

    const { data: profile } = await insforge.database
      .from("profiles")
      .select("resume_pdf_url")
      .eq("id", user.id)
      .maybeSingle<{ resume_pdf_url: string | null }>();

    const storagePath = resolveResumeStoragePath(
      profile?.resume_pdf_url,
      user.id,
    );
    if (!storagePath) {
      return NextResponse.json({ error: "No resume on file" }, { status: 404 });
    }

    // Self-heal legacy rows that stored a full URL instead of the storage key.
    if (profile?.resume_pdf_url && profile.resume_pdf_url !== storagePath) {
      await insforge.database
        .from("profiles")
        .update({ resume_pdf_url: storagePath })
        .eq("id", user.id);
    }

    const { data: blob, error } = await insforge.storage
      .from("resumes")
      .download(storagePath);

    if (error || !blob) {
      console.error("[api/resume/download]", error);
      return NextResponse.json(
        { error: "Failed to download resume" },
        { status: 500 },
      );
    }

    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
      },
    });
  } catch (error) {
    console.error("[api/resume/download]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
