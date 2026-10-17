"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Code,
  PenLine,
  Zap,
  Search,
  Globe,
  Image as ImageIcon,
  Eye,
  Mic,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Star,
  Crown,
  Lock,
  ShieldCheck,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PLANS,
  PlanType,
  PLAN_THEME,
  PLAN_BADGES,
  PLAN_TAGLINES,
  getPlanModels,
  isAllModelsPlan,
} from "@/lib/plans";

type ThemeMode = "dark" | "light";

const PLAN_ICONS: Record<PlanType, typeof Check> = {
  Core: Star,
  Go: Zap,
  Plus: Sparkles,
  Pro: Crown,
};

const examples = [
  { icon: MessageSquare, label: "Explain React hooks" },
  { icon: PenLine, label: "Write a professional email" },
  { icon: Code, label: "Generate Python code" },
  { icon: Zap, label: "Debug my CSS layout" },
];

const TOTAL_MODELS = getPlanModels("Pro");

const stats = [
  { value: `${TOTAL_MODELS}`, label: "Frontier AI models" },
  { value: "90+", label: "Slash commands" },
  { value: "50+", label: "Coding languages" },
  { value: "24/7", label: "Always available" },
];

const features = [
  {
    icon: Search,
    title: "Deep Research",
    description:
      "Autonomous multi-step web analysis that browses, fact-checks and synthesizes cited reports — while you watch every step.",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    icon: Code,
    title: "Architect Coding Agent",
    description:
      "Build, refactor and debug production-grade code across 50+ languages with a senior-engineer mindset.",
    accent: "from-violet-400 to-purple-500",
  },
  {
    icon: ImageIcon,
    title: "AI Image Generation",
    description:
      "Create and edit stunning visuals straight from a prompt — logos, illustrations, product shots and more.",
    accent: "from-pink-400 to-rose-500",
  },
  {
    icon: Globe,
    title: "Browser & Computer Control",
    description:
      "Agents browse pages, fill forms and complete real tasks on your machine — with you in control at every step.",
    accent: "from-emerald-400 to-teal-500",
  },
  {
    icon: Eye,
    title: "Vision & Documents",
    description:
      "Upload screenshots, diagrams, PDFs or audio — Likeway reads, understands and answers in seconds.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    icon: Mic,
    title: "Voice Assistant",
    description:
      "Talk naturally with hands-free speech input and lifelike spoken replies in your language.",
    accent: "from-sky-400 to-indigo-500",
  },
];

const faqs = [
  {
    q: "What is Likeway AI?",
    a: `Likeway AI is an all-in-one AI assistant for chat, coding, deep research, image generation and autonomous browser control — powered by ${TOTAL_MODELS} advanced AI models inside one beautiful workspace.`,
  },
  {
    q: "Is Likeway really free?",
    a: "Yes. The Core plan is free forever with no credit card required. You get 200 responses a day, free models, web search, voice input and a 2-day browser automation trial. Upgrade anytime for more power.",
  },
  {
    q: "Which AI models does Likeway use?",
    a: "Likeway routes every request to the best model for the job — from fast everyday models to elite reasoning and coding engines, plus dedicated vision, image and voice models.",
  },
  {
    q: "Can I automate browsers and desktop apps?",
    a: "Yes. Go includes 50 browser automation requests per day, while Plus and Pro unlock unlimited browser automation and autonomous computer control.",
  },
  {
    q: "How do payments work?",
    a: "Paid plans are billed monthly in INR through Razorpay with GST included. There are no hidden charges, and you can switch or cancel your plan at any time.",
  },
  {
    q: "Do you offer anything for teams?",
    a: "Pro is built for power users and teams — every model unlocked, unlimited image generation, deep research with extended context, and priority support.",
  },
];

