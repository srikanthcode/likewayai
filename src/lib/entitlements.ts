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
    chat_messages: -1,
    frontier_models: -1,
    image_generation: -1,
    image_editing: -1,
    deep_research: -1,
    browser_automation: -1,
    computer_control: -1,
    realtime_voice: -1,
    autonomous_app_builder: -1,
  },
};

export interface EntitlementResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  plan?: PlanType;
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
    reason: `Model "${modelId}" requires the ${upgradeFrom(plan)} plan or higher. Upgrade your plan to unlock all frontier AI models.`,
    upgradeTier: upgradeFrom(plan),
  };
}

/**
 * Resolve the user's authoritative active plan from DB if JWT is stale.
 */
export async function resolveEffectivePlan(
  userId: string,
  planInput: string | PlanType | undefined,
  role?: string
): Promise<PlanType> {
  if (isAdminUser({ role })) return "Pro";
  let plan = normalizePlan(planInput);
  if (userId && userId !== "anonymous") {
    try {
      const { getUserPlan } = await import("./user");
      const userSub = await getUserPlan(userId);
      if (userSub && (userSub.status === "active" || userSub.status === "authenticated") && userSub.plan !== "Core") {
        plan = userSub.plan;
      }
    } catch {
      // Fallback to token plan on transient DB error
    }
  }
  return plan;
}

/**
 * Atomically consume one unit of a metered feature for today.
 * Admins and unlimited (-1) plans are never blocked.
 */
export async function consumeEntitlement(
  userId: string,
  planInput: string | PlanType | undefined,
  feature: MeteredFeature,
  role?: string
): Promise<EntitlementResult> {
  if (isAdminUser({ role })) {
    return { allowed: true, remaining: 999999, limit: -1, used: 0, plan: "Pro" };
  }

  const plan = await resolveEffectivePlan(userId, planInput, role);
  const limit = PLAN_LIMITS[plan]?.[feature] ?? 0;

  if (limit === -1) {
    return { allowed: true, remaining: 999999, limit: -1, used: 0, plan };
  }

  if (limit <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      used: 0,
      plan,
      reason: `This feature is not included in the ${plan} plan. Upgrade to ${upgradeFrom(plan)} to unlock it.`,
      upgradeTier: upgradeFrom(plan),
    };
  }

  const date = todayKey();
  const fieldPath = `counts.${feature}`;

  try {
    const collection = await getUsageCollection();

    // Ensure today's counter document exists (idempotent).
    await collection.updateOne(
      { userId, date },
      { $setOnInsert: { userId, date, counts: {}, createdAt: new Date() } },
      { upsert: true }
    );

    // CRITICAL FIX: In MongoDB, `{ "counts.feature": { $lt: limit } }` does NOT match
    // when `counts.feature` is undefined (first use of the day)! We must match either
    // `$exists: false` OR `$lt: limit`.
    const updatedRaw: any = await collection.findOneAndUpdate(
      {
        userId,
        date,
        $or: [
          { [fieldPath]: { $exists: false } },
          { [fieldPath]: { $lt: limit } },
        ],
      },
      {
        $inc: { [fieldPath]: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    const updatedDoc = updatedRaw && typeof updatedRaw === "object" && "value" in updatedRaw
      ? updatedRaw.value
      : updatedRaw;

    if (!updatedDoc) {
      const current = await collection.findOne({ userId, date });
      const used = (current as any)?.counts?.[feature] ?? 0;
      if (used < limit) {
        // Fallback increment if driver didn't return updated doc
        await collection.updateOne(
          { userId, date },
          { $inc: { [fieldPath]: 1 }, $set: { updatedAt: new Date() } }
        );
        return {
          allowed: true,
          remaining: Math.max(0, limit - (used + 1)),
          limit,
          used: used + 1,
          plan,
        };
      }
      return {
        allowed: false,
        remaining: 0,
        limit,
        used,
        plan,
        reason: `Daily limit of ${limit} ${feature.replace(/_/g, " ")} reached on the ${plan} plan.`,
        upgradeTier: upgradeFrom(plan),
      };
    }

    const used = updatedDoc?.counts?.[feature] ?? 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - used),
      limit,
      used,
      plan,
    };
  } catch (err) {
    console.error("[Entitlements] Metering failed:", err);
    // Fail open for infrastructure errors to avoid blocking paying users
    return { allowed: true, remaining: 1, limit: 1, used: 0, plan };
  }
}

/** Read usage without incrementing (for UI quotas). */
export async function getEntitlementUsage(
  userId: string,
  planInput: string | PlanType | undefined,
  feature: MeteredFeature,
  role?: string
): Promise<EntitlementResult> {
  const plan = await resolveEffectivePlan(userId, planInput, role);
  const limit = PLAN_LIMITS[plan]?.[feature] ?? 0;
  if (limit === -1) return { allowed: true, remaining: 999999, limit: -1, used: 0, plan };
  if (limit <= 0) return { allowed: false, remaining: 0, limit: 0, used: 0, plan };

  try {
    const collection = await getUsageCollection();
    const doc = await collection.findOne({ userId, date: todayKey() });
    const used = (doc as any)?.counts?.[feature] ?? 0;
    return { allowed: used < limit, remaining: Math.max(0, limit - used), limit, used, plan };
  } catch {
    return { allowed: true, remaining: limit, limit, used: 0, plan };
  }
}

/** Build a 402-style JSON error body for a denied entitlement. */
export function entitlementDenied(result: EntitlementResult): {
  error: string;
  upgradeTo?: PlanType;
  plan?: PlanType;
} {
  return {
    error: result.reason || "Upgrade required",
    upgradeTo: result.upgradeTier,
    plan: result.plan,
  };
}