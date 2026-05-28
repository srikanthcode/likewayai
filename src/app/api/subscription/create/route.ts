import { NextRequest, NextResponse } from "next/server";
import { PLANS, PlanType } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId, planId } = await req.json();

    if (!userId || !planId) {
      return NextResponse.json({ error: "Missing userId or planId" }, { status: 400 });
    }

    const plan = PLANS[planId as PlanType];
    if (!plan || !plan.razorpayPlanId) {
      return NextResponse.json({ error: "Invalid plan or missing Razorpay Plan ID" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_your_id") {
      return NextResponse.json({
        subscriptionId: "sub_mock_" + Math.random().toString(36).substring(2, 11),
        keyId: "rzp_test_mock_id",
        isMock: true
      });
    }

    const { createRazorpaySubscription } = await import("@/lib/razorpay");
    const subscription = await createRazorpaySubscription(plan.razorpayPlanId, { userId });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
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
