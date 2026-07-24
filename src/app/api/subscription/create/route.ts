import { NextRequest, NextResponse } from "next/server";
import { PLANS, PlanType } from "@/lib/plans";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

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

    const plan = PLANS[planId as PlanType];
    if (!plan || !plan.razorpayPlanId) {
      return NextResponse.json({ error: "Invalid plan or missing Razorpay Plan ID" }, { status: 400 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKeyId || razorpayKeyId === "rzp_test_your_id") {
      return NextResponse.json({
        subscriptionId: "sub_test_" + Math.random().toString(36).substring(2, 11),
        keyId: "rzp_test_mock_id",
        isMock: true
      });
    }

    const { createRazorpaySubscription } = await import("@/lib/razorpay");
    const subscription = await createRazorpaySubscription(plan.razorpayPlanId, { userId });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: razorpayKeyId,
    });
  } catch (error: any) {
    console.error("Subscription Creation Error:", error);
    
    // Extract precise error message from Razorpay if available
    const errorMessage = error.error?.description || error.message || "Failed to create subscription";
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.error || null 
    }, { status: 500 });
  }
}
