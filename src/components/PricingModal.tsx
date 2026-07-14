"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Zap, Crown, Star } from "lucide-react";
import { PLANS, PlanType } from "@/lib/plans";

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

const PLAN_COLORS: Record<PlanType, string> = {
  Core: "#6B7280",
  Go: "#3B82F6",
  Plus: "#6366F1",
  Pro: "#F59E0B",
};

const PLAN_BADGES: Record<PlanType, string | null> = {
  Core: null,
  Go: "LIMITED OFFER",
  Plus: "MOST POPULAR",
  Pro: "BEST VALUE",
};

export default function PricingModal({ open, onClose, onSelectPlan, currentPlan }: PricingModalProps) {
  const plans = Object.values(PLANS);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1d27] border border-white/10 rounded-3xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center pt-8 pb-6 px-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
              <p className="text-gray-400 text-sm">Unlock the full power of LikeWay AI</p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-8">
              {plans.map((plan) => {
                const Icon = PLAN_ICONS[plan.id];
                const color = PLAN_COLORS[plan.id];
                const badge = PLAN_BADGES[plan.id];
                const isCurrent = currentPlan === plan.id;
                const isFree = plan.id === "Core";
                const isPlus = plan.id === "Plus";

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-5 rounded-2xl border transition-all ${
                      isCurrent
                        ? "border-cyan-500/50 bg-cyan-500/5"
                        : isPlus
                        ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Badge */}
                    {badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold text-white whitespace-nowrap" style={{ backgroundColor: color }}>
                        {badge}
                      </div>
                    )}

                    {/* Icon + Name */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{plan.name}</h3>
                        {isFree && <span className="text-[10px] text-gray-500">Free</span>}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-2xl font-black text-white">{plan.price}</span>
                      {!isFree && <span className="text-xs text-gray-500 ml-1">INR / month</span>}
                      {!isFree && <div className="text-[10px] text-gray-600 mt-0.5">Inclusive of GST</div>}
                    </div>

                    {/* Model Count */}
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {plan.modelCount} models unlocked • {plan.limits.messagesDay >= 99999 ? "Unlimited" : `${plan.limits.messagesDay}`} messages/day
                    </div>

                    {/* Features */}
                    <ul className="flex-1 space-y-2 mb-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                          <Check size={12} className="mt-0.5 shrink-0" style={{ color }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-white/5 text-gray-500 cursor-default"
                          : "text-white hover:opacity-90 active:scale-95"
                      }`}
                      style={!isCurrent ? { backgroundColor: color } : undefined}
                    >
                      {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
