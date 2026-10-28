import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateUserSubscription, SubscriptionStatus } from "@/lib/user";
import { PLANS, PlanType } from "@/lib/plans";
import { getPaymentRef, markPaymentRefStatus } from "@/lib/payments-store";
import clientPromise from "@/lib/mongodb";

/**
 * Claims a webhook event id. Returns true when the event was already handled.
 * The unique index makes the check atomic across concurrent deliveries.
 */
async function claimWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  const dbName = process.env.MONGODB_DB_NAME || "likeway_ai";
  const client = await clientPromise;
  const col = client.db(dbName).collection("webhook_events");
  try {
    await col.createIndex({ eventId: 1 }, { unique: true, name: "webhook_event_id" });
  } catch {
    /* index may already exist */
  }
  try {
    await col.insertOne({ eventId, eventType, receivedAt: new Date() });
    return false;
  } catch (err: any) {
    // 11000 = duplicate key → this delivery is a retry.
    if (err?.code === 11000) return true;
    // If we cannot record the event, fail closed rather than double-apply.
    throw err;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Map a Razorpay plan_id back to a Likeway tier. */
function tierForRazorpayPlan(planId?: string): PlanType | null {
  if (!planId) return null;
  const found = Object.values(PLANS).find((p) => p.razorpayPlanId && p.razorpayPlanId === planId);
  return found ? found.id : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    // Razorpay signs the RAW body with HMAC-SHA256.
    const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (!timingSafeEqual(expectedSignature, signature)) {
      console.error("[Webhook] Invalid Razorpay signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType: string = event.event || "";
    const payload = event.payload || {};
    const eventId =
      req.headers.get("x-razorpay-event-id") ||
      (event as any)?.id ||
      crypto.createHash("sha256").update(body).digest("hex");
    console.log("[Webhook] Razorpay event:", eventType);

    // ── Idempotency ───────────────────────────────────────────────────────
    // Razorpay retries deliveries. Applying the same event twice would extend
    // access twice, so the event id is claimed atomically first.
    const alreadyProcessed = await claimWebhookEvent(eventId, eventType);
    if (alreadyProcessed) {
      return NextResponse.json({ status: "ok", duplicate: true });
    }

    // ── Resolve the affected user + intended plan ─────────────────────────
    let userId: string | undefined;
    let resolvedPlanId: PlanType | null = null;
    let referenceId: string | undefined;

    // One-time order flow (order.paid / payment.captured)
    const orderEntity = payload.order?.entity;
    const paymentEntity = payload.payment?.entity;
    const subscriptionEntity = payload.subscription?.entity;

    if (orderEntity) {
      referenceId = orderEntity.id;
      const ref = await getPaymentRef(orderEntity.id);
      userId = ref?.userId || orderEntity.notes?.userId;
      resolvedPlanId = (ref?.planId as PlanType) || (orderEntity.notes?.planId as PlanType) || null;
    } else if (paymentEntity) {
      const orderId = paymentEntity.order_id;
      referenceId = orderId;
      const ref = orderId ? await getPaymentRef(orderId) : null;
      userId = ref?.userId || paymentEntity.notes?.userId;
      resolvedPlanId = (ref?.planId as PlanType) || (paymentEntity.notes?.planId as PlanType) || null;
    } else if (subscriptionEntity) {
      referenceId = subscriptionEntity.id;
      const ref = await getPaymentRef(subscriptionEntity.id);
      userId = ref?.userId || subscriptionEntity.notes?.userId;
      resolvedPlanId =
        (ref?.planId as PlanType) ||
        tierForRazorpayPlan(subscriptionEntity.plan_id) ||
        null;
    }

    // ── Apply the event ───────────────────────────────────────────────────
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (userId && resolvedPlanId) {
        await updateUserSubscription(userId, resolvedPlanId, "active", referenceId);
        await markPaymentRefStatus(referenceId!, "paid");
      } else {
        console.error("[Webhook] Could not resolve user/plan for", eventType, referenceId);
      }
    } else if (eventType === "subscription.activated" || eventType === "subscription.charged" || eventType === "subscription.authenticated") {
      if (userId && resolvedPlanId) {
        await updateUserSubscription(userId, resolvedPlanId, "active", referenceId);
        await markPaymentRefStatus(referenceId!, "active");
      } else {
        console.error("[Webhook] Could not resolve user/plan for", eventType, referenceId);
      }
    } else if (eventType === "subscription.cancelled" || eventType === "subscription.paused" || eventType === "subscription.halted") {
      // Access typically continues until the paid period ends — record the
      // status but keep the plan for now.
      if (userId) {
        await updateUserSubscription(userId, resolvedPlanId || "Core", "cancelled", referenceId);
        await markPaymentRefStatus(referenceId!, "cancelled");
      }
    } else if (eventType === "subscription.completed" || eventType === "subscription.expired") {
      // Term ended — downgrade to the free tier.
      if (userId) {
        await updateUserSubscription(userId, "Core", "expired", referenceId);
        await markPaymentRefStatus(referenceId!, "expired");
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}