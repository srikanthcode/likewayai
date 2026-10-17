/**
 * MongoDB Index Management for LikeWay AI
 * 
 * Ensures all critical queries have proper indexes.
 * Run this once during deployment or when schema changes.
 */

import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1 | "text">;
  options?: Record<string, any>;
}

const INDEXES: IndexDefinition[] = [
  // ── Chat Memory Indexes ──────────────────────────────────────────────
  {
    collection: "chatmemories",
    index: { userId: 1, projectId: 1, updatedAt: -1 },
    options: { name: "chatmemories_user_project_date" },
  },
  {
    collection: "chatmemories",
    index: { userId: 1, updatedAt: -1 },
    options: { name: "chatmemories_user_date" },
  },
  // Text search for conversation search
  {
    collection: "chatmemories",
    index: { 
      title: "text", 
      summary: "text",
      "messages.content": "text"
    },
    options: { 
      name: "chatmemories_text_search",
      weights: { title: 10, summary: 5, "messages.content": 1 }
    },
  },

  // ── Entitlement Metering (server-side plan limits) ──────────────────
  {
    collection: "daily_usage",
    index: { userId: 1, date: 1 },
    options: { name: "daily_usage_user_date", unique: true },
  },
  // TTL index - keep 90 days of metered usage then purge
  {
    collection: "daily_usage",
    index: { createdAt: 1 },
    options: { name: "daily_usage_ttl", expireAfterSeconds: 90 * 24 * 60 * 60 },
  },

  // ── Payment References (order/subscription -> user/plan) ────────────
  {
    collection: "payment_refs",
    index: { id: 1 },
    options: { name: "payment_refs_id", unique: true },
  },
  {
    collection: "payment_refs",
    index: { userId: 1, createdAt: -1 },
    options: { name: "payment_refs_user" },
  },

  // ── Password Reset OTPs ─────────────────────────────────────────────
  {
    collection: "password_resets",
    index: { email: 1 },
    options: { name: "password_resets_email", unique: true },
  },
  {
    collection: "password_resets",
    index: { expiresAt: 1 },
    options: { name: "password_resets_ttl", expireAfterSeconds: 0 },
  },

  // ── Usage Tracking Indexes ──────────────────────────────────────────
  {
    collection: "usage",
    index: { userId: 1, date: 1 },
    options: { name: "usage_user_date" },
  },
  // TTL index - auto-delete usage records older than 90 days
  {
    collection: "usage",
    index: { date: 1 },
    options: { 
      name: "usage_date_ttl",
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
    },
  },

  // ── Rate Limit Indexes ──────────────────────────────────────────────
  {
    collection: "rate_limits",
    index: { userId: 1, timestamp: -1 },
    options: { name: "rate_limits_user_timestamp" },
  },
  // TTL index - auto-delete rate limit records older than 5 minutes
  {
    collection: "rate_limits",
    index: { timestamp: 1 },
    options: { 
      name: "rate_limits_timestamp_ttl",
      expireAfterSeconds: 300, // 5 minutes
    },
  },

  // ── User Preferences Indexes ────────────────────────────────────────
  {
    collection: "user_preferences",
    index: { userId: 1 },
    options: { name: "user_preferences_user_id", unique: true },
  },

  // ── Session Blacklist Indexes ───────────────────────────────────────
  {
    collection: "session_blacklist",
    index: { sessionId: 1 },
    options: { name: "session_blacklist_session_id", unique: true },
  },
  // TTL index - auto-delete blacklisted sessions after 30 days
  {
    collection: "session_blacklist",
    index: { expiresAt: 1 },
    options: { 
      name: "session_blacklist_expires_ttl",
      expireAfterSeconds: 0,
    },
  },

  // ── Audit Log Indexes ───────────────────────────────────────────────
  {
    collection: "audit_logs",
    index: { userId: 1, timestamp: -1 },
    options: { name: "audit_logs_user_timestamp" },
  },
  {
    collection: "audit_logs",
    index: { action: 1, timestamp: -1 },
    options: { name: "audit_logs_action_timestamp" },
  },
  // TTL index - auto-delete audit logs older than 1 year
  {
    collection: "audit_logs",
    index: { timestamp: 1 },
    options: { 
      name: "audit_logs_timestamp_ttl",
      expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
    },
  },

  // ── Users Collection Indexes ────────────────────────────────────────
  {
    collection: "users",
    index: { email: 1 },
    options: { name: "users_email", unique: true, sparse: true },
  },
  {
    collection: "users",
    index: { googleId: 1 },
    options: { name: "users_google_id", unique: true, sparse: true },
  },
];

export async function ensureIndexes(): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    for (const def of INDEXES) {
      try {
        const collection = db.collection(def.collection);
        await collection.createIndex(def.index, {
          ...def.options,
          background: true,
        });
        created++;
      } catch (err: any) {
        // Ignore "index already exists" errors
        if (err.code !== 86) { // 86 = IndexKeySpecsConflict
          errors.push(`${def.collection}.${def.options?.name || "unnamed"}: ${err.message}`);
        }
      }
    }

    console.log(`[Indexes] Created/verified ${created} indexes`);
    if (errors.length > 0) {
      console.warn(`[Indexes] ${errors.length} errors:`, errors);
    }
  } catch (error) {
    console.error("[Indexes] Failed to ensure indexes:", error);
    errors.push(String(error));
  }

  return { created, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY OPTIMIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export async function getCollectionStats(): Promise<Record<string, { count: number; size: number }>> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const collections = await db.listCollections().toArray();
    const stats: Record<string, { count: number; size: number }> = {};
    
    for (const col of collections) {
      try {
        const collection = db.collection(col.name);
        const count = await collection.estimatedDocumentCount();
        const collStats = await db.command({ collStats: col.name });
        stats[col.name] = {
          count,
          size: collStats.size || 0,
        };
      } catch {
        stats[col.name] = { count: 0, size: 0 };
      }
    }
    
    return stats;
  } catch (error) {
    console.error("Failed to get collection stats:", error);
    return {};
  }
}
