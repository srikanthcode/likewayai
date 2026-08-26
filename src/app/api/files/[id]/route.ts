import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { getGeneratedFile } from "@/lib/file-store";

export const maxDuration = 30;

/**
 * GET /api/files/[id] — download an AI-generated file.
 * Ownership is enforced via the session cookie when authenticated.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    const userId = payload?.sub;

    const file = await getGeneratedFile(id, userId);
    if (!file) {
      return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.meta.contentType,
        "Content-Length": String(file.meta.size),
        "Content-Disposition": `attachment; filename="${file.meta.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Files API] Download failed:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
