export type PlanType = "Core" | "Go" | "Plus" | "Pro";

export interface Plan {
  id: PlanType;
  name: string;
  price: string;
  razorpayPlanId?: string;
  stripePriceId?: string;
  limits: {
    messagesDay: number;
    modelsAllowed: string[];
    tools: boolean;
    deepResearch: boolean;
    imageGen: boolean;
  };
  features: string[];
}

export const PLANS: Record<PlanType, Plan> = {
  Core: {
    id: "Core",
    name: "Core",
    price: "Free",
    limits: {
      messagesDay: 20,
      modelsAllowed: ["llama-3.1-8b-instant", "meta-llama/llama-3.2-3b-instruct:free"],
      tools: false,
      deepResearch: false,
      imageGen: false,
    },
    features: ["20 messages/day", "Access to standard models", "Basic conversation features"],
  },
  Go: {
    id: "Go",
    name: "Go",
    price: "₹299",
    razorpayPlanId: process.env.RAZORPAY_PLAN_GO || "",
    stripePriceId: process.env.STRIPE_PRICE_GO || "",
    limits: {
      messagesDay: 100,
      modelsAllowed: ["llama-3.1-8b-instant", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct"],
      tools: true,
      deepResearch: false,
      imageGen: false,
    },
    features: ["100 messages/day", "Access to advanced models", "Tool execution support"],
  },
  Plus: {
    id: "Plus",
    name: "Plus",
    price: "₹799",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PLUS || "",
    stripePriceId: process.env.STRIPE_PRICE_PLUS || "",
    limits: {
      messagesDay: 500,
      modelsAllowed: [
        "llama-3.1-8b-instant",
        "google/gemini-2.5-flash",
        "meta-llama/llama-3.3-70b-instruct",
        "anthropic/claude-3.5-sonnet",
        "openai/gpt-4o",
      ],
      tools: true,
      deepResearch: true,
      imageGen: false,
    },
    features: ["500 messages/day", "Access to elite models (Claude 3.5, GPT-4o)", "Tool execution support", "Deep Research capability"],
  },
  Pro: {
    id: "Pro",
    name: "Pro",
    price: "₹1,999",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PRO || "",
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    limits: {
      messagesDay: 99999,
      modelsAllowed: ["*"],
      tools: true,
      deepResearch: true,
      imageGen: true,
    },
    features: ["Unlimited messages", "Access to all models", "Tool execution support", "Deep Research capability", "Image generation support"],
  },
};

export function getCurrentPlan(): PlanType {
  if (typeof window !== "undefined") {
    return (localStorage.getItem("likeway_plan") as PlanType) || "Core";
  }
  return "Core";
}

export function setCurrentPlan(plan: PlanType): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("likeway_plan", plan);
  }
}

export function isFeatureUnlocked(plan: PlanType, feature: keyof Plan["limits"]): boolean {
  const planConfig = PLANS[plan];
  if (!planConfig) return false;
  return !!planConfig.limits[feature];
}

