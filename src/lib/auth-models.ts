import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

// ── Helper: safely convert a string to ObjectId ────────────────────────────
function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
export type AuthProvider = "google" | "email" | "github" | "apple" | "microsoft";

export interface User {
  _id?: any;
  name: string;
  email: string;
  avatar: string;
  provider: AuthProvider;
  passwordHash?: string;
  emailVerified: boolean;
  role: "user" | "admin";
  plan: "free" | "core" | "go" | "plus" | "pro";
  onboardingCompleted: boolean;
  onboardingGoal?: string;
  onboardingExperience?: string;
  age?: number;
  referralSource?: string;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt: Date;
}

export interface Session {
  _id?: any;
  userId: string;
  refreshToken: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: string;
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface LoginHistory {
  _id?: any;
  userId: string;
  provider: AuthProvider;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  createdAt: Date;
}

// ── DB accessor (properly typed) ───────────────────────────────────────────
async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function findUserByEmail(email: string): Promise<User | null> {
  const normEmail = (email || "").toLowerCase().trim();
  try {
    const db = await getDb();
    const user = await db.collection<User>("users").findOne({ email: normEmail }) as any;
    return user || null;
  } catch (err: any) {
    console.error("[AuthModels] findUserByEmail failed:", err?.message || err);
    return null;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    const db = await getDb();
    const oid = toObjectId(id);
    if (!oid) return null;
    return await db.collection<User>("users").findOne({ _id: oid as any }) as any;
  } catch { return null; }
}

export async function createUser(user: Omit<User, "_id" | "createdAt">): Promise<User | null> {
  const fallbackId = new ObjectId();
  const doc: any = { ...user, _id: fallbackId, createdAt: new Date(), updatedAt: new Date() };

  try {
    const db = await getDb();
    const res = await db.collection<User>("users").insertOne(doc as any);
    if (res.acknowledged) {
      return { ...doc, _id: res.insertedId || fallbackId } as any;
    }
    return doc;
  } catch (err: any) {
    if (err?.code === 11000) {
      console.warn("[AuthModels] createUser: duplicate key for email:", user.email, "— falling back to findUserByEmail");
      const existing = await findUserByEmail(user.email);
      if (existing) return existing;
    }
    console.error("[AuthModels] createUser fallback for email:", user.email, "—", err?.message || err);
    return doc;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
  try {
    const db = await getDb();
    const oid = toObjectId(userId);
    if (!oid) return false;
    const res = await db.collection<User>("users").updateOne(
      { _id: oid as any },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    return res.acknowledged;
  } catch {
    return false;
  }
}

// ── Sessions ───────────────────────────────────────────────────────────────
export async function createSession(session: Omit<Session, "_id" | "createdAt">): Promise<Session | null> {
  try {
    const db = await getDb();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const doc = {
      ...session,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + THIRTY_DAYS),
    };
    const res = await db.collection<Session>("sessions").insertOne(doc as any);
    if (res.acknowledged) return { ...doc, _id: res.insertedId } as any;
    return null;
  } catch { return null; }
}

export async function findSessionByToken(refreshToken: string): Promise<Session | null> {
  try {
    const db = await getDb();
    return db.collection<Session>("sessions").findOne({ refreshToken }) as any;
  } catch { return null; }
}

/**
 * CRITICAL FIX: When upgrading a paying user's plan in /api/subscription/confirm,
 * a new refreshToken JWT is minted with the updated plan claim. We must update
 * the stored refreshToken in the `sessions` collection (or insert a session if
 * none matched) so subsequent /api/auth/refresh calls do NOT fail with
 * "Session revoked" and log the paying user out.
 */
export async function rotateSessionRefreshToken(
  userId: string,
  oldRefreshToken: string | undefined,
  newRefreshToken: string,
  meta?: { userAgent?: string; ip?: string }
): Promise<void> {
  try {
    const db = await getDb();
    const col = db.collection<Session>("sessions");
    if (oldRefreshToken) {
      const updated = await col.updateOne(
        { refreshToken: oldRefreshToken },
        { $set: { refreshToken: newRefreshToken, lastActiveAt: new Date() } }
      );
      if (updated.matchedCount > 0) return;
    }
    // Fallback: create a fresh session record so the new refresh token is valid
    await createSession({
      userId,
      refreshToken: newRefreshToken,
      deviceName: (meta?.userAgent || "Web Browser").slice(0, 120),
      browser: meta?.userAgent || "unknown",
      operatingSystem: "unknown",
      ipAddress: meta?.ip || "unknown",
      location: "unknown",
      lastActiveAt: new Date(),
    });
  } catch (err) {
    console.error("[AuthModels] rotateSessionRefreshToken failed:", err);
  }
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  try {
    const db = await getDb();
    return db.collection<Session>("sessions")
      .find({ userId })
      .sort({ lastActiveAt: -1 })
      .limit(20)
      .toArray() as any;
  } catch { return []; }
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const db = await getDb();
    const oid = toObjectId(sessionId);
    if (!oid) return;
    await db.collection<Session>("sessions").updateOne(
      { _id: oid as any },
      { $set: { lastActiveAt: new Date() } }
    );
  } catch { /* silent */ }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const oid = toObjectId(sessionId);
    if (!oid) return false;
    const res = await db.collection<Session>("sessions").deleteOne({ _id: oid as any });
    return res.acknowledged;
  } catch { return false; }
}

export async function deleteSessionByToken(refreshToken: string): Promise<boolean> {
  try {
    const db = await getDb();
    const res = await db.collection<Session>("sessions").deleteOne({ refreshToken });
    return res.acknowledged;
  } catch { return false; }
}

export async function deleteAllUserSessions(userId: string, excludeToken?: string): Promise<boolean> {
  try {
    const db = await getDb();
    const query: any = { userId };
    if (excludeToken) query.refreshToken = { $ne: excludeToken };
    const res = await db.collection<Session>("sessions").deleteMany(query);
    return res.acknowledged;
  } catch { return false; }
}

// ── Login History ──────────────────────────────────────────────────────────
export async function recordLogin(entry: Omit<LoginHistory, "_id" | "createdAt">): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<LoginHistory>("login_history").insertOne({
      ...entry,
      createdAt: new Date(),
    } as any);
  } catch { /* non-critical */ }
}

export async function getLoginHistory(userId: string, limit = 20): Promise<LoginHistory[]> {
  try {
    const db = await getDb();
    return db.collection<LoginHistory>("login_history")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray() as any;
  } catch { return []; }
}