const headingFont = { fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" };

export default function LandingHero() {
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const saved = localStorage.getItem("likeway_theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const next: ThemeMode = isDark ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("likeway_theme", next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.setAttribute("data-theme", next);
  };

  const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      window.location.href = `/login?q=${encodeURIComponent(input.trim())}`;
    }
  };

  const planHref = (planId: PlanType) =>
    planId === "Core" ? "/login?signup=1" : `/pricing?plan=${planId}`;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden",
        isDark ? "bg-[#070a12] text-gray-100" : "bg-white text-gray-900"
      )}
    >
      {/* ── Navigation ── */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b transition-colors",
          isDark
            ? "bg-[#070a12]/80 border-white/[0.06] backdrop-blur-xl"
            : "bg-white/80 border-gray-200 backdrop-blur-xl"
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/landing" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 shadow-lg shadow-cyan-500/20 transition-shadow group-hover:shadow-cyan-500/40">
              <Sparkles size={17} className="text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight" style={headingFont}>
              Likeway
            </span>
          </Link>

          <div className={cn("hidden items-center gap-1 md:flex")}>
            {[
              { label: "Features", id: "features" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={scrollTo(link.id)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  isDark
                    ? "text-gray-400 hover:bg-white/5 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                isDark
                  ? "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900"
              )}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              href="/login"
              className={cn(
                "hidden rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97] sm:inline-flex",
                isDark
                  ? "border-white/10 text-gray-300 hover:border-white/25 hover:text-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"
              )}
            >
              Log In
            </Link>

            <Link
              href="/login?signup=1"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all duration-200 hover:from-cyan-400 hover:to-violet-500 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-[0.97]"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pt-40 lg:px-8">
          {/* Background decoration */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]",
              !isDark &&
                "bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)]"
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-44 left-1/2 h-[560px] w-[980px] -translate-x-1/2"
            style={{
              background: isDark
                ? "radial-gradient(closest-side, rgba(6,182,212,0.22), rgba(59,130,246,0.08) 55%, transparent)"
                : "radial-gradient(closest-side, rgba(6,182,212,0.16), rgba(59,130,246,0.06) 55%, transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 right-[4%] h-[420px] w-[560px]"
            style={{
              background: isDark
                ? "radial-gradient(closest-side, rgba(139,92,246,0.2), rgba(139,92,246,0.06) 60%, transparent)"
                : "radial-gradient(closest-side, rgba(139,92,246,0.14), rgba(139,92,246,0.05) 60%, transparent)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-3xl text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
              className={cn(
                "mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                isDark
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                  : "border-cyan-500/25 bg-cyan-50 text-cyan-700"
              )}
            >
              <Zap size={13} />
              Now with Autonomous Browser & Computer Control
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              className="text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
              style={headingFont}
            >
              Your all-in-one{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                AI workspace
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className={cn(
                "mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
                isDark ? "text-gray-400" : "text-gray-600"
              )}
            >
              Chat, code, deep research, image generation and autonomous automation —
              powered by {TOTAL_MODELS} frontier AI models, in one beautiful interface.
            </motion.p>

            {/* Ask box */}
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.45 }}
              onSubmit={handleSubmit}
              className={cn(
                "mx-auto mt-9 flex max-w-2xl items-center rounded-2xl border p-1.5 shadow-xl transition-all duration-200 focus-within:ring-2",
                isDark
                  ? "border-white/10 bg-white/[0.04] shadow-black/40 backdrop-blur focus-within:border-cyan-400/40 focus-within:ring-cyan-400/20"
                  : "border-gray-200 bg-white shadow-gray-200/60 focus-within:border-cyan-400/60 focus-within:ring-cyan-400/20"
              )}
            >
              <Sparkles
                size={18}
                className={cn("ml-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-500")}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything — build, research, create…"
                aria-label="Ask anything"
                className={cn(
                  "min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base outline-none placeholder:select-none",
                  isDark
                    ? "text-gray-100 placeholder:text-gray-500"
                    : "text-gray-900 placeholder:text-gray-400"
                )}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.92]",
                  input.trim()
                    ? "cursor-pointer bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/40"
                    : isDark
                      ? "cursor-not-allowed bg-white/[0.06] text-gray-600"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                )}
              >
                <ArrowUp size={18} />
              </button>
            </motion.form>

            {/* Example prompts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-5 flex flex-wrap justify-center gap-2"
            >
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setInput(ex.label)}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]",
                    isDark
                      ? "border-white/10 text-gray-400 hover:border-white/25 hover:bg-white/[0.04] hover:text-gray-100"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <ex.icon
                    size={14}
                    className={cn(
                      "transition-colors duration-200",
                      isDark
                        ? "text-gray-500 group-hover:text-cyan-400"
                        : "text-gray-400 group-hover:text-cyan-500"
                    )}
                  />
                  {ex.label}
                </button>
              ))}
            </motion.div>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className={cn(
                "mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]",
                isDark ? "text-gray-500" : "text-gray-500"
              )}
            >
              {["Free forever plan", "No credit card required", "Cancel anytime"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check
                    size={14}
                    strokeWidth={3}
                    className={isDark ? "text-cyan-400" : "text-cyan-500"}
                  />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ── Stats strip ── */}
        <section
          className={cn(
            "border-y px-4 sm:px-6 lg:px-8",
            isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/70"
          )}
        >
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-7",
                  isDark ? "divide-white/[0.06]" : "divide-gray-100"
                )}
              >
                <span
                  className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-3xl font-black tracking-tight text-transparent"
                  style={headingFont}
                >
                  {stat.value}
                </span>
                <span className={cn("text-xs font-medium", isDark ? "text-gray-500" : "text-gray-500")}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-[0.2em]",
                  isDark ? "text-cyan-400" : "text-cyan-600"
                )}
              >
                Capabilities
              </span>
              <h2
                className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
                style={headingFont}
              >
                Everything you need in one assistant
              </h2>
              <p className={cn("mt-4 text-base leading-relaxed", isDark ? "text-gray-400" : "text-gray-600")}>
                Six superpowers, one workspace. Stop juggling tabs — let Likeway handle the whole job.
              </p>
            </motion.div>

            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className={cn(
                    "group relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1",
                    isDark
                      ? "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_20px_60px_-25px_rgba(6,182,212,0.35)]"
                      : "border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-lg"
                  )}
                >
                  <div
                    className={cn(
                      "mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                      feature.accent
                    )}
                  >
                    <feature.icon size={20} />
                  </div>
                  <h3 className="text-base font-bold tracking-tight" style={headingFont}>
                    {feature.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-relaxed",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          id="pricing"
          className={cn(
            "scroll-mt-24 border-y px-4 py-20 sm:px-6 sm:py-24 lg:px-8",
            isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/70"
          )}
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-[0.2em]",
                  isDark ? "text-cyan-400" : "text-cyan-600"
                )}
              >
                Pricing
              </span>
              <h2
                className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
                style={headingFont}
              >
                Simple plans that scale with you
              </h2>
              <p className={cn("mt-4 text-base leading-relaxed", isDark ? "text-gray-400" : "text-gray-600")}>
                Start free — upgrade when you need more power. GST included, cancel anytime.
              </p>
            </motion.div>

            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Object.values(PLANS).map((plan, i) => {
                const Icon = PLAN_ICONS[plan.id];
                const planTheme = PLAN_THEME[plan.id];
                const badge = PLAN_BADGES[plan.id];
                const tagline = PLAN_TAGLINES[plan.id];
                const isFree = plan.id === "Core";
                const isHighlighted = plan.id === "Plus";
                const gradient = `linear-gradient(135deg, ${planTheme.gradient[0]}, ${planTheme.gradient[1]})`;
                const modelCount = getPlanModels(plan.id);
                const modelLabel = isAllModelsPlan(plan.id)
                  ? `All ${modelCount} models`
                  : `${modelCount} models`;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: i * 0.06 }}
                    className={cn(
                      "relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
                      isHighlighted
                        ? isDark
                          ? "border-violet-400/40 bg-[#12142a] shadow-[0_0_80px_-30px_rgba(139,92,246,0.7)]"
                          : "border-violet-300 bg-white shadow-[0_20px_70px_-30px_rgba(139,92,246,0.5)]"
                        : isDark
                          ? "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                          : "border-gray-200 bg-white shadow-sm hover:border-gray-300"
                    )}
                  >
                    {/* Badge row — reserved height keeps cards aligned */}
                    <div className="mb-4 flex h-6 items-center justify-center">
                      {badge ? (
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
                          style={{
                            background: gradient,
                            boxShadow: `0 6px 20px -8px ${planTheme.color}`,
                          }}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: planTheme.soft }}
                      >
                        <Icon size={18} style={{ color: planTheme.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold leading-tight" style={headingFont}>
                          {plan.name}
                        </h3>
                        <p className={cn("mt-0.5 truncate text-[11px]", isDark ? "text-gray-500" : "text-gray-500")}>
                          {tagline}
                        </p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tight" style={headingFont}>
                          {plan.price}
                        </span>
                        {!isFree && (
                          <span className={cn("text-xs font-medium", isDark ? "text-gray-500" : "text-gray-500")}>
                            / month
                          </span>
                        )}
                      </div>
                      <p className={cn("mt-1 text-[11px]", isDark ? "text-gray-500" : "text-gray-500")}>
                        {isFree ? "Free forever · No card required" : "Inclusive of GST · Cancel anytime"}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "mb-3 flex items-center justify-between border-t pt-4",
                        isDark ? "border-white/[0.07]" : "border-gray-100"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.16em]",
                          isDark ? "text-gray-500" : "text-gray-500"
                        )}
                      >
                        Includes
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                          isDark ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-gray-50"
                        )}
                        style={{ color: planTheme.color }}
                      >
                        {modelLabel}
                      </span>
                    </div>

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map((feature, fi) => (
                        <li
                          key={fi}
                          className={cn(
                            "flex items-start gap-2.5 text-[12.5px] leading-snug",
                            isDark ? "text-gray-300" : "text-gray-600"
                          )}
                        >
                          <span
                            className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                            style={{ background: planTheme.soft }}
                          >
                            <Check size={10} strokeWidth={3.5} style={{ color: planTheme.color }} />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={planHref(plan.id)}
                      className="w-full rounded-xl px-4 py-3 text-center text-[13px] font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                      style={{
                        background: gradient,
                        boxShadow: `0 10px 30px -12px ${planTheme.color}`,
                      }}
                    >
                      {isFree ? "Start free" : `Upgrade to ${plan.name}`}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div
              className={cn(
                "mt-9 flex flex-col items-center justify-center gap-2 text-[12px] sm:flex-row sm:gap-7",
                isDark ? "text-gray-500" : "text-gray-500"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock size={12} />
                Payments secured by Razorpay
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} />
                GST-inclusive pricing
              </span>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 font-semibold text-cyan-500 hover:text-cyan-400">
                Compare all features
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-[0.2em]",
                  isDark ? "text-cyan-400" : "text-cyan-600"
                )}
              >
                FAQ
              </span>
              <h2
                className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
                style={headingFont}
              >
                Frequently asked questions
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn(
                "mt-10 divide-y rounded-2xl border",
                isDark
                  ? "divide-white/[0.07] border-white/[0.08] bg-white/[0.02]"
                  : "divide-gray-100 border-gray-200 bg-white shadow-sm"
              )}
            >
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={faq.q}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
                    >
                      <span className="text-sm font-semibold sm:text-[15px]" style={headingFont}>
                        {faq.q}
                      </span>
                      <ChevronDown
                        size={18}
                        className={cn(
                          "shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180",
                          isDark ? "text-gray-500" : "text-gray-400"
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <p
                            className={cn(
                              "px-5 pb-5 text-sm leading-relaxed sm:px-7",
                              isDark ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-5xl"
          >
            <div className="rounded-3xl bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-violet-500/50 p-px">
              <div
                className={cn(
                  "relative overflow-hidden rounded-[calc(1.5rem-1px)] px-6 py-14 text-center sm:px-12",
                  isDark ? "bg-[#0b1020]" : "bg-white"
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(6,182,212,0.22), rgba(139,92,246,0.06) 60%, transparent)",
                  }}
                />
                <Brain
                  size={36}
                  className={cn("mx-auto mb-5", isDark ? "text-cyan-400" : "text-cyan-500")}
                />
                <h2
                  className="text-3xl font-black tracking-tight sm:text-4xl"
                  style={headingFont}
                >
                  Ready to build with Likeway?
                </h2>
                <p
                  className={cn(
                    "mx-auto mt-4 max-w-xl text-base leading-relaxed",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Join thousands of makers, students and professionals getting more done with an
                  AI that chats, codes, researches and automates.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/login?signup=1"
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:from-cyan-400 hover:to-violet-500 hover:shadow-xl hover:shadow-cyan-500/35 active:scale-[0.97]"
                  >
                    Start free — no card required
                  </Link>
                  <a
                    href="#pricing"
                    onClick={scrollTo("pricing")}
                    className={cn(
                      "rounded-xl border px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
                      isDark
                        ? "border-white/15 text-gray-200 hover:border-white/30 hover:text-white"
                        : "border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
                    )}
                  >
                    View pricing
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className={cn("border-t px-4 sm:px-6 lg:px-8", isDark ? "border-white/[0.06]" : "border-gray-200")}>
        <div className="mx-auto max-w-7xl py-14">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600">
                  <Sparkles size={15} className="text-white" />
                </span>
                <span className="text-base font-extrabold tracking-tight" style={headingFont}>
                  Likeway
                </span>
              </div>
              <p className={cn("mt-4 max-w-xs text-[13px] leading-relaxed", isDark ? "text-gray-500" : "text-gray-500")}>
                Your all-in-one AI workspace for chat, coding, deep research, image generation
                and automation.
              </p>
            </div>

            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider" style={headingFont}>
                Product
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Full pricing page", href: "/pricing" },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={link.href.startsWith("#") ? scrollTo(link.href.slice(1)) : undefined}
                      className={cn(
                        "text-[13px] transition-colors",
                        isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider" style={headingFont}>
                Legal
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Terms of Service", href: "/legal/terms" },
                  { label: "Privacy Policy", href: "/legal/privacy" },
                  { label: "Refund Policy", href: "/legal/refund" },
                  { label: "Cookie Policy", href: "/legal/cookies" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-[13px] transition-colors",
                        isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider" style={headingFont}>
                Account
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/login"
                    className={cn(
                      "text-[13px] transition-colors",
                      isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Log In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login?signup=1"
                    className={cn(
                      "text-[13px] transition-colors",
                      isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Create account
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@aixphonic.com"
                    className={cn(
                      "text-[13px] transition-colors",
                      isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    support@aixphonic.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div
            className={cn(
              "mt-12 flex flex-col items-center justify-between gap-4 border-t pt-7 sm:flex-row",
              isDark ? "border-white/[0.06]" : "border-gray-100"
            )}
          >
            <p className={cn("text-xs", isDark ? "text-gray-600" : "text-gray-400")}>
              © {new Date().getFullYear()} Likeway AI · Aixphonic Pvt Ltd. All rights reserved.
            </p>
            <p className={cn("text-center text-xs", isDark ? "text-gray-600" : "text-gray-400")}>
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
