"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const HOW_DID_YOU_HEAR = [
  { id: "friend", label: "From a friend or colleague" },
  { id: "search", label: "Search engine" },
  { id: "social", label: "Social media" },
  { id: "youtube", label: "YouTube" },
  { id: "blog", label: "Blog or article" },
  { id: "other", label: "Other" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [name, setName] = useState("");
  const [referral, setReferral] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompleted: true,
          age: parseInt(age),
          name,
          referralSource: referral,
        } as any),
      });
      await refreshUser();
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0e16] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e16] text-white flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 px-6 pt-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-white" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="age"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-sm"
            >
              <h1 className="text-2xl font-semibold mb-2">How old are you?</h1>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                This helps us personalize your experience and provide the right settings, in line with our Privacy Policy.
              </p>

              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                min={1}
                max={150}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              />

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => age && setStep(1)}
                  disabled={!age}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-30"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-sm"
            >
              <h1 className="text-2xl font-semibold mb-2">What's your full name?</h1>
              <p className="text-gray-400 text-sm mb-8">So we know what to call you.</p>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              />

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Back</button>
                <button
                  onClick={() => name && setStep(2)}
                  disabled={!name}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-30"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="referral"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-sm"
            >
              <h1 className="text-2xl font-semibold mb-2">How did you hear about Likeway?</h1>
              <p className="text-gray-400 text-sm mb-8">Help us improve by sharing how you found us.</p>

              <div className="space-y-2">
                {HOW_DID_YOU_HEAR.map((item) => {
                  const selected = referral === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setReferral(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left text-sm ${
                        selected
                          ? "border-white/30 bg-white/5"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                      {selected && <Check size={16} className="text-white" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Back</button>
                <button
                  onClick={completeOnboarding}
                  disabled={saving || !referral}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-30"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Finish creating account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
