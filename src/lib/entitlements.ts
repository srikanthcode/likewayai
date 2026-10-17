// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — SERVER-SIDE ENTITLEMENT ENGINE
// The single source of truth for what a plan may do. Every metered API
// (chat, image, browser, computer control, voice, app builder) must call
// consumeEntitlement() before doing work. Nothing is gated in the UI only.
// ══════════════════════════════════════════════════════════════════════

import clientPromise from "./mongodb";
import { PLANS, PlanType, normalizePlan } from "./plans";
import { isAdminUser } from "./auth";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";
const COLLECTION = "daily_usage";

export type MeteredFeature =
  | "chat_messages"
  | "frontier_models"
  | "image_generation"
  | "image_editing"
  | "deep_research"
  | "browser_automation"
  | "computer_control"
  | "realtime_voice"
  | "autonomous_app_builder";

/** Daily allowances per plan. -1 = unlimited. 0 = feature not included. */
export const PLAN_LIMITS: Record<PlanType, Record<MeteredFeature, number>> = {
  Core: {
    chat_messages: 200,
    frontier_models: 5,
    image_generation: 3,
    image_editing: 0,
    deep_research: 2,
    browser_automation: 2,
    computer_control: 3,
    realtime_voice: 5,
    autonomous_app_builder: 1,
  },
  Go: {
    chat_messages: 10000,
    frontier_models: 300,
    image_generation: 50,
    image_editing: 25,
    deep_research: 25,
    browser_automation: 50,
    computer_control: 25,
    realtime_voice: 30,
    autonomous_app_builder: 10,
  },
  Plus: {
    chat_messages: 50000,
    frontier_models: 1500,
    image_generation: 200,
    image_editing: 100,
    deep_research: 100,
    browser_automation: 500,
    computer_control: 500,
    realtime_voice: 120,
    autonomous_app_builder: 50,
  },
  Pro: {
    chat_messages: 100000,
    frontier_models: 5000,
    image_generation: 1000,
    image_editing: 500,
    deep_research: 500,
    browser_automation: 2000,
    computer_control: 5000,
    realtime_voice: 600,
    autonomous_app_builder: 500,
  },
};

export interface EntitlementResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  reason?: string;
  upgradeTier?: PlanType;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function upgradeFrom(plan: PlanType): PlanType {
  if (plan === "Core") return "Go";
  if (plan === "Go") return "Plus";
  return "Pro";
}

let indexEnsured = false;
async function getUsageCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);
  if (!indexEnsured) {
    try {
      await collection.createIndex(
        { userId: 1, date: 1 },
        { unique: true, name: "daily_usage_user_date" }
      );
    } catch {
      // index may already exist / DB unavailable — non-fatal
    }
    indexEnsured = true;
  }
  return collection;
}

/**
 * Verify the requested model is included in the plan. Admins bypass.
 */
export function checkModelAccess(
  plan: PlanType,
  modelId?: string,
  role?: string
): { allowed: boolean; reason?: string; upgradeTier?: PlanType } {
  if (isAdminUser({ role })) return { allowed: true };
  if (!modelId) return { allowed: true };

  const planDef = PLANS[plan] || PLANS.Core;
  const allowed = planDef.limits.modelsAllowed;

  if (allowed.includes("*") || allowed.includes(modelId)) return { allowed: true };

  return {
    allowed: false,
    reason: `Model "${modelId}" is not included in the ${plan} plan.`,
    upgradeTier: upgradeFrom(plan),
  };
}

/**
 * Atomically consume one unit of a metered feature for today.
 * Admins are unlimited and never counted.
 */
export async function consumeEntitlement(
  userId: string,
  planInput: string | PlanType | undefined,
  feature: MeteredFeature,
  role?: string
): Promise<EntitlementResult> {
  let plan = normalizePlan(planInput);

  if (isAdminUser({ role })) {
    return { allowed: true, remaining: 999999, limit: 999999, used: 0 };
  }

  // Real-time plan sync: If token has Core, verify with DB to honor active payer status
  if (userId && userId !== "anonymous" && plan === "Core") {
    try {
      const { getUserPlan } = await import("./user");
      const userSub = await getUserPlan(userId);
      if (userSub && userSub.status === "active" && userSub.plan !== "Core") {
        plan = userSub.plan;
      }
    } catch {}
  }

  const limit = PLAN_LIMITS[plan]?.[feature] ?? 0;

  if (limit <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      used: 0,
      reason: `This feature is not included in the ${plan} plan.`,
      upgradeTier: upgradeFrom(plan),
    };
  }

  if (limit === -1) {
    return { allowed: true, remaining: 999999, limit: -1, used: 0 };
  }

  const date = todayKey();

  try {
    const collection = await getUsageCollection();

    // Ensure today's counter document exists (idempotent).
    await collection.updateOne(
      { userId, date },
      { $setOnInsert: { userId, date, counts: {}, createdAt: new Date() } },
      { upsert: true }
    );

    // Atomic conditional increment.
    const updated = await collection.findOneAndUpdate(
      { userId, date, [`counts.${feature}`]: { $lt: limit } },
      { $inc: { [`counts.${feature}`]: 1 } },
      { returnDocument: "after" }
    );

    if (!updated) {
      const current = await collection.findOne({ userId, date });
      const used = (current as any)?.counts?.[feature] ?? limit;
      return {
        allowed: false,
        remaining: 0,
        limit,
        used,
        reason: `Daily limit of ${limit} ${feature.replace(/_/g, " ")} reached on the ${plan} plan.`,
        upgradeTier: upgradeFrom(plan),
      };
    }

    const used = (updated as any)?.counts?.[feature] ?? 1;
    return { allowed: true, remaining: Math.max(0, limit - used), limit, used };
  } catch (err) {
    console.error("[Entitlements] Metering failed:", err);
    // Fail closed for zero-cost-to-us features? No — fail open only for
    // infrastructure errors to avoid blocking paying users.
    return { allowed: true, remaining: 1, limit: 1, used: 0 };
  }
}

/** Read usage without incrementing (for UI quotas). */
export async function getEntitlementUsage(
  userId: string,
  planInput: string | PlanType | undefined,
  feature: MeteredFeature
): Promise<EntitlementResult> {
  const plan = normalizePlan(planInput);
  const limit = PLAN_LIMITS[plan]?.[feature] ?? 0;
  if (limit === -1) return { allowed: true, remaining: 999999, limit: -1, used: 0 };
  if (limit <= 0) return { allowed: false, remaining: 0, limit: 0, used: 0 };

  try {
    const collection = await getUsageCollection();
    const doc = await collection.findOne({ userId, date: todayKey() });
    const used = (doc as any)?.counts?.[feature] ?? 0;
    return { allowed: used < limit, remaining: Math.max(0, limit - used), limit, used };
  } catch {
    return { allowed: true, remaining: limit, limit, used: 0 };
  }
}

/** Build a 402-style JSON error body for a denied entitlement. */
export function entitlementDenied(result: EntitlementResult): {
  error: string;
  upgradeTo?: PlanType;
} {
  return { error: result.reason || "Upgrade required", upgradeTo: result.upgradeTier };
}