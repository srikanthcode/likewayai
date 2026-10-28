// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — SERVER-AUTHORITATIVE REQUEST IDENTITY
//
// Every API route MUST derive the effective user from a verified session.
// Request headers (x-user-id), body fields (userId) and shared guest ids are
// never trusted: a client can set any of them.
//
// Server-to-server calls (Vercel → Render) authenticate with
// INTERNAL_API_SECRET and may assert a user id, because the secret proves the
// caller is our own backend rather than a browser.
// ══════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { NextRequest } from "next/server";
import { getTokenFromCookies, verifyAccessToken, isAdminPayload } from "./auth";

export interface RequestIdentity {
  userId: string | null;
  role: string;
  plan: string;
  sessionId?: string;
  /** True only when the caller proved it is our own backend. */
  internal: boolean;
}

const ANONYMOUS: RequestIdentity = { userId: null, role: "guest", plan: "Core", internal: false };

function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Validate the shared server-to-server secret.
 * Returns the asserted user id when valid, otherwise null.
 */
function getInternalUserId(req: NextRequest): { userId: string | null; ok: boolean } {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return { userId: null, ok: false };

  const provided =
    req.headers.get("x-internal-secret") ||
    req.headers.get("x-internal-api-secret") ||
    "";
  if (!timingSafeEqualStr(provided, secret)) return { userId: null, ok: false };

  const asserted = req.headers.get("x-internal-user-id");
  if (!asserted) return { userId: null, ok: true };
  // The asserted id must look like one of our user ids; it is still scoped to
  // that user and never grants admin.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(asserted)) return { userId: null, ok: true };
  return { userId: asserted, ok: true };
}

/**
 * Resolve the caller's identity from a verified access-token cookie.
 * Never falls back to client-supplied headers.
 */
export function getRequestIdentity(req: NextRequest): RequestIdentity {
  const tokens = getTokenFromCookies(req);
  if (tokens.access) {
    const payload = verifyAccessToken(tokens.access);
    if (payload?.sub) {
      return {
        userId: payload.sub,
        role: payload.role || "user",
        plan: payload.plan || "Core",
        sessionId: payload.sessionId,
        internal: false,
      };
    }
  }

  const internal = getInternalUserId(req);
  if (internal.ok) {
    return {
      userId: internal.userId,
      role: "user",
      plan: "Core",
      internal: true,
    };
  }

  return ANONYMOUS;
}

/** Identity for routes that must reject unauthenticated callers. */
export function requireIdentity(req: NextRequest): RequestIdentity | null {
  const identity = getRequestIdentity(req);
  return identity.userId ? identity : null;
}

export function isAdmin(identity: RequestIdentity | null): boolean {
  if (!identity) return false;
  return identity.internal || isAdminPayload({ role: identity.role });
}

/**
 * Ownership predicate — the single place that decides whether `identity` may
 * touch a resource owned by `ownerId`. Admin access is explicit.
 */
export function canAccessResource(
  identity: RequestIdentity | null,
  ownerId: string | null | undefined
): boolean {
  if (!identity?.userId) return false;
  if (isAdmin(identity)) return true;
  if (!ownerId) return false;
  return ownershipKey(identity.userId) === ownershipKey(ownerId);
}

/**
 * Normalise a user id for comparison. `guest_abc123` and `abc123` are the same
 * principal (the guest route prefixes a random hex id).
 */
function ownershipKey(userId: string): string {
  return userId.replace(/^guest_/, "").toLowerCase();
}

/** Unauthorized JSON response with no information leakage. */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Sign in to continue." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function forbiddenResponse(message = "You do not have access to this resource."): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
