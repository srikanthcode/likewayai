import { NextRequest, NextResponse } from "next/server";
import { getGeneratedFile } from "@/lib/file-store";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";

export const maxDuration = 30;

/**
 * GET /api/files/[id] — download an AI-generated file.
 *
 * Always authenticated and always scoped to the owner. Previously an
 * unauthenticated caller could download any generated document by id because
 * the owner filter was only applied when a token happened to be present.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const file = await getGeneratedFile(id, identity.userId!);
    if (!file) {
      return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.meta.contentType,
        "Content-Length": String(file.meta.size),
        "Content-Disposition": `attachment; filename="${String(file.meta.filename).replace(/["\r\n]/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Files API] Download failed:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
