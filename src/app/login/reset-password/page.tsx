"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

type Step = "email" | "otp" | "success";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // The code is emailed — never returned to the browser.
        setStep("otp");
        setResendTimer(60);
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResendTimer(60);
    } catch {
      setError("Connection failed. Please try again.");
    }
    setIsLoading(false);
  };

  const handleOTPChange = (index: number, value: string) => {
    // If user enters multiple digits (e.g. typing fast or browser autofill)
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    if (clean.length > 1) {
      // Fill sequentially
      const newOtp = [...otp];
      for (let i = 0; i < clean.length && index + i < 6; i++) {
        newOtp[index + i] = clean[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + clean.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = clean;
    setOtp(newOtp);

    if (clean && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move back and clear previous box
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: otpCode, newPassword }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStep("success");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  

  return (
    <div className="min-h-screen bg-[#121414] text-[#e2e2e2] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-8%] left-[-8%] w-[380px] h-[380px] bg-[#c0c1ff] rounded-full blur-[80px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: "12s" }} />
      <div className="absolute bottom-[-5%] right-[-5%] w-[320px] h-[320px] bg-[#8083ff] rounded-full blur-[80px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: "12s", animationDelay: "-3s" }} />

      <main className="w-full max-w-[420px] z-10">
        <div className="flex flex-col items-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-2">
            <ShieldCheck size={14} className="text-[#c0c1ff]" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-300">Account Recovery</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#e2e2e2] tracking-tight">Likeway</h1>
        </div>

        <div className="bg-[rgba(23,23,23,0.85)] backdrop-blur-[14px] border border-[#2F2F2F] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#c0c1ff] to-transparent opacity-60" />

          {/* Step 1: Enter Email */}
          {step === "email" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <header className="text-center mb-5">
                <div className="w-12 h-12 bg-[#c0c1ff]/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#c0c1ff]/20">
                  <Lock size={22} className="text-[#c0c1ff]" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-1">Reset Password</h2>
                <p className="text-[13px] text-[#c7c4d7]">Enter your account email to receive your verification code</p>
              </header>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-[13px] text-[#c7c4d7] mb-1.5 ml-1">Email address</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#908fa0] group-focus-within:text-[#c0c1ff] transition-colors"><Mail size={16} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#1e2020] border border-[#908fa0]/60 rounded-xl text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] transition-all text-[14px]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-xl hover:bg-[#c0c1ff] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Send Verification Code"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Enter OTP + New Password */}
          {step === "otp" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <header className="text-center mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                  <Mail size={22} className="text-emerald-400" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-1">Enter Verification Code</h2>
                <p className="text-[13px] text-[#c7c4d7]">
                  Code sent for <span className="text-[#c0c1ff] font-medium">{email}</span>
                </p>
              </header>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {/* OTP Input with Paste Support */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[12px] text-[#c7c4d7] ml-1">6-Digit Verification Code</label>
                  </div>
                  <div className="flex justify-between gap-1.5 mb-2" onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        className="w-12 h-12 text-center text-xl font-mono font-bold bg-[#1e2020] border border-[#908fa0]/60 rounded-xl text-[#e2e2e2] focus:outline-none focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] transition-all"
                      />
                    ))}
                  </div>

                  {/* Resend Action */}
                  <div className="text-center mt-1">
                    {resendTimer > 0 ? (
                      <p className="text-[11px] text-[#908fa0]">Resend code in {resendTimer}s</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={isLoading}
                        className="text-[11px] text-[#c0c1ff] hover:text-[#8083ff] font-semibold transition-colors cursor-pointer"
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[12px] text-[#c7c4d7] mb-1 ml-1">New Password</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0]"><Lock size={15} /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-[#1e2020] border border-[#908fa0]/60 rounded-xl text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] text-[14px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#908fa0] hover:text-[#e2e2e2] cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[12px] text-[#c7c4d7] mb-1 ml-1">Confirm New Password</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0]"><Lock size={15} /></span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-[#1e2020] border border-[#908fa0]/60 rounded-xl text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] text-[14px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#908fa0] hover:text-[#e2e2e2] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.some((d) => !d) || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-xl hover:bg-[#c0c1ff] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={34} className="text-emerald-400" />
              </div>
              <h2 className="text-[22px] font-bold text-[#e2e2e2] mb-2">Password Reset Complete!</h2>
              <p className="text-[13px] text-[#c7c4d7] mb-6">
                Your password has been successfully updated. You can now log in to Likeway with your new password.
              </p>
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-xl hover:bg-[#c0c1ff] transition-all"
              >
                <ArrowLeft size={16} /> Return to Login
              </a>
            </motion.div>
          )}

          </div>

        <div className="mt-4 text-center">
          <a href="/login" className="text-[12px] text-[#908fa0] hover:text-[#e2e2e2] transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft size={13} /> Back to Login
          </a>
        </div>
      </main>
    </div>
  );
}
