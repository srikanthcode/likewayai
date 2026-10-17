import { MODELS } from "./models";

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
    computerControl: number; // -1 = unlimited, >0 = daily limit
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
      modelsAllowed: [
        "gpt-6-astra",
        "deepseek-v4.1-flash:free",
        "mimo-v2.6-flash:free",
        "free-llama3-70b",
        "free-mistral-7b",
        "mistral-small-latest",
        "llama-3.1-8b-instant",
      ],
      tools: false,
      deepResearch: false,
      imageGen: false,
      browserAutomation: 0,
      browserAutomationDays: 2,
      computerControl: 3,
    },
    features: [
      "200 responses/day",
      "Free models unlocked (Likeway Omni, Flash, Mimo)",
      "Likeway Omni unlimited chat for 1 month",
      "Multimodal vision, video & audio support",
      "Smart conversation assistant",
      "Web search capabilities",
      "Voice input & Read Aloud replay",
      "Code snippet formatting & live HTML preview",
      "2-day free browser automation trial",
      "Autonomous Computer Control preview (3 actions)",
    ],
    modelCount: 7,
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
        "gpt-6-astra",
        "deepseek-v4.1-flash:free",
        "mimo-v2.6-flash:free",
        "claude-fable-5",
        "claude-fable-5.1",
        "claude-opus-5.5",
        "claude-sonnet-5",
        "glm-5.2",
        "kimi-k3",
        "sol",
        "terra",
        "free-llama3-70b",
        "free-mistral-7b",
        "mistral-small-latest",
        "llama-3.1-8b-instant",
        "mistral-medium-latest",
        "codestral-latest",
        "google/gemini-2.5-flash",
      ],
      tools: true,
      deepResearch: true,
      imageGen: true,
      browserAutomation: 50,
      browserAutomationDays: 0,
      computerControl: 25,
    },
    features: [
      "Unlimited messages",
      "All 9 Likeway frontier models unlocked",
      "Likeway Omni — 1 month unlimited free",
      "AI Image Generation & Editing unlocked",
      "Deep Thinking & Multi-Step Reasoning mode",
      "Live Web Search & Deep Research with citations",
      "Priority response speed & Code generation",
      "50 browser automation requests/day",
      "25 Computer Control & Desktop actions/day",
    ],
    modelCount: 18,
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
        "gpt-6-astra",
        "deepseek-v4.1-flash:free",
        "mimo-v2.6-flash:free",
        "claude-fable-5",
        "claude-fable-5.1",
        "claude-opus-5.5",
        "claude-sonnet-5",
        "glm-5.2",
        "kimi-k3",
        "sol",
        "terra",
        "free-llama3-70b",
        "free-mistral-7b",
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
      computerControl: -1,
    },
    features: [
      "Unlimited messages",
      "23 elite frontier AI models unlocked",
      "Architect Coding Agent for 50+ languages",
      "Deep Research with autonomous web analysis",
      "Advanced vision — analyze screenshots & diagrams",
      "AI-powered image generation & editing",
      "Custom instructions & persistent memory",
      "Priority response queue & Interactive Canvas",
      "Unlimited browser automation",
      "Unlimited Autonomous Computer Control & Local Agent",
    ],
    modelCount: 23,
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
      computerControl: -1,
    },
    features: [
      "Unlimited messages & zero daily caps",
      "All models unlocked — ultimate frontier power",
      "Early access to cutting-edge reasoning models",
      "Unlimited AI image generation & editing",
      "Deep Research with extended context",
      "Architect Coding Agent — 50+ languages",
      "Real-time Voice Assistant with natural speech",
      "Priority support & feature requests",
      "Unlimited browser automation",
      "Unlimited Autonomous 3D Game & App Building on Desktop",
    ],
    modelCount: 23,
  },
};

