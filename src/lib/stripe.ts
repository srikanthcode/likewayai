import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set in environment variables.");
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeInstance;
}

// Proxy that forwards all property access to the lazy-initialized Stripe instance
export default new Proxy({} as any, {
  get(_target, prop, receiver) {
    const stripe = getStripe();
    if (!stripe) return undefined;
    const value = (stripe as any)[prop];
    if (typeof value === "function") {
      return value.bind(stripe);
    }
    return value;
  },
});
