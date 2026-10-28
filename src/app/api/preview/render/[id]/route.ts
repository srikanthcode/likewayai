import { NextRequest, NextResponse } from "next/server";
import { getSession, buildExecutableBundle } from "@/lib/preview/preview-manager";
import { getRequestIdentity, canAccessResource } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * Preview document delivery.
 *
 * Two independent defences:
 *
 * 1. Authorization — the session must belong to the caller. Session ids are
 *    random, but that is not an access control.
 *
 * 2. Isolation — the page is served with a sandbox CSP so that generated
 *    content can never act as the application. The document is opened in a
 *    sandboxed iframe (`sandbox="allow-scripts"` without `allow-same-origin`),
 *    which gives it an opaque origin: it cannot read the app's cookies,
 *    localStorage or authenticated responses. `frame-ancestors` is limited to
 *    the app origin so other sites cannot frame it.
 */
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
        <head><title>Preview Not Available</title></head>
        <body style="font-family:system-ui;background:#0f172a;color:#cbd5e1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
          <div style="text-align:center;max-width:28rem;padding:1.5rem;border:1px solid #1e293b;border-radius:1rem;background:#111827">
            <h2 style="margin:0 0 .5rem;font-size:1rem;color:#fff">Preview session inactive</h2>
            <p style="margin:0;font-size:.8rem">This session has expired or stopped. Return to the editor to run a new preview.</p>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      }
    );
  }

  const identity = getRequestIdentity(req);
  if (!canAccessResource(identity, session.userId)) {
    // Same response as "not found" so session ids cannot be probed.
    return new NextResponse("Not found", { status: 404 });
  }

  const html = buildExecutableBundle(session);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Never allow the app origin to frame a generated document ambiguously.
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": [
        // Generated code may run scripts, but gets an opaque origin and no
        // access to this application's authenticated endpoints.
        "default-src 'none'",
        "script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com",
        "style-src 'unsafe-inline' https://cdn.tailwindcss.com",
        "img-src data: blob: https:",
        "font-src data: https:",
        "connect-src 'none'",
        "frame-ancestors 'self'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; "),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
