import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateUserSubscription } from "@/lib/user";
import { PLANS, PlanType } from "@/lib/plans";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (!timingSafeEqual(expectedSignature, signature)) {
      console.error("Invalid Razorpay Webhook Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("Razorpay Webhook Event:", event.event);

    const subscription = event.payload.subscription?.entity;
    if (!subscription) {
      return NextResponse.json({ status: "ok" });
    }

    const subscriptionId = subscription.id;
    const planId = subscription.plan_id;
    const status = subscription.status; // active, cancelled, etc.

    // Map Razorpay Plan ID back to our Tier
    const tier = Object.values(PLANS).find(p => p.razorpayPlanId === planId)?.id || "Core";

    // Since Webhooks don't always carry the original userId in a standard field,
    // we should have stored the subscriptionId <-> userId mapping during creation.
    // For now, we'll try to find the user by subscriptionId in our DB.
    // (In a real app, you might use subscription.notes.userId if you passed it during creation)
    
    // For simplicity, we'll assume the userId is passed in notes.userId
    const userId = subscription.notes?.userId || "unknown";

    if (userId !== "unknown") {
      await updateUserSubscription(userId, tier as PlanType, status, subscriptionId);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
