import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { PLANS, PlanType } from "@/lib/plans";
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

    const { planId, receipt } = await req.json();

    // ── The price is derived from the plan on the SERVER. A client-supplied
    // amount is never trusted, otherwise a user could pay ₹1 for the Pro plan.
    const validPlanIds: PlanType[] = ["Go", "Plus", "Pro"];
    if (!planId || !validPlanIds.includes(planId as PlanType)) {
      return NextResponse.json({ error: "A valid planId is required" }, { status: 400 });
    }

    const plan = PLANS[planId as PlanType];
    const priceRupees = parseInt(String(plan.price).replace(/[^0-9]/g, ""), 10) || 0;
    const amount = priceRupees * 100; // paise

    if (amount < 100) {
      return NextResponse.json({ error: "Invalid plan price configuration" }, { status: 500 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret || razorpayKeyId === "rzp_test_your_id") {
      return NextResponse.json(
        { error: "Payments are not configured yet. Please contact support." },
        { status: 503 }
      );
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
    }

    // Razorpay receipt max 40 chars — truncate to avoid 400 error
    const shortReceipt = (receipt || `r_${Date.now()}`).slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: shortReceipt,
      notes: {
        country: "IN",
        userId,
        planId,
      },
    });

    if (!order) {
      throw new Error("Razorpay API returned undefined response");
    }

    // Persist the order -> user/plan mapping so confirmation and webhooks can
    // resolve it server-side.
    await recordPaymentRef({
      id: order.id,
      type: "order",
      userId,
      planId,
      amount,
      status: "created",
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayKeyId,
    });
  } catch (error: any) {
    console.error("Order Creation Error:", error);

    if (error.statusCode === 401) {
      return NextResponse.json({ error: "Authentication failed. Check your Razorpay credentials." }, { status: 401 });
    }

    const errorMessage = error.error?.description || error.message || "Failed to create order";
    return NextResponse.json({
      error: errorMessage,
      details: error.error || null
    }, { status: 500 });
  }
}