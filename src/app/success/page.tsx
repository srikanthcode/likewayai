"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentPlan, normalizePlan, PlanType } from "@/lib/plans";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";

export default function SuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [upgradedPlan, setUpgradedPlan] = useState<PlanType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── Never trust ?planId= from the URL. The server is the source of truth:
    // we read the authenticated user's REAL plan from /api/auth/me, which reads
    // the verified `users.plan` value written by the payment confirmation.
    const verifyAgainstServer = async () => {
      let attempts = 0;
      const maxAttempts = 4;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (!res.ok) {
            router.replace("/login?next=/pricing");
            return;
          }
          const data = await res.json();
          const plan: PlanType = normalizePlan(data?.user?.plan);

          if (plan !== "Core") {
            setUpgradedPlan(plan);
            setCurrentPlan(plan);
            await refreshUser();
            setIsRefreshing(false);
            return;
          }

          // If still Core and attempts remain, wait 1.5s for webhook/DB processing
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch {
          if (attempts >= maxAttempts) {
            setError("We couldn't verify your subscription. Please check your account page.");
            setIsRefreshing(false);
            return;
          }
        }
      }

      setError("Your payment is being processed. It may take a moment to reflect on your account — check your account page shortly.");
      setIsRefreshing(false);
    };

    verifyAgainstServer();

    const timer = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(timer);
  }, [router, refreshUser]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
      <div className="text-center space-y-6 px-6">
        {/* Animated checkmark / warning */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center shadow-2xl ${
            error
              ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
              : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
          }`}
        >
          {error ? (
            <span className="text-5xl font-black text-white">!</span>
          ) : (
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </svg>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {error ? (
            <>
              <h1 className="text-3xl font-black tracking-tight">Verifying your plan…</h1>
              <p className="text-gray-400 text-base max-w-md mx-auto">{error}</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-black tracking-tight">Payment Successful!</h1>
              <p className="text-gray-400 text-lg">
                Your{" "}
                <span className="font-extrabold text-cyan-400">{upgradedPlan || "…"}</span>{" "}
                plan is now active. Welcome to Likeway AI ✨
              </p>
            </>
          )}
        </motion.div>

        {isRefreshing && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-gray-500 text-xs"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="inline-block w-3 h-3 border border-gray-600 border-t-gray-300 rounded-full"
            />
            Confirming with the server…
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => router.push("/")}
          className="px-10 py-3 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Start Using Likeway →
        </motion.button>
      </div>
    </div>
  );
}