"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, ArrowLeft, Shield, Globe, Code, Search, CreditCard, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS, setCurrentPlan, getCurrentPlan, PlanType } from "@/lib/plans";
import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PricingPage() {

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanType | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"method" | "processing" | "success">("method");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Fetch actual plan from DB on mount
    const fetchPlan = async () => {
      const userId = localStorage.getItem('gemma_userId');
      if (userId) {
        try {
          const res = await fetch(`/api/user/plan?userId=${userId}`);
          const data = await res.json();
          if (data.plan) {
            setCurrentPlan(data.plan);
          }
        } catch (e) {
          console.error("Failed to fetch current plan:", e);
        }
      }
    };
    fetchPlan();

    // Listen for native purchase completion events
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
  }, []);

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "Core") {
       setCurrentPlan(planId);
       router.push("/");
       return;
    }
    setSelectedPlanId(planId);
    setCheckoutStep("method");
    setSelectedMethod(null);
    setIsCheckoutOpen(true);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCompletePayment = async () => {
    if (!selectedPlanId) return;
    setCheckoutStep("processing");

    const userId = localStorage.getItem('gemma_userId') || 'anonymous-user';

    // ── RAZORPAY FLOW (UPI & Carrier) ──
    if (selectedMethod === 'upi' || selectedMethod === 'carrier') {
      try {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Razorpay payment gateway failed to load. Please check your internet connection.");
        }

        const response = await fetch('/api/subscription/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, planId: selectedPlanId }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.isMock) {
          // Simulated Success for Demo / sandbox testing
          setTimeout(async () => {
            try {
              const confirmRes = await fetch("/api/subscription/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  planId: selectedPlanId,
                  razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(2, 11),
                  razorpay_subscription_id: data.subscriptionId,
                  razorpay_signature: "mock_signature",
                }),
              });
              const confirmData = await confirmRes.json();
              if (confirmData.error) throw new Error(confirmData.error);

              setCurrentPlan(selectedPlanId);
              setCheckoutStep("success");
            } catch (err: any) {
              alert("Verification failed: " + err.message);
              setCheckoutStep("method");
            }
          }, 2000);
          return;
        }

        const options = {
          key: data.keyId || "rzp_test_your_id",
          subscription_id: data.subscriptionId,
          name: "Likeway AI",
          description: `${selectedPlanId} Subscription`,
          handler: async function (paymentResponse: any) {
            setCheckoutStep("processing");
            try {
              const confirmRes = await fetch("/api/subscription/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  planId: selectedPlanId,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              });
              const confirmData = await confirmRes.json();
              if (confirmData.error) throw new Error(confirmData.error);

              setCurrentPlan(selectedPlanId);
              setCheckoutStep("success");
            } catch (err: any) {
              alert("Verification failed: " + err.message);
              setCheckoutStep("method");
            }
          },
          prefill: {
            name: "",
            email: "",
            contact: "",
          },
          theme: {
            color: "#8b5cf6",
          },
          modal: {
            ondismiss: function () {
              setCheckoutStep("method");
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (error: any) {
        console.error("Razorpay Error:", error);
        alert("Failed to initiate subscription: " + error.message);
        setCheckoutStep("method");
      }
      return;
    }

    // ── STRIPE FLOW (Credit/Debit Card) ──
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId: selectedPlanId }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Redirect to Stripe's hosted checkout page
      window.location.href = data.url;

    } catch (error: any) {
      console.error("Payment Error:", error);
      alert("Failed to initiate payment: " + error.message);
      setCheckoutStep("method");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4 md:p-12 selection:bg-cyan-500/30">
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
             <span className="font-bold text-lg gradient-text uppercase tracking-widest leading-none">Likeway</span>
          </div>

        </header>

        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-6xl font-bold tracking-tight"
          >
            Elevate your <span className="gradient-text">Intelligence</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg"
          >
            Choose the perfect plan for your professional workflow. Unlock advanced reasoning, specialized coding agents, and real-time deep research.
          </motion.p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.values(PLANS).map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 md:p-8 rounded-3xl glass border transition-all hover:translate-y-[-8px] group flex flex-col ${
                plan.id === "Plus" ? "border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500/20" : 
                plan.id === "Pro" ? "border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.1)]" : "border-white/5"
              }`}
            >
              {plan.id === "Plus" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-cyan-500/30 whitespace-nowrap">
                   🔥 LIMITED TIME OFFER
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-black mb-2 tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.price !== "Free" && (
                    <div className="flex flex-col ml-1">
                        <span className="text-gray-500 text-[10px] font-bold">INR / month</span>
                        <span className="text-gray-600 text-[8px] font-medium uppercase tracking-tighter">Inclusive of GST</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-medium uppercase tracking-widest">
                    {plan.id === 'Core' ? 'Explore AI capabilities' : 'Maximize your productivity'}
                </p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-[12px] text-gray-400 group-hover:text-gray-300 leading-tight">
                    <Check size={14} className={cn("mt-0.5 shrink-0", 
                        plan.id === 'Plus' ? 'text-cyan-400' : 
                        plan.id === 'Pro' ? 'text-violet-400' : 'text-gray-500'
                    )} />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${
                  plan.id === "Plus" ? "bg-cyan-500 text-black hover:bg-cyan-400" : 
                  plan.id === "Pro" ? "bg-violet-500 text-white hover:bg-violet-400" :
                  "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                }`}
              >
                {plan.id === "Core" && getCurrentPlan() === "Core" ? "Current Plan" : `Upgrade to ${plan.id}`}
              </button>
            </motion.div>
          ))}
        </div>


        {/* Feature Highlights */}
        <div className="mt-12 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-t border-white/5 pt-12 md:pt-16">
          <div className="space-y-4">
            <div className={`p-3 rounded-xl bg-violet-500/10 w-fit text-violet-400`}>
              <Code size={24} />
            </div>
            <h4 className="text-xl font-bold">Architect Coding Agent</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Specialized expertise in architecture, refactoring, and debugging across 50+ languages.
            </p>
          </div>
          <div className="space-y-4">
            <div className={`p-3 rounded-xl bg-cyan-500/10 w-fit text-cyan-400`}>
              <Search size={24} />
            </div>
            <h4 className="text-xl font-bold">Deep Research</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Multi-step autonomous exploration that browses the web to synthesize complex answers.
            </p>
          </div>
          <div className="space-y-4">
             <div className={`p-3 rounded-xl bg-orange-500/10 w-fit text-orange-400`}>
              <Shield size={24} />
            </div>
            <h4 className="text-xl font-bold">Elite Security</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Enterprise-grade data protection with isolated project contexts and SOC2 compliance.
            </p>
          </div>
        </div>
        

        {/* Footer */}
        <footer className="mt-24 text-center pb-12">
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
            {/* ── Header ── */}
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

            {/* ── Body ── */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-12">
              <AnimatePresence mode="wait">

                {/* ─── STEP: METHOD ─── */}
                {checkoutStep === 'method' && (
                  <motion.div
                    key="method-page"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start"
                  >
                    {/* Left: Order Summary */}
                    <aside className="lg:col-span-5 space-y-6 lg:sticky top-28">
                      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-3">Order Summary</p>
                        <div className="flex items-start justify-between mb-8">
                          <h2 className="font-black text-3xl text-[#00154f] leading-tight">{PLANS[selectedPlanId].name} Subscription</h2>
                          <span className="bg-blue-50 text-[#00154f] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mt-1 whitespace-nowrap">Premium</span>
                        </div>

                        {/* Price breakdown */}
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-sm text-gray-500 font-medium">
                            <span>Monthly Plan</span>
                            <span>
                              {/* Show price ex-GST */}
                              ₹{Math.round(parseInt(PLANS[selectedPlanId].price.replace(/[₹,]/g, '')) / 1.18)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500 font-medium">
                            <span>GST (18%)</span>
                            <span>
                              ₹{Math.round(parseInt(PLANS[selectedPlanId].price.replace(/[₹,]/g, '')) - parseInt(PLANS[selectedPlanId].price.replace(/[₹,]/g, '')) / 1.18)}
                            </span>
                          </div>
                          <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                            <span className="font-bold text-lg text-[#00154f]">Total Amount</span>
                            <div className="text-right">
                              <p className="text-3xl font-black text-[#00154f]">{PLANS[selectedPlanId].price}</p>
                              <p className="text-xs text-gray-400">per month</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 items-start">
                          <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Your subscription automatically renews monthly. Cancel anytime from your account settings.
                          </p>
                        </div>
                      </div>

                      {/* Trust badges */}
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">Guaranteed Safe Checkout</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Check, label: 'PCI-DSS Compliant' },
                            { icon: Shield, label: '256-bit SSL' },
                          ].map((b) => (
                            <div key={b.label} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                              <b.icon size={16} className="text-[#00154f]" />
                              <span className="text-[10px] font-black text-gray-700 uppercase leading-tight">{b.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center gap-6 mt-4 opacity-30 grayscale">
                          <CreditCard size={24} />
                          <Smartphone size={24} />
                          <Globe size={24} />
                        </div>
                      </div>
                    </aside>

                    {/* Right: Payment Methods */}
                    <section className="lg:col-span-7">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-2xl text-gray-900">Select Payment Method</h3>
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Step 2 of 2</span>
                      </div>

                      <div className="space-y-3">
                        {/* UPI */}
                        <button
                          onClick={() => setSelectedMethod('upi')}
                          className={cn(
                            "w-full text-left rounded-2xl p-5 transition-all border-2 shadow-sm hover:shadow-md active:scale-[0.99]",
                            selectedMethod === 'upi'
                              ? "border-[#00154f] bg-blue-50/60"
                              : "border-gray-100 bg-white hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                                <Smartphone size={22} className="text-[#00154f]" />
                              </div>
                              <div>
                                <h4 className="font-black text-base text-[#00154f]">Unified Payments Interface (UPI)</h4>
                                <p className="text-xs text-gray-400 font-medium">GPay, PhonePe, Paytm, or any UPI App</p>
                              </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">Recommended</span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-xs text-gray-500 font-bold">
                              GPay · PhonePe · Paytm
                            </div>
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <Zap size={12} /> Instant Activation
                            </span>
                          </div>
                        </button>

                        {/* Card */}
                        <button
                          onClick={() => setSelectedMethod('card')}
                          className={cn(
                            "w-full text-left rounded-2xl p-5 transition-all border-2 shadow-sm hover:shadow-md active:scale-[0.99]",
                            selectedMethod === 'card'
                              ? "border-[#00154f] bg-blue-50/60"
                              : "border-gray-100 bg-white hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <CreditCard size={22} className="text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-base text-gray-900">Credit or Debit Card</h4>
                                <ArrowLeft size={16} className="text-gray-300 rotate-180" />
                              </div>
                              <p className="text-xs text-gray-400">Supports Visa, Mastercard, AMEX, and RuPay</p>
                            </div>
                          </div>
                        </button>

                        {/* Google Play */}
                        <button
                          onClick={() => setSelectedMethod('carrier')}
                          className={cn(
                            "w-full text-left rounded-2xl p-5 transition-all border-2 shadow-sm hover:shadow-md active:scale-[0.99]",
                            selectedMethod === 'carrier'
                              ? "border-[#00154f] bg-blue-50/60"
                              : "border-gray-100 bg-white hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <Smartphone size={22} className="text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-base text-gray-900">Google Play Billing</h4>
                                <ArrowLeft size={16} className="text-gray-300 rotate-180" />
                              </div>
                              <p className="text-xs text-gray-400">Use your Google Play balance or carrier billing</p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* CTA */}
                      <div className="mt-8 space-y-3">
                        <button
                          disabled={!selectedMethod}
                          onClick={handleCompletePayment}
                          className="w-full py-5 rounded-2xl bg-[#00154f] text-white font-black text-lg tracking-wide flex items-center justify-center gap-3 shadow-xl hover:bg-[#00267e] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                          Pay {PLANS[selectedPlanId].price} &amp; Subscribe
                          <ArrowLeft size={20} className="rotate-180" />
                        </button>
                        <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-md mx-auto">
                          By completing this transaction, you agree to our{' '}
                          <span className="underline font-bold text-[#00154f] cursor-pointer">Terms of Service</span>
                          {' '}and{' '}
                          <span className="underline font-bold text-[#00154f] cursor-pointer">Privacy Policy</span>.
                        </p>
                      </div>
                    </section>
                  </motion.div>
                )}

                {/* ─── STEP: PROCESSING ─── */}
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

                {/* ─── STEP: SUCCESS ─── */}
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

            {/* ── Footer ── */}
            <footer className="bg-white border-t border-gray-100 py-8 px-6 md:px-10">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-black text-lg text-[#00154f]/40 tracking-tight">Likeway Pay</span>
                  <div className="h-4 w-px bg-gray-200 hidden md:block" />
                  <p className="text-[11px] text-gray-400">© 2024 Likeway Technologies. All rights reserved.</p>
                </div>
                <div className="flex gap-6">
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

