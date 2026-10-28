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

    // An order id and a subscription id are different resources with different
    // signature shapes. Never let one stand in for the other.
    const isSubscription = Boolean(razorpay_subscription_id) && !razorpay_order_id;
    const orderId = isSubscription ? razorpay_subscription_id : razorpay_order_id;

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

    // Verify the ONE signature shape that applies to this resource:
    //   order        → HMAC(order_id|payment_id)
    //   subscription → HMAC(payment_id|subscription_id)
    const signedPayload = isSubscription
      ? `${razorpay_payment_id}|${orderId}`
      : `${orderId}|${razorpay_payment_id}`;

    const expectedSig = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(signedPayload)
      .digest("hex");

    if (!timingSafeEqual(expectedSig, razorpay_signature)) {
      console.error("[Subscription Confirm] Signature mismatch", { isSubscription });
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 400 });
    }

    // A valid signature proves Razorpay produced it, but NOT that this order
    // belongs to this user or this plan. The server-side reference is the
    // authority, so a missing reference is a hard failure (fail closed).
    const ref = await getPaymentRef(orderId);
    if (!ref) {
      console.error("[Subscription Confirm] No server-side payment reference for order", { orderId });
      return NextResponse.json(
        { error: "This payment was not started from your account. Contact support." },
        { status: 403 }
      );
    }
    if (ref.userId !== userId || normalizePlan(ref.planId) !== planId) {
      console.error("[Subscription Confirm] Order/plan mismatch", {
        refUserId: ref.userId,
        userId,
        refPlan: ref.planId,
        planId,
      });
      return NextResponse.json({ error: "Order does not match this account or plan." }, { status: 403 });
    }
    if (ref.type !== (isSubscription ? "subscription" : "order")) {
      return NextResponse.json({ error: "Payment type mismatch." }, { status: 400 });
    }
    if (!isSubscription && typeof ref.amount === "number") {
      // The charge must equal the server-side price for this plan.
      const expectedAmount =
        parseInt(String(PLANS[planId].price).replace(/[^0-9]/g, ""), 10) * 100;
      if (expectedAmount > 0 && ref.amount !== expectedAmount) {
        console.error("[Subscription Confirm] Amount mismatch", {
          expectedAmount,
          recordedAmount: ref.amount,
        });
        return NextResponse.json({ error: "Payment amount does not match the plan price." }, { status: 400 });
      }
    }

    // Reject a replay: a reference already marked paid must not extend access again.
    if (ref.status === "paid" || ref.status === "active") {
      return NextResponse.json(
        { status: "already_confirmed", plan: planId, message: "This payment was already applied." },
        { status: 200 }
      );
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
