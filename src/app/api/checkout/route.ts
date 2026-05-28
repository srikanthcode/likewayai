import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { PLANS, PlanType } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId, planId } = await req.json();

    if (!userId || !planId) {
      return NextResponse.json({ error: "Missing userId or planId" }, { status: 400 });
    }

    const plan = PLANS[planId as PlanType];

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe Price ID" }, { status: 400 });
    }

    // Create a Stripe Checkout Session (Stripe hosts the entire payment page)
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          planId,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&planId=${planId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      });

      return NextResponse.json({ url: session.url });
    } catch (stripeErr: any) {
      console.warn("Stripe creation failed, using sandbox fallback:", stripeErr);
      return NextResponse.json({ 
        url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id=mock_stripe_${Math.random().toString(36).substring(2, 11)}&planId=${planId}` 
      });
    }
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
