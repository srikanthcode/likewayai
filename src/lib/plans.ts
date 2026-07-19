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
    browserAutomation: number; // -1 = unlimited, 0 = none, >0 = daily limit
    browserAutomationDays: number; // Free trial days for new users (0 = no trial)
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
      browserAutomation: 0,
      browserAutomationDays: 2,
    },
    features: [
      "200 responses/day",
      "2 powerful models unlocked",
      "Smart conversation assistant",
      "Web search capabilities",
      "Voice input support",
      "Code snippet formatting",
      "2-day free browser automation trial",
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
      browserAutomation: 50,
      browserAutomationDays: 0,
    },
    features: [
      "Unlimited messages",
      "5 advanced models unlocked",
      "Tool execution & web browsing",
      "Code generation & debugging",
      "File upload & analysis",
      "Priority response speed",
      "50 browser automation requests/day",
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
        "deepseek/deepseek-chat",
        "deepseek/deepseek-r1",
        "openai/gpt-4o",
      ],
      tools: true,
      deepResearch: true,
      imageGen: true,
      browserAutomation: -1,
      browserAutomationDays: 0,
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
      "Unlimited browser automation",
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
      browserAutomation: -1,
      browserAutomationDays: 0,
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
      "Unlimited browser automation",
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

// ── Browser Automation Tracking ──────────────────────────────────────

export function getBrowserAutomationUsage(): { count: number; date: string; trialStart: string | null } {
  if (typeof window === "undefined") return { count: 0, date: "", trialStart: null };
  try {
    const data = JSON.parse(localStorage.getItem("likeway_browser_usage") || "{}");
    const today = new Date().toDateString();
    if (data.date !== today) {
      return { count: 0, date: today, trialStart: data.trialStart || null };
    }
    return data;
  } catch {
    return { count: 0, date: new Date().toDateString(), trialStart: null };
  }
}

export function trackBrowserAutomationUse(): void {
  if (typeof window === "undefined") return;
  const data = getBrowserAutomationUsage();
  const today = new Date().toDateString();
  localStorage.setItem("likeway_browser_usage", JSON.stringify({
    count: data.date === today ? data.count + 1 : 1,
    date: today,
    trialStart: data.trialStart,
  }));
}

export function startBrowserTrial(): void {
  if (typeof window === "undefined") return;
  const data = getBrowserAutomationUsage();
  if (!data.trialStart) {
    localStorage.setItem("likeway_browser_usage", JSON.stringify({
      ...data,
      trialStart: new Date().toISOString(),
    }));
  }
}

export function isBrowserTrialActive(): boolean {
  const data = getBrowserAutomationUsage();
  if (!data.trialStart) return false;
  const trialStart = new Date(data.trialStart);
  const now = new Date();
  const diffDays = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < 2;
}

export function getBrowserAutomationRemaining(): { allowed: boolean; remaining: number; reason: string; trialDaysLeft?: number } {
  const plan = getCurrentPlan();
  const planConfig = PLANS[plan];
  const usage = getBrowserAutomationUsage();
  const today = new Date().toDateString();
  const todayCount = usage.date === today ? usage.count : 0;

  // Check trial first (Core plan only)
  if (planConfig.limits.browserAutomationDays > 0) {
    if (isBrowserTrialActive()) {
      const trialStart = new Date(usage.trialStart!);
      const now = new Date();
      const trialDaysLeft = Math.ceil(2 - (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      return { allowed: true, remaining: 999, reason: "trial", trialDaysLeft };
    }
    // Trial expired — no browser automation on Core
    return { allowed: false, remaining: 0, reason: "trial_expired" };
  }

  // Unlimited (Plus, Pro)
  if (planConfig.limits.browserAutomation === -1) {
    return { allowed: true, remaining: 999, reason: "unlimited" };
  }

  // Limited (Go — 50/day)
  if (planConfig.limits.browserAutomation > 0) {
    const remaining = planConfig.limits.browserAutomation - todayCount;
    return { allowed: remaining > 0, remaining, reason: remaining > 0 ? "quota" : "quota_exceeded" };
  }

  // No access (Core after trial)
  return { allowed: false, remaining: 0, reason: "no_access" };
}
