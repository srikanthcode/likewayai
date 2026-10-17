import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateUserSubscription } from "@/lib/user";
import { findUserById, rotateSessionRefreshToken } from "@/lib/auth-models";
import { PLANS, PlanType, normalizePlan } from "@/lib/plans";
import {
  getTokenFromCookies,
  verifyAccessToken,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  generateSessionId,
  fingerprint,
} from "@/lib/auth";
import { getPaymentRef, markPaymentRefStatus } from "@/lib/payments-store";
import { getStripe } from "@/lib/stripe";

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
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
    const existingSessionId = payload.sessionId || generateSessionId();

    const body = await req.json();
    const {
      planId: rawPlanId,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      stripe_session_id,
    } = body;

    const validPlanIds: PlanType[] = ["Go", "Plus", "Pro"];

    // ── Branch 1: Stripe Checkout Session Verification ───────────────────
    if (stripe_session_id) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
      }
      const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
      if (!session || (session.payment_status !== "paid" && session.status !== "complete")) {
        return NextResponse.json({ error: "Stripe payment not completed yet" }, { status: 400 });
      }
      const sessionUserId = session.metadata?.userId;
      const sessionPlanId = normalizePlan(session.metadata?.planId || rawPlanId);
      if (sessionUserId && sessionUserId !== userId) {
        return NextResponse.json({ error: "Stripe session does not match this account" }, { status: 403 });
      }
      if (!validPlanIds.includes(sessionPlanId)) {
        return NextResponse.json({ error: "Invalid plan on Stripe session" }, { status: 400 });
      }

      const subId = typeof session.subscription === "string" ? session.subscription : session.id;
      await updateUserSubscription(userId, sessionPlanId, "active", subId);

      const updatedUser = await findUserById(userId);
      const fp = fingerprint(req);
      const newAccessToken = createAccessToken(
        {
          id: userId,
          email: updatedUser?.email || payload.email,
          role: updatedUser?.role || payload.role,
          plan: sessionPlanId,
        },
        existingSessionId
      );
      const newRefreshToken = createRefreshToken(
        userId,
        existingSessionId,
        updatedUser?.role || payload.role,
        sessionPlanId
      );
      await rotateSessionRefreshToken(userId, tokens.refresh, newRefreshToken, {
        userAgent: fp.userAgent,
        ip: fp.ip,
      });

      const response = NextResponse.json({
        status: "success",
        message: "Stripe subscription confirmed",
        plan: sessionPlanId,
      });
      for (const c of setAuthCookies(newAccessToken, newRefreshToken)) {
        response.cookies.set(c.name, c.value, c.options as any);
      }
      return response;
    }

    // ── Branch 2: Razorpay Order / Subscription Confirmation ─────────────
    const planId = normalizePlan(rawPlanId);
    const orderId = razorpay_order_id || razorpay_subscription_id;

    if (!rawPlanId || !orderId || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required payment parameters" }, { status: 400 });
    }

    if (!validPlanIds.includes(planId)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      console.error("[Subscription Confirm] RAZORPAY_KEY_SECRET is not set");
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Verify both order_id|payment_id and payment_id|subscription_id HMAC signatures
    const orderSig = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${orderId}|${razorpay_payment_id}`)
      .digest("hex");

    const subSig = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_payment_id}|${orderId}`)
      .digest("hex");

    const isMatch =
      Boolean(razorpay_signature) &&
      (timingSafeEqual(orderSig, razorpay_signature) || timingSafeEqual(subSig, razorpay_signature));

    if (!isMatch) {
      console.error("[Subscription Confirm] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 400 });
    }

    // Verify payment reference ownership if recorded in DB
    const ref = await getPaymentRef(orderId);
    if (ref) {
      if (ref.userId !== userId || normalizePlan(ref.planId) !== planId) {
        console.error("[Subscription Confirm] Order/plan mismatch", {
          refUserId: ref.userId,
          userId,
          refPlan: ref.planId,
          planId,
        });
        return NextResponse.json({ error: "Order does not match this account or plan." }, { status: 403 });
      }
    }

    // Persist the plan upgrade to the DB
    await updateUserSubscription(userId, planId, "active", orderId);
    await markPaymentRefStatus(orderId, "paid");

    // Re-fetch user and issue upgraded JWT cookies AND rotate session refreshToken in DB
    const updatedUser = await findUserById(userId);
    const effectivePlan = planId;
    const fp = fingerprint(req);

    const newAccessToken = createAccessToken(
      {
        id: userId,
        email: updatedUser?.email || payload.email,
        role: updatedUser?.role || payload.role,
        plan: effectivePlan,
      },
      existingSessionId
    );
    const newRefreshToken = createRefreshToken(
      userId,
      existingSessionId,
      updatedUser?.role || payload.role,
      effectivePlan
    );

    // CRITICAL FIX: Persist the new refresh token in the `sessions` collection
    // so `/api/auth/refresh` never revokes the paying user's session!
    await rotateSessionRefreshToken(userId, tokens.refresh, newRefreshToken, {
      userAgent: fp.userAgent,
      ip: fp.ip,
    });

    const response = NextResponse.json({
      status: "success",
      message: "Subscription confirmed successfully",
      plan: effectivePlan,
    });

    const cookies = setAuthCookies(newAccessToken, newRefreshToken);
    for (const c of cookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }

    console.log(`[Subscription Confirm] Successfully upgraded user ${userId} to plan ${effectivePlan}`);
    return response;
  } catch (error: any) {
    console.error("Subscription Confirmation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to confirm subscription" }, { status: 500 });
  }
}
