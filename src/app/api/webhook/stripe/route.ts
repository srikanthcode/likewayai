import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { updateUserSubscription } from "@/lib/user";
import { PlanType, PLANS } from "@/lib/plans";

// Stripe sends raw body — must read as text before parsing
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`📦 Stripe webhook received: ${event.type}`);

  switch (event.type) {
    // Payment completed — activate plan
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId: string = session.metadata?.userId;
      const planId = session.metadata?.planId as PlanType;
      const subscriptionId: string = session.subscription;

      if (userId && planId) {
        await updateUserSubscription(userId, planId, "active", subscriptionId);
        console.log(`✅ Plan activated: ${planId} for user ${userId}`);
      }
      break;
    }

    // Subscription renewed successfully
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      const subscriptionId: string = invoice.subscription;

      // Fetch the subscription to get metadata
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId: string = (subscription.metadata as any)?.userId;
      const planId = Object.values(PLANS).find(
        (p) => p.stripePriceId === (subscription.items.data[0]?.price?.id ?? "")
      )?.id as PlanType | undefined;

      if (userId && planId) {
        await updateUserSubscription(userId, planId, "active", subscriptionId);
        console.log(`🔄 Subscription renewed: ${planId} for user ${userId}`);
      }
      break;
    }

    // Subscription cancelled or expired — downgrade to Core
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      const userId: string = subscription.metadata?.userId;
      if (userId) {
        await updateUserSubscription(userId, "Core", "cancelled", subscription.id);
        console.log(`❌ Subscription cancelled for user ${userId}, downgraded to Core`);
      }
      break;
    }

    // Payment failed — mark as pending
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      const subscriptionId: string = invoice.subscription;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId: string = (subscription.metadata as any)?.userId;
      if (userId) {
        await updateUserSubscription(userId, "Core", "pending", subscriptionId);
        console.log(`⚠️ Payment failed for user ${userId}`);
      }
      break;
    }

    default:
      // Unhandled event — safe to ignore
      break;
  }

  return NextResponse.json({ received: true });
}
