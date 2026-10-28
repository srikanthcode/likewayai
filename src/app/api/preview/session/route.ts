import { NextRequest, NextResponse } from "next/server";
import {
  createOrUpdateSession,
  getSession,
  stopSession,
  buildExecutableBundle,
} from "@/lib/preview/preview-manager";
import { requireIdentity, unauthorizedResponse, canAccessResource } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Previews execute generated code; they always belong to an account.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const body = await req.json();
    const { sessionId, projectId, title, content, code, language, files } = body;

    const resolvedContent = content || code || "";

    if (!resolvedContent && (!files || Object.keys(files).length === 0)) {
      return NextResponse.json(
        { error: "Content or files are required to start preview" },
        { status: 400 }
      );
    }

    // Updating an existing session requires ownership of that session.
    if (sessionId) {
      const existing = getSession(sessionId);
      if (existing && !canAccessResource(identity, existing.userId)) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }

    const session = await createOrUpdateSession({
      sessionId,
      projectId,
      title,
      content: resolvedContent,
      language,
      files,
      userId: identity.userId!,
    });

    const html = buildExecutableBundle(session);

    return NextResponse.json({
      success: true,
      session,
      previewUrl: session.previewUrl,
      html,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create preview session" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const identity = requireIdentity(req);
  if (!identity) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session || !canAccessResource(identity, session.userId)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    session,
  });
}

export async function DELETE(req: NextRequest) {
  const identity = requireIdentity(req);
  if (!identity) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const existing = getSession(sessionId);
  if (!existing || !canAccessResource(identity, existing.userId)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const stopped = stopSession(sessionId);
  return NextResponse.json({
    success: stopped,
    message: stopped ? "Preview stopped" : "Session not found",
  });
}
