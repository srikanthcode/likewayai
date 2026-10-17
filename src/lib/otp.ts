// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — ONE-TIME PASSWORD (OTP) STORE
// Crypto-random codes, stored only as SHA-256 hashes with a hard TTL.
// No universal/test codes. No auto-account creation.
// ══════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";
const COLLECTION = "password_resets";

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

export interface PasswordResetRecord {
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

/** Generate a cryptographically secure 6-digit code. */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/** Hash an OTP for storage/comparison. */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/** Constant-time hash comparison. */
export function otpMatches(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(candidate));
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

let indexEnsured = false;
async function getCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<PasswordResetRecord>(COLLECTION);
  if (!indexEnsured) {
    try {
      // Unique per email; TTL index purges expired codes automatically.
      await collection.createIndex({ email: 1 }, { unique: true, name: "password_resets_email" });
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "password_resets_ttl" });
    } catch {
      // Index may already exist or DB may be unavailable — non-fatal.
    }
    indexEnsured = true;
  }
  return collection;
}

/**
 * Persist a freshly generated OTP as a hash. Replaces any previous code.
 * Returns the plaintext OTP for the caller to email — it is never stored.
 */
export async function createPasswordReset(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const otp = generateOtp();
  try {
    const collection = await getCollection();
    await collection.updateOne(
      { email: normalized },
      {
        $set: {
          email: normalized,
          otpHash: hashOtp(otp),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          attempts: 0,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[OTP] Failed to persist reset code:", err);
    throw err;
  }
  return otp;
}

/**
 * Verify an OTP. Enforces expiry and a per-code attempt cap.
 * Returns true only for an exact, unexpired match.
 */
export async function verifyPasswordReset(email: string, otp: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const candidate = (otp || "").trim();
  if (candidate.length !== 6) return false;

  try {
    const collection = await getCollection();
    const record = await collection.findOne({ email: normalized });
    if (!record) return false;

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      await collection.deleteOne({ email: normalized });
      return false;
    }

    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      await collection.deleteOne({ email: normalized });
      return false;
    }

    if (!otpMatches(candidate, record.otpHash)) {
      await collection.updateOne({ email: normalized }, { $inc: { attempts: 1 } });
      return false;
    }

    return true;
  } catch (err) {
    console.error("[OTP] Verification error:", err);
    return false;
  }
}

/** Consume the reset code so it cannot be replayed. */
export async function clearPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  try {
    const collection = await getCollection();
    await collection.deleteOne({ email: normalized });
  } catch {
    // non-fatal
  }
}