import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PLANS, PlanType } from "@/lib/plans";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    // Get userId from session cookie, not client body
    const tokens = getTokenFromCookies(req);
    const payload = tokens.access ? verifyAccessToken(tokens.access) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = payload.sub;

    const plan = PLANS[planId as PlanType];

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe Price ID" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Card checkout (Stripe) is not available. Use the Razorpay upgrade flow." },
        { status: 503 }
      );
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
      // No fake-success fallback: a failed checkout must fail loudly.
      console.error("Stripe checkout session creation failed:", stripeErr);
      return NextResponse.json(
        { error: "Could not start card checkout. Please try again or use the Razorpay upgrade flow." },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
