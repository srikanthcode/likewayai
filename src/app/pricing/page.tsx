"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, ArrowLeft, Shield, Globe, Code, Search, CreditCard, Smartphone, Bot, Wand2, Mic, Brain, Eye, Star, Lock, Rocket, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS, setCurrentPlan, getCurrentPlan, PlanType } from "@/lib/plans";
import { MODELS } from "@/lib/models";
import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/components/AuthProvider";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getPlanModels(planId: PlanType): number {
  const plan = PLANS[planId];
  if (plan.limits.modelsAllowed[0] === "*") return MODELS.length;
  return plan.limits.modelsAllowed.length;
}

export default function PricingPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanType | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"method" | "processing" | "success">("method");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<PlanType | null>(null);

  // Auto-select plan from URL after auth is loaded
  useEffect(() => {
    if (isLoading) return; // wait for auth to finish loading
    setMounted(true);

    const urlPlan = new URLSearchParams(window.location.search).get("plan") as PlanType | null;
    if (urlPlan && PLANS[urlPlan] && urlPlan !== "Core") {
      handleSelectPlan(urlPlan);
    }

    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/user/plan", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setCurrentPlan(data.plan);
          }
        }
      } catch (e) {
        console.error("Failed to fetch current plan:", e);
      }
    };
    
    fetchPlan();

    const handleNativePurchase = (event: Event) => {
       const customEvent = event as CustomEvent;
       if (customEvent.detail && customEvent.detail.planId) {
          setCurrentPlan(customEvent.detail.planId);
          setIsCheckoutOpen(false);
          router.push("/");
       }
    };
    window.addEventListener("nativePurchaseSuccess", handleNativePurchase);
    return () => window.removeEventListener("nativePurchaseSuccess", handleNativePurchase);
  }, [isLoading]);

  const handleSelectPlan = async (planId: PlanType) => {
    if (!user) {
      router.push(`/login?next=/pricing`);
      return;
    }

    if (planId === "Core") {
       setCurrentPlan(planId);
       router.push("/");
       return;
     }

    setSelectedPlanId(planId);
    setIsCheckoutOpen(true);

    const userId = user.id;
    const plan = PLANS[planId];
    
    const priceInt = parseInt(plan.price.replace(/[₹,]/g, '')) || 0;
    const amountInPaise = priceInt * 100;

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay. Please check your internet connection and try again.");
        setIsCheckoutOpen(false);
        return;
      }

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          amount: amountInPaise, 
          currency: "INR",
          receipt: `lk_${planId}_${Date.now().toString(36)}`.slice(0, 40)
        }),
      });

      const orderData = await orderResponse.json();
      
      if (orderData.error) {
        alert("Order creation failed: " + orderData.error);
        setIsCheckoutOpen(false);
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: "INR",
        order_id: orderData.order_id,
        name: "Likeway AI",
        description: `${plan.name} Plan - ${plan.price}`,
        handler: async function (paymentResponse: any) {
          setCheckoutStep("processing");
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.error) throw new Error(verifyData.error);

            const confirmRes = await fetch("/api/subscription/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                userId,
                planId,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                // Pass order_id as subscription_id — confirm endpoint uses it as the subscription identifier
                razorpay_subscription_id: paymentResponse.razorpay_order_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            const confirmData = await confirmRes.json();
            if (confirmData.error) throw new Error(confirmData.error);

            setCurrentPlan(planId);
            await refreshUser();
            setCheckoutStep("success");
          } catch (err: any) {
            alert("Payment verification failed: " + err.message);
            setIsCheckoutOpen(false);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: "9000000000",
        },
        theme: {
          color: "#8b5cf6",
        },
        modal: {
          confirm_close: true,
          ondismiss: function () {
            setIsCheckoutOpen(false);
          },
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}`);
        setIsCheckoutOpen(false);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Razorpay Error:", error);
      alert("Payment system error: " + (error.message || "Please try again."));
      setIsCheckoutOpen(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Always remove and reload to avoid stale config
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) existing.remove();
      delete (window as any).Razorpay;

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js?v=" + Date.now();
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };


  const handleCompletePayment = async () => {};

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0e16] text-white p-4 md:p-12 selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 md:mb-16">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Chat</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="font-black text-lg bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-widest leading-none">Likeway</span>
          </div>

        </header>

        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-6xl font-black tracking-tight"
          >
            Elevate your <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Intelligence</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg"
          >
            Built for professionals who demand more. Unlock elite reasoning, coding agents, vision models, and deep research — all in one platform.
          </motion.p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.values(PLANS).map((plan, index) => {
            const modelCount = getPlanModels(plan.id);
            const isPro = plan.id === "Pro";
            const isCurrentPlan = plan.id === "Core" && getCurrentPlan() === "Core";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative p-6 md:p-8 rounded-3xl border transition-all duration-300 flex flex-col ${
                  hoveredPlan === plan.id ? "translate-y-[-8px]" : ""
                } ${
                  plan.id === "Go"
                    ? "border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 bg-gradient-to-b from-[#0a1628] to-[#0a0e16]"
                    : plan.id === "Pro"
                    ? "border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/20 bg-gradient-to-b from-[#140a28] to-[#0a0e16]"
                    : plan.id === "Plus"
                    ? "border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/30 bg-gradient-to-b from-[#0a1430] to-[#0a0e16] md:scale-[1.02] z-10"
                    : "border-white/5 bg-[#0a0e16] hover:border-white/10"
                }`}
              >
                {/* Badge */}
                {plan.id === "Go" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-cyan-500/30 whitespace-nowrap z-10">
                     LIMITED TIME OFFER
                  </div>
                )}

                {plan.id === "Plus" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/30 whitespace-nowrap z-10">
                     MOST POPULAR
                  </div>
                )}

                {plan.id === "Pro" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-violet-500/30 whitespace-nowrap z-10">
                     BEST VALUE
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black tracking-tight">{plan.name}</h3>
                    {plan.id === "Pro" && <Rocket size={16} className="text-violet-400" />}
                    {plan.id === "Plus" && <Sparkles size={16} className="text-blue-400" />}
                    {plan.id === "Go" && <Zap size={16} className="text-cyan-400" />}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    {plan.price !== "Free" && (
                      <div className="flex flex-col ml-1">
                          <span className="text-gray-500 text-[10px] font-bold">INR / month</span>
                          <span className="text-gray-600 text-[8px] font-medium uppercase tracking-tighter">Inclusive of GST</span>
                      </div>
                    )}
                  </div>

                  {/* Model Count Badge */}
                  <div className={cn(
                    "mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                    plan.id === "Pro" 
                      ? "border-violet-500/30 text-violet-400 bg-violet-500/5"
                      : plan.id === "Go"
                      ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/5"
                      : plan.id === "Plus"
                      ? "border-blue-500/30 text-blue-400 bg-blue-500/5"
                      : "border-gray-500/20 text-gray-400"
                  )}>
                    <Lock size={10} className={plan.id === "Core" ? "opacity-50" : ""} />
                    {modelCount === MODELS.length 
                      ? `All ${modelCount} models unlocked` 
                      : `${modelCount} models unlocked`}
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-[12px] text-gray-400 leading-tight group">
                      <Check size={14} className={cn("mt-0.5 shrink-0", 
                          plan.id === 'Go' ? 'text-cyan-400' : 
                          plan.id === 'Pro' ? 'text-violet-400' : 
                          plan.id === 'Plus' ? 'text-blue-400' : 'text-gray-500'
                      )} />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${
                    plan.id === "Go"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/25"
                      : plan.id === "Pro"
                      ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-400 hover:to-purple-400 hover:shadow-violet-500/25"
                      : plan.id === "Plus"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-400 hover:to-indigo-400 hover:shadow-blue-500/25"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  } ${hoveredPlan === plan.id ? "scale-[1.02]" : ""}`}
                >
                  {isCurrentPlan ? "Current Plan" : `Upgrade to ${plan.id}`}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-t border-white/5 pt-12 md:pt-16">
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-violet-500/10 w-fit text-violet-400">
              <Code size={24} />
            </div>
            <h4 className="text-xl font-bold">Architect Coding Agent</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Specialized expertise in architecture, refactoring, and debugging across 50+ languages. Generate production-grade code instantly.
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 w-fit text-cyan-400">
              <Eye size={24} />
            </div>
            <h4 className="text-xl font-bold">Vision & Image Understanding</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Upload screenshots, diagrams, or photos — AI analyzes, describes, and answers questions about any image content.
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-orange-500/10 w-fit text-orange-400">
              <Search size={24} />
            </div>
            <h4 className="text-xl font-bold">Deep Research Engine</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Multi-step autonomous exploration that browses the web, synthesizes findings, and delivers comprehensive reports.
            </p>
          </div>
        </div>

        {/* Additional Features Grid */}
        <div className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: Bot, label: "Multiple AI Models", desc: "Switch between 12 specialized engines" },
            { icon: Wand2, label: "Image Generation", desc: "FLUX.1 Schnell & SDXL powered" },
            { icon: Mic, label: "Voice Assistant", desc: "Natural speech conversations" },
            { icon: Globe, label: "Web Browsing", desc: "Real-time search & data fetch" },
            { icon: Brain, label: "Extended Memory", desc: "Custom instructions & context" },
            { icon: Star, label: "Elite Reasoning", desc: "Deep chain-of-thought logic" },
            { icon: Shield, label: "Secure by Design", desc: "Enterprise-grade protection" },
            { icon: Layers, label: "Edge Models", desc: "Early access to latest AI" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex flex-col items-center text-center p-4 md:p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors bg-white/[0.02]"
            >
              <div className="p-2.5 rounded-xl bg-white/5 w-fit mb-3">
                <item.icon size={20} className="text-gray-400" />
              </div>
              <h5 className="text-xs font-bold mb-1">{item.label}</h5>
              <p className="text-[10px] text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 md:mt-24 text-center pb-12">
            <p className="text-gray-600 text-xs">
              Prices include GST where applicable. Cancel anytime. Terms &amp; Privacy apply.
            </p>
        </footer>
      </div>

      {/* ── Professional Checkout Overlay ── */}
      <AnimatePresence>
        {isCheckoutOpen && selectedPlanId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#f5f6fa] overflow-y-auto flex flex-col"
          >
            <header className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 px-4 md:px-10 py-3 md:py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {checkoutStep !== 'success' && (
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="flex items-center gap-2 text-[#00154f] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors group text-sm font-semibold"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Plan
                  </button>
                )}
                <div className="h-5 w-px bg-gray-200" />
                <span className="font-black text-lg text-[#00154f] tracking-tight">Checkout</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
                <Shield size={14} className="text-[#00154f]" />
                <span className="text-[10px] font-black text-[#00154f] uppercase tracking-widest">Secure Vault Protected</span>
              </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-12">
              <AnimatePresence mode="wait">

                {checkoutStep === 'processing' && (
                  <motion.div
                    key="processing-page"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                  >
                    <div className="relative w-24 h-24 mb-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-[#00154f]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={36} className="text-[#00154f]" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-[#00154f] mb-3">Processing Securely</h3>
                    <p className="text-gray-400 text-sm max-w-xs">Verifying your transaction with a secure encrypted connection...</p>
                  </motion.div>
                )}

                {checkoutStep === 'success' && (
                  <motion.div
                    key="success-page"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-200"
                    >
                      <Check size={48} className="text-white stroke-[3px]" />
                    </motion.div>
                    <h3 className="text-4xl font-black text-[#00154f] mb-3">Payment Successful!</h3>
                    <p className="text-gray-500 mb-10 text-lg">
                      Your <span className="font-black text-[#00154f]">{PLANS[selectedPlanId].name}</span> features are now active.
                    </p>
                    <button
                      onClick={() => { setIsCheckoutOpen(false); router.push("/"); }}
                      className="px-12 py-4 rounded-2xl bg-[#00154f] text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-[#00267e] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      Start Using {PLANS[selectedPlanId].name} →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <footer className="bg-white border-t border-gray-100 py-8 px-6 md:px-10">
              <div className="max-w-6xl mx-auto flex flex-col items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
                  <span className="font-black text-lg text-[#00154f]/40 tracking-tight">Likeway Pay</span>
                  <div className="h-4 w-px bg-gray-200 hidden sm:block" />
                  <p className="text-[11px] text-gray-400">© 2024 Likeway Technologies. All rights reserved.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {['Support Center', 'Refund Policy', 'Security Overview'].map((l) => (
                    <span key={l} className="text-[11px] font-bold text-gray-400 hover:text-[#00154f] transition-colors cursor-pointer">{l}</span>
                  ))}
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
