"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCurrentPlan } from "@/lib/plans";
import { motion } from "framer-motion";

import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";

export default function SuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [upgradedPlan, setUpgradedPlan] = useState("Plus");

  useEffect(() => {
    // Read planId dynamically from search query safely on client side
    const params = new URLSearchParams(window.location.search);
    const planId = (params.get("planId") || "Plus") as any;
    setUpgradedPlan(planId);
    
    // Update local state plan
    setCurrentPlan(planId);

    // Refresh user session state dynamically
    refreshUser().catch(err => console.error("Failed to refresh user subscription:", err));

    const timer = setTimeout(() => {
      router.push("/");
    }, 4500);

    return () => clearTimeout(timer);
  }, [router, refreshUser]);


  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
      <div className="text-center space-y-6 px-6">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
        >
          <svg
            className="w-14 h-14 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </svg>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-4xl font-black tracking-tight">Payment Successful!</h1>
          <p className="text-gray-400 text-lg">
            Your <span className="font-extrabold text-cyan-400">{upgradedPlan}</span> plan is now active. Welcome to Likeway AI ✨
          </p>
        </motion.div>

        {/* Redirect hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-gray-600 text-sm"
        >
          Redirecting you to the app in a moment...
        </motion.p>

        {/* Manual redirect button */}
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
