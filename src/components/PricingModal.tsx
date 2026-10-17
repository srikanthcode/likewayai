"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Zap, Crown, Star, Lock, ShieldCheck } from "lucide-react";
import {
  PLANS,
  PlanType,
  PLAN_THEME,
  PLAN_BADGES,
  PLAN_TAGLINES,
  getPlanModels,
  isAllModelsPlan,
} from "@/lib/plans";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (planId: PlanType) => void;
  currentPlan: PlanType;
}

const PLAN_ICONS: Record<PlanType, typeof Check> = {
  Core: Star,
  Go: Zap,
  Plus: Sparkles,
  Pro: Crown,
};

export default function PricingModal({ open, onClose, onSelectPlan, currentPlan }: PricingModalProps) {
  const plans = Object.values(PLANS);

  // Lock body scroll + close on Escape while the modal is open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose your plan"
            className="relative flex w-full max-w-[1200px] max-h-[94dvh] sm:max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-white/10 bg-[#0c101b] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 24 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            {/* Ambient glow + top accent */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div
              className="pointer-events-none absolute -top-48 left-1/2 h-72 w-[680px] -translate-x-1/2"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(139,92,246,0.16), rgba(139,92,246,0.04) 60%, transparent)",
              }}
            />

            {/* ── Header (always visible) ── */}
            <div className="relative shrink-0 border-b border-white/[0.06] px-6 pb-5 pt-7 text-center sm:px-10 sm:pb-6 sm:pt-8">
              <button
                onClick={onClose}
                aria-label="Close pricing"
                className="absolute right-4 top-4 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white sm:right-6 sm:top-6"
              >
                <X size={20} />
              </button>

              <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles size={11} />
                Likeway Plans
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white sm:text-[28px]">
                Choose Your Plan
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-gray-400">
                Unlock the full power of Likeway AI. Upgrade, switch or cancel anytime — no hidden charges.
              </p>
            </div>

            {/* ── Scrollable body ── */}
            <div className="pricing-modal-scroll relative flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-10 sm:py-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
                {plans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id];
                  const theme = PLAN_THEME[plan.id];
                  const badge = PLAN_BADGES[plan.id];
                  const tagline = PLAN_TAGLINES[plan.id];
                  const isCurrent = currentPlan === plan.id;
                  const isFree = plan.id === "Core";
                  const isHighlighted = plan.id === "Plus";
                  const gradient = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;
                  const modelCount = getPlanModels(plan.id);
                  const modelLabel = isAllModelsPlan(plan.id)
                    ? `All ${modelCount} models`
                    : `${modelCount} models`;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-2xl border p-5 transition-colors duration-200 ${
                        isCurrent
                          ? "border-cyan-400/40 bg-cyan-400/[0.04]"
                          : isHighlighted
                            ? "border-violet-400/40 bg-[#12142a] shadow-[0_0_70px_-25px_rgba(139,92,246,0.65)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      {/* Badge row — reserved height keeps every card aligned */}
                      <div className="mb-4 flex h-6 items-center justify-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-300">
                            <Check size={11} strokeWidth={3} />
                            Your Plan
                          </span>
                        ) : badge ? (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
                            style={{
                              background: gradient,
                              boxShadow: `0 6px 20px -8px ${theme.color}`,
                            }}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </div>

                      {/* Plan identity */}
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: theme.soft }}
                        >
                          <Icon size={18} style={{ color: theme.color }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold leading-tight text-white">
                            {plan.name}
                          </h3>
                          <p className="mt-0.5 truncate text-[11px] text-gray-500">{tagline}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black tracking-tight text-white">
                            {plan.price}
                          </span>
                          {!isFree && (
                            <span className="text-xs font-medium text-gray-500">/ month</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {isFree
                            ? "Free forever · No card required"
                            : "Inclusive of GST · Cancel anytime"}
                        </p>
                      </div>

                      {/* Includes */}
                      <div className="mb-3 flex items-center justify-between border-t border-white/[0.07] pt-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                          Includes
                        </span>
                        <span
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold"
                          style={{ color: theme.color }}
                        >
                          {modelLabel}
                        </span>
                      </div>

                      {/* Features */}
                      <ul className="mb-5 flex-1 space-y-2.5">
                        {plan.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-[12.5px] leading-snug text-gray-300"
                          >
                            <span
                              className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                              style={{ background: theme.soft }}
                            >
                              <Check size={10} strokeWidth={3.5} style={{ color: theme.color }} />
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <button
                        onClick={() => onSelectPlan(plan.id)}
                        disabled={isCurrent}
                        className={`w-full rounded-xl px-4 py-3 text-[13px] font-bold transition-all duration-200 ${
                          isCurrent
                            ? "cursor-default bg-white/[0.06] text-gray-500"
                            : "text-white hover:brightness-110 active:scale-[0.98]"
                        }`}
                        style={
                          isCurrent
                            ? undefined
                            : {
                                background: gradient,
                                boxShadow: `0 10px 30px -12px ${theme.color}`,
                              }
                        }
                      >
                        {isCurrent
                          ? "Current Plan"
                          : isFree
                            ? "Get started free"
                            : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Trust notes */}
              <div className="mt-7 flex flex-col items-center justify-center gap-2 text-[11px] text-gray-500 sm:flex-row sm:gap-7">
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={12} />
                  Payments secured by Razorpay
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={12} />
                  GST-inclusive pricing
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={12} />
                  Switch or cancel anytime
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
