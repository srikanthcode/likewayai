import crypto from "crypto";
import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

// ═══════════════════════════════════════════════════════════════════════════
// CSRF TOKEN GENERATION & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// XSS PROTECTION - Input Sanitization
// ═══════════════════════════════════════════════════════════════════════════

// Dangerous HTML patterns to escape
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
};

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[&<>"'`/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

// Strip HTML tags completely (for plain text contexts)
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Validate URL to prevent XSS via javascript: protocol
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const normalized = url.trim().toLowerCase();
  return !normalized.startsWith("javascript:") && 
         !normalized.startsWith("data:") &&
         !normalized.startsWith("vbscript:");
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION DEFENSE
// ═══════════════════════════════════════════════════════════════════════════

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /system\s*:\s*/i,
  /new\s+instructions?\s*:/i,
  /disregard\s+(all\s+)?prior/i,
  /forget\s+(all\s+)?your\s+instructions/i,
  /override\s+(your\s+)?instructions?/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /Human:\s*/i,
  /Assistant:\s*/i,
];

export function detectPromptInjection(input: string): { detected: boolean; pattern?: string } {
  if (!input || typeof input !== "string") return { detected: false };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { detected: true, pattern: pattern.source };
    }
  }

  return { detected: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION BLACKLIST (Revocation)
// ═══════════════════════════════════════════════════════════════════════════

export async function blacklistSession(sessionId: string, reason: string = "logout"): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection("session_blacklist");

    await collection.insertOne({
      sessionId,
      reason,
      blacklistedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
    });

    console.log(`[Security] Session ${sessionId} blacklisted: ${reason}`);
  } catch (error) {
    console.error("Failed to blacklist session:", error);
  }
}

export async function isSessionBlacklisted(sessionId: string): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection("session_blacklist");

    const exists = await collection.findOne({ sessionId });
    return !!exists;
  } catch (error) {
    console.error("Failed to check session blacklist:", error);
    return false; // Fail open for availability
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API KEY ENCRYPTION AT REST
// ═══════════════════════════════════════════════════════════════════════════

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY 
  ? Buffer.from(process.env.API_KEY_ENCRYPTION_KEY, "hex")
  : crypto.randomBytes(32);

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

export type AuditAction = 
  | "user.login"
  | "user.logout"
  | "user.register"
  | "user.password_change"
  | "user.delete_account"
  | "subscription.upgrade"
  | "subscription.downgrade"
  | "api_key.create"
  | "api_key.delete"
  | "chat.message"
  | "chat.history_view"
  | "payment.initiated"
  | "payment.completed"
  | "payment.failed";

export interface AuditLog {
  userId: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export async function logAuditEvent(log: Omit<AuditLog, "timestamp">): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<AuditLog>("audit_logs");

    await collection.insertOne({
      ...log,
      timestamp: new Date(),
    });

    // Log critical events to console as well
    if (["user.login", "user.register", "payment.completed", "user.delete_account"].includes(log.action)) {
      console.log(`[AUDIT] ${log.action} | user=${log.userId} | success=${log.success} | ip=${log.ipAddress || "unknown"}`);
    }
  } catch (error) {
    // Audit logging should never throw - just log to console
    console.error("[AUDIT] Failed to log audit event:", error);
  }
}

export async function getAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<AuditLog>("audit_logs");

    return await collection.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push("Password must be at least 8 characters");
  if (password.length > 128) errors.push("Password must be less than 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  
  return { valid: errors.length === 0, errors };
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  return filename
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 255);
}
