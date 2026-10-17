import { NextRequest, NextResponse } from "next/server";
import { getSession, buildExecutableBundle } from "@/lib/preview/preview-manager";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Preview Not Found</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-950 text-slate-300 flex items-center justify-center min-h-screen p-6 font-mono">
          <div class="text-center max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div class="text-3xl mb-3">⚠️</div>
            <h2 class="text-lg font-bold text-white mb-2">Preview Session Inactive</h2>
            <p class="text-xs text-slate-400 mb-4">This session has expired or stopped. Return to the editor to run a new preview.</p>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const html = buildExecutableBundle(session);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