// Normalize plan names between DB (lowercase) and frontend (capitalized)
export function normalizePlan(plan: string | undefined | null): PlanType {
  if (!plan) return "Core";
  const lower = String(plan).trim().toLowerCase();
  if (lower === "go") return "Go";
  if (lower === "plus") return "Plus";
  if (lower === "pro") return "Pro";
  return "Core";
}

export function getCurrentPlan(): PlanType {
  if (typeof window !== "undefined") {
    try {
      const direct = localStorage.getItem("likeway_plan");
      if (direct) {
        const normDirect = normalizePlan(direct);
        if (direct !== normDirect) {
          localStorage.setItem("likeway_plan", normDirect);
        }
        if (normDirect !== "Core") return normDirect;
      }
      const cached = localStorage.getItem("lw_user_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.plan) {
          const norm = normalizePlan(parsed.plan);
          localStorage.setItem("likeway_plan", norm);
          return norm;
        }
      }
    } catch {}
    return "Core";
  }
  return "Core";
}

export function setCurrentPlan(plan: PlanType | string): void {
  if (typeof window !== "undefined") {
    const norm = normalizePlan(plan);
    localStorage.setItem("likeway_plan", norm);
    try {
      const cached = localStorage.getItem("lw_user_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          parsed.plan = norm;
          localStorage.setItem("lw_user_cache", JSON.stringify(parsed));
        }
      }
    } catch {}
    window.dispatchEvent(new Event("plan_updated"));
  }
}

export interface PlanTheme {
  color: string;
  gradient: [string, string];
  soft: string;
}

export const PLAN_THEME: Record<PlanType, PlanTheme> = {
  Core: {
    color: "#94a3b8",
    gradient: ["#64748b", "#94a3b8"],
    soft: "rgba(148, 163, 184, 0.14)",
  },
  Go: {
    color: "#06b6d4",
    gradient: ["#06b6d4", "#3b82f6"],
    soft: "rgba(6, 182, 212, 0.14)",
  },
  Plus: {
    color: "#8b5cf6",
    gradient: ["#8b5cf6", "#6366f1"],
    soft: "rgba(139, 92, 246, 0.14)",
  },
  Pro: {
    color: "#f59e0b",
    gradient: ["#f59e0b", "#f97316"],
    soft: "rgba(245, 158, 11, 0.14)",
  },
};

export const PLAN_BADGES: Record<PlanType, string | null> = {
  Core: null,
  Go: "LIMITED OFFER",
  Plus: "MOST POPULAR",
  Pro: "BEST VALUE",
};

export const PLAN_TAGLINES: Record<PlanType, string> = {
  Core: "For getting started",
  Go: "For everyday power users",
  Plus: "For professionals & builders",
  Pro: "Maximum power, no limits",
};

export function getPlanModels(planId: PlanType): number {
  const plan = PLANS[planId];
  if (!plan) return 0;
  if (plan.limits.modelsAllowed[0] === "*") return MODELS.length;
  return plan.limits.modelsAllowed.length;
}

export function isAllModelsPlan(planId: PlanType): boolean {
  return PLANS[planId]?.limits.modelsAllowed[0] === "*";
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

  if (planConfig.limits.browserAutomationDays > 0) {
    if (isBrowserTrialActive()) {
      const trialStart = new Date(usage.trialStart!);
      const now = new Date();
      const trialDaysLeft = Math.ceil(2 - (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      return { allowed: true, remaining: 999, reason: "trial", trialDaysLeft };
    }
    return { allowed: false, remaining: 0, reason: "trial_expired" };
  }

  if (planConfig.limits.browserAutomation === -1) {
    return { allowed: true, remaining: 999, reason: "unlimited" };
  }

  if (planConfig.limits.browserAutomation > 0) {
    const remaining = planConfig.limits.browserAutomation - todayCount;
    return { allowed: remaining > 0, remaining, reason: remaining > 0 ? "quota" : "quota_exceeded" };
  }

  return { allowed: false, remaining: 0, reason: "no_access" };
}
