export type PlanType = "Core" | "Go" | "Plus" | "Pro";

export interface Plan {
  id: PlanType;
  name: string;
  price: string;
  badge?: string;
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
  modelCount: number;
}

export const PLANS: Record<PlanType, Plan> = {
  Core: {
    id: "Core",
    name: "Core",
    price: "Free",
    limits: {
      messagesDay: 200,
      modelsAllowed: ["mistral-small-latest", "llama-3.1-8b-instant"],
      tools: false,
      deepResearch: false,
      imageGen: false,
    },
    features: [
      "200 responses/day",
      "2 powerful models unlocked",
      "Smart conversation assistant",
      "Web search capabilities",
      "Voice input support",
      "Code snippet formatting",
    ],
    modelCount: 2,
  },
  Go: {
    id: "Go",
    name: "Go",
    price: "₹299",
    razorpayPlanId: process.env.RAZORPAY_PLAN_GO || "",
    stripePriceId: process.env.STRIPE_PRICE_GO || "",
    limits: {
      messagesDay: 99999,
      modelsAllowed: [
        "mistral-small-latest",
        "llama-3.1-8b-instant",
        "mistral-medium-latest",
        "codestral-latest",
        "google/gemini-2.5-flash",
      ],
      tools: true,
      deepResearch: false,
      imageGen: false,
    },
    features: [
      "Unlimited messages",
      "5 advanced models unlocked",
      "Tool execution & web browsing",
      "Code generation & debugging",
      "File upload & analysis",
      "Priority response speed",
    ],
    modelCount: 5,
  },
  Plus: {
    id: "Plus",
    name: "Plus",
    price: "₹799",
    badge: "MOST POPULAR",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PLUS || "",
    stripePriceId: process.env.STRIPE_PRICE_PLUS || "",
    limits: {
      messagesDay: 99999,
      modelsAllowed: [
        "mistral-small-latest",
        "llama-3.1-8b-instant",
        "mistral-medium-latest",
        "codestral-latest",
        "google/gemini-2.5-flash",
        "llama-3.3-70b-versatile",
        "google/gemini-2.5-pro",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-sonnet-4",
        "openai/gpt-4o",
      ],
      tools: true,
      deepResearch: true,
      imageGen: true,
    },
    features: [
      "Unlimited messages",
      "10 elite Likeway models unlocked",
      "Architect Coding Agent for 50+ languages",
      "Deep Research with autonomous web analysis",
      "Advanced vision — analyze screenshots & diagrams",
      "AI-powered image generation",
      "Custom instructions & persistent memory",
      "Priority response queue",
    ],
    modelCount: 10,
  },
  Pro: {
    id: "Pro",
    name: "Pro",
    price: "₹1,999",
    badge: "BEST VALUE",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PRO || "",
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    limits: {
      messagesDay: 99999,
      modelsAllowed: ["*"],
      tools: true,
      deepResearch: true,
      imageGen: true,
    },
    features: [
      "Unlimited messages",
      "All models unlocked — ultimate power",
      "Early access to cutting-edge models",
      "Unlimited image generation",
      "Deep Research with extended context",
      "Architect Coding Agent — 50+ languages",
      "Voice Assistant with natural speech",
      "Priority support & feature requests",
    ],
    modelCount: 12,
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
