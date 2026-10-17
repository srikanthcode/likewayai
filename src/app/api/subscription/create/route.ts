import { NextRequest, NextResponse } from "next/server";
import { PLANS, PlanType } from "@/lib/plans";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { recordPaymentRef } from "@/lib/payments-store";

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

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const validPlanIds: PlanType[] = ["Go", "Plus", "Pro"];
    if (!validPlanIds.includes(planId as PlanType)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // ── Degrade safely instead of returning a fake subscription ──────────
    if (!razorpayKeyId || !razorpayKeySecret || razorpayKeyId === "rzp_test_your_id") {
      return NextResponse.json(
        { error: "Recurring billing is not configured yet. Please contact support." },
        { status: 503 }
      );
    }

    const plan = PLANS[planId as PlanType];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const { createRazorpaySubscription, createRazorpayPlan } = await import("@/lib/razorpay");

    let rzpPlanId = plan.razorpayPlanId;
    if (!rzpPlanId) {
      // Auto-provision plan on Razorpay if not preconfigured in environment variables
      try {
        const priceRupees = parseInt(String(plan.price).replace(/[^0-9]/g, ""), 10) || 0;
        console.log(`[Subscription Create] Auto-provisioning Razorpay plan for ${planId} (₹${priceRupees})...`);
        const created = await createRazorpayPlan(
          `Likeway ${plan.name} Monthly`,
          priceRupees,
          `${plan.name} Subscription - Likeway AI Platform`
        );
        if (created?.id) {
          rzpPlanId = created.id;
        }
      } catch (provisionErr: any) {
        console.error(`[Subscription Create] Dynamic plan provisioning failed:`, provisionErr.message);
      }
    }

    if (!rzpPlanId) {
      console.error(`[Subscription Create] Missing RAZORPAY_PLAN_* for ${planId}`);
      return NextResponse.json(
        {
          error:
            "Recurring billing for this plan is not configured yet. " +
            "Please use the standard checkout flow or contact support.",
        },
        { status: 503 }
      );
    }

    const subscription = await createRazorpaySubscription(rzpPlanId, { userId, planId });

    // Persist the subscription -> user/plan mapping so webhooks can resolve it
    // even if Razorpay omits notes on a later event.
    await recordPaymentRef({
      id: subscription.id,
      type: "subscription",
      userId,
      planId,
      status: String(subscription.status || "created"),
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: razorpayKeyId,
    });
  } catch (error: any) {
    console.error("Subscription Creation Error:", error);

    const errorMessage = error.error?.description || error.message || "Failed to create subscription";

    return NextResponse.json({
      error: errorMessage,
      details: error.error || null
    }, { status: 500 });
  }
}