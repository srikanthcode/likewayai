import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateUserSubscription } from "@/lib/user";
import { findUserById } from "@/lib/auth-models";
import { PLANS, PlanType, normalizePlan } from "@/lib/plans";
import {
  getTokenFromCookies,
  verifyAccessToken,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  generateSessionId,
  isVipUser,
} from "@/lib/auth";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = payload.sub;

    // ── CRITICAL: Reuse the existing session ID so the DB session stays
    // valid after payment. Generating a new UUID here would create a token
    // that has no matching session in the DB, causing the next /api/auth/me
    // call to fail and silently log the user out. ──────────────────────────
    const existingSessionId = payload.sessionId || generateSessionId();

    const {
      planId,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
    } = await req.json();

    // Accept either razorpay_order_id (standard checkout) or razorpay_subscription_id (subscription checkout)
    const orderId = razorpay_order_id || razorpay_subscription_id;

    if (!planId || !orderId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const validPlanIds: PlanType[] = ["Go", "Plus", "Pro"];
    if (!validPlanIds.includes(planId as PlanType)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const plan = PLANS[planId as PlanType];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
      console.error("[Subscription Confirm] RAZORPAY_KEY_SECRET is not set");
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Standard checkout signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${orderId}|${razorpay_payment_id}`)
      .digest("hex");

    if (!razorpay_signature || !timingSafeEqual(generatedSignature, razorpay_signature)) {
      console.error("[Subscription Confirm] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 400 });
    }

    // Persist the plan upgrade to the DB
    await updateUserSubscription(userId, planId as PlanType, "active", orderId);

    // Re-fetch user to get the freshest DB state
    const updatedUser = await findUserById(userId);
    if (updatedUser) {
      const vip = isVipUser(userId, updatedUser.email);
      // VIP always gets Pro regardless of what they paid for
      const effectivePlan = vip ? "Pro" : planId;

      // Issue new tokens with the upgraded plan — reusing existing sessionId
      const newAccessToken = createAccessToken(
        {
          id: userId,
          email: updatedUser.email,
          role: vip ? "admin" : updatedUser.role,
          plan: effectivePlan,
        },
        existingSessionId
      );
      const newRefreshToken = createRefreshToken(userId, existingSessionId);

      const response = NextResponse.json({
        status: "success",
        message: "Subscription confirmed successfully",
        plan: normalizePlan(effectivePlan),
      });

      const cookies = setAuthCookies(newAccessToken, newRefreshToken);
      for (const c of cookies) {
        response.cookies.set(c.name, c.value, c.options as any);
      }

      console.log(`[Subscription Confirm] Successfully upgraded user ${userId} to plan ${effectivePlan}`);
      return response;
    }

    // Fallback: DB fetch failed — still return success (plan was saved above)
    console.log(`[Subscription Confirm] Successfully upgraded user ${userId} to plan ${planId}`);
    return NextResponse.json({ status: "success", message: "Subscription confirmed successfully" });
  } catch (error: any) {
    console.error("Subscription Confirmation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to confirm subscription" }, { status: 500 });
  }
}
