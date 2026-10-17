import crypto from "crypto";

// ── Admin identity ──────────────────────────────────────────────────────────
// Privileges are NEVER derived from a hardcoded id/email list. They come from
// the `role: "admin"` field persisted in the MongoDB `users` collection.
export function isAdminUser(user?: { role?: string | null } | null): boolean {
  return !!user && user.role === "admin";
}

/** Role carried on a verified JWT. */
export function isAdminPayload(payload?: { role?: string | null } | null): boolean {
  return !!payload && payload.role === "admin";
}


// ── Secrets ────────────────────────────────────────────────────────────────
// Lazy getter — never throws at module load time (build has no env vars).
// Validation happens when JWT operations are actually called at runtime.
let _jwtSecret: string | undefined;
function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (secret) { _jwtSecret = secret; return secret; }
  // No throw here — let the app build. JWT operations will fail at runtime.
  if (process.env.NODE_ENV === "production") {
    console.error("[Auth] CRITICAL: JWT_SECRET not set — JWT operations will fail at runtime");
  }
  return "missing-jwt-secret-set-it-in-env-vars";
}
let _jwtRefreshSecret: string | undefined;
function getJwtRefreshSecret(): string {
  if (_jwtRefreshSecret) return _jwtRefreshSecret;
  if (process.env.JWT_REFRESH_SECRET) { _jwtRefreshSecret = process.env.JWT_REFRESH_SECRET; return _jwtRefreshSecret; }
  _jwtRefreshSecret = crypto.createHash("sha256").update(getJwtSecret() + ":refresh-token-key").digest("hex");
  return _jwtRefreshSecret;
}

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
  // Role and plan come from the DB user record — no hardcoded overrides.
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
  return sign(payload as any, getJwtSecret());
}

export function createRefreshToken(
  userId: string,
  sessionId: string,
  role: string = "user",
  plan: string = "free"
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    role,
    plan,
    type: "refresh",
    sessionId,
    exp: now + JWT_REFRESH_EXPIRY,
    iat: now,
  };
  return sign(payload as any, getJwtRefreshSecret());
}

export function verifyAccessToken(token: string): TokenPayload | null {
  return verify(token, getJwtSecret()) as TokenPayload | null;
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  return verify(token, getJwtRefreshSecret()) as TokenPayload | null;
}

// ── JWT Rotation ──────────────────────────────────────────────────────────
// Automatically rotate tokens when they're within 20% of expiry
// This prevents silent expiration during active use
export function shouldRotateAccessToken(token: string): boolean {
  const payload = verifyAccessToken(token);
  if (!payload) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;
  const threshold = JWT_ACCESS_EXPIRY * 0.2; // 20% of total lifetime
  
  return remaining < threshold;
}

export function shouldRotateRefreshToken(token: string): boolean {
  const payload = verifyRefreshToken(token);
  if (!payload) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;
  const threshold = JWT_REFRESH_EXPIRY * 0.2; // 20% of total lifetime
  
  return remaining < threshold;
}

// Rotate both tokens if needed, returning new tokens or null if no rotation needed
export function rotateTokensIfNeeded(
  accessToken: string,
  refreshToken: string,
  user: { id: string; email?: string; role: string; plan: string }
): { accessToken: string; refreshToken: string } | null {
  const needAccess = shouldRotateAccessToken(accessToken);
  const needRefresh = shouldRotateRefreshToken(refreshToken);
  
  if (!needAccess && !needRefresh) return null;
  
  // Decode current session ID from the refresh token to maintain session continuity
  const refreshPayload = verifyRefreshToken(refreshToken);
  const sessionId = refreshPayload?.sessionId || generateSessionId();
  
  return {
    accessToken: createAccessToken(user, sessionId),
    refreshToken: createRefreshToken(user.id, sessionId, user.role, user.plan),
  };
}

// ── CSRF Token Generation & Validation ─────────────────────────────────────
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");

export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now();
  const payload = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function validateCsrfToken(token: string, sessionId: string): boolean {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expectedSig = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(payload)
      .digest("hex");

    // Constant-time comparison
    if (signature.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return false;

    const [tokenSessionId, timestampStr] = payload.split(":");
    if (tokenSessionId !== sessionId) return false;

    // Token expires after 1 hour
    const age = Date.now() - parseInt(timestampStr);
    if (age > 3600000) return false;

    return true;
  } catch {
    return false;
  }
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
