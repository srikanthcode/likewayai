import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set in environment variables.");
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }

  return stripeInstance;
}

// For backward compatibility, export a default that creates on first access
export default new Proxy({} as any, {
  get() {
    return getStripe();
  }
});
