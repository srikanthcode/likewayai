import crypto from "crypto";

// ── Secrets ────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL: JWT_SECRET must be set in production environment");
  }
  console.warn("[Auth] WARNING: Using weak default JWT_SECRET in development. Set JWT_SECRET env var for production.");
  return "likeway-dev-secret-change-in-production-32chars";
})();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.createHash("sha256").update(JWT_SECRET + ":refresh-token-key").digest("hex");

// Access token: 7 days (users stay logged in without needing a refresh)
// Middleware only checks the cookie exists, so expiry is enforced at API level.
const JWT_ACCESS_EXPIRY = 7 * 24 * 60 * 60;     // 7 days
const JWT_REFRESH_EXPIRY = 30 * 24 * 60 * 60;    // 30 days

// ── Password Hashing (scrypt — Argon2-equivalent) ─────────────────────────
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

// ── JWT ────────────────────────────────────────────────────────────────────
function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

function sign(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64url(Buffer.from(JSON.stringify(header)));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

function verify(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  try {
    // Constant-time compare — prevents timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) return null;
    const payload = JSON.parse(base64urlDecode(p).toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

/** Decode without verifying signature — for middleware (no secret needed in edge) */
export function decodeTokenUnsafe(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64urlDecode(parts[1]).toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null; // still honour expiry
    return payload;
  } catch {
    return null;
  }
}

// ── Token Payload ──────────────────────────────────────────────────────────
export type TokenPayload = {
  sub: string;
  email?: string;
  role: string;
  plan: string;
  type: "access" | "refresh";
  sessionId: string;
  exp: number;
  iat: number;
};

export function createAccessToken(
  user: { id: string; email?: string; role: string; plan: string },
  sessionId: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
    type: "access",
    sessionId,
    exp: now + JWT_ACCESS_EXPIRY,
    iat: now,
  };
  return sign(payload as any, JWT_SECRET);
}

export function createRefreshToken(userId: string, sessionId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    role: "user",
    plan: "free",
    type: "refresh",
    sessionId,
    exp: now + JWT_REFRESH_EXPIRY,
    iat: now,
  };
  return sign(payload as any, JWT_REFRESH_SECRET);
}

export function verifyAccessToken(token: string): TokenPayload | null {
  return verify(token, JWT_SECRET) as TokenPayload | null;
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  return verify(token, JWT_REFRESH_SECRET) as TokenPayload | null;
}

// ── Utilities ──────────────────────────────────────────────────────────────
export function generateRandomToken(length = 48): string {
  return crypto.randomBytes(length).toString("hex");
}

export function generateSessionId(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function fingerprint(req: Request): Record<string, string> {
  const ua = req.headers.get("user-agent") || "unknown";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return { userAgent: ua, ip };
}

// ── Cookie Helpers ─────────────────────────────────────────────────────────
export function setAuthCookies(
  accessToken: string,
  refreshToken: string
): { name: string; value: string; options: Record<string, any> }[] {
  const isProd = process.env.NODE_ENV === "production";
  return [
    {
      name: "lw_at",   // access token (short name avoids header bloat)
      value: accessToken,
      options: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        maxAge: JWT_ACCESS_EXPIRY,
      },
    },
    {
      name: "lw_rt",   // refresh token
      value: refreshToken,
      options: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        maxAge: JWT_REFRESH_EXPIRY,
      },
    },
  ];
}

export function clearAuthCookies(): { name: string; value: string; options: Record<string, any> }[] {
  const opts = { httpOnly: true, path: "/", maxAge: 0 };
  return [
    { name: "lw_at", value: "", options: opts },
    { name: "lw_rt", value: "", options: opts },
    // Also clear old cookie names for backward compat
    { name: "likeway_access_token", value: "", options: opts },
    { name: "likeway_refresh_token", value: "", options: opts },
  ];
}

export function getTokenFromCookies(req: Request): { access?: string; refresh?: string } {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    cookies[key] = val;
  }
  // Support both new short names and old full names
  return {
    access: cookies["lw_at"] || cookies["likeway_access_token"],
    refresh: cookies["lw_rt"] || cookies["likeway_refresh_token"],
  };
}
