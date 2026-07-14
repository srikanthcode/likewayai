"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle, Mail, Lock } from "lucide-react";

type Step = "email" | "otp" | "success";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStep("otp");
        setResendTimer(60);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError("");
    try {
      await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendTimer(60);
    } catch {
      setError("Failed to resend code.");
    }
    setIsLoading(false);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPKeyDownSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otp.every((d) => d !== "")) {
      handleVerifyOTP();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
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
        body: JSON.stringify({ email, token: otpCode, newPassword }),
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
      <div className="absolute top-[-8%] left-[-8%] w-[350px] h-[350px] bg-[#c0c1ff] rounded-full blur-[70px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: "12s" }} />
      <div className="absolute bottom-[-5%] right-[-5%] w-[300px] h-[300px] bg-[#8083ff] rounded-full blur-[70px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: "12s", animationDelay: "-3s" }} />

      <main className="w-full max-w-[380px] z-10">
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-[26px] font-semibold text-[#e2e2e2] tracking-tighter">Likeway</h1>
        </div>

        <div className="bg-[rgba(23,23,23,0.8)] backdrop-blur-[12px] border border-[#2F2F2F] rounded-xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#c0c1ff] to-transparent opacity-50" />

          {/* Step 1: Enter Email */}
          {step === "email" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <header className="text-center mb-5">
                <div className="w-12 h-12 bg-[#c0c1ff]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Lock size={24} className="text-[#c0c1ff]" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-1.5">Reset Password</h2>
                <p className="text-[13px] text-[#c7c4d7]">Enter your email to receive a verification code</p>
              </header>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-[13px] text-[#c7c4d7] mb-1.5 ml-1">Email address</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0] group-focus-within:text-[#c0c1ff] transition-colors"><Mail size={16} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#1e2020] border border-[#908fa0] rounded-lg text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] transition-all text-[14px]"
                    />
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-lg hover:bg-[#c0c1ff] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Send Verification Code"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Enter OTP + New Password */}
          {step === "otp" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <header className="text-center mb-5">
                <div className="w-12 h-12 bg-[#c0c1ff]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} className="text-[#c0c1ff]" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-1.5">Enter Verification Code</h2>
                <p className="text-[13px] text-[#c7c4d7]">We sent a 6-digit code to <span className="text-[#c0c1ff] font-medium">{email}</span></p>
              </header>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-5">
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
                    className="w-11 h-12 text-center text-lg font-bold bg-[#1e2020] border border-[#908fa0] rounded-lg text-[#e2e2e2] focus:outline-none focus:border-[#c0c1ff] transition-all"
                  />
                ))}
              </div>

              {/* Resend */}
              <div className="text-center mb-5">
                {resendTimer > 0 ? (
                  <p className="text-[12px] text-[#908fa0]">Resend code in {resendTimer}s</p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-[12px] text-[#c0c1ff] hover:text-[#8083ff] font-semibold transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[12px] text-[#c7c4d7] mb-1 ml-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 bg-[#1e2020] border border-[#908fa0] rounded-lg text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#c7c4d7] mb-1 ml-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleOTPKeyDownSubmit}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 bg-[#1e2020] border border-[#908fa0] rounded-lg text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] text-[14px]"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.some((d) => !d) || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-lg hover:bg-[#c0c1ff] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
              </button>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-2">Password Reset!</h2>
              <p className="text-[13px] text-[#c7c4d7] mb-6">Your password has been updated successfully.</p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-lg hover:bg-[#c0c1ff] transition-all"
              >
                <ArrowLeft size={16} /> Back to Login
              </a>
            </motion.div>
          )}
        </div>

        <div className="mt-4 text-center">
          <a href="/login" className="text-[12px] text-[#908fa0] hover:text-[#e2e2e2] transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={12} /> Back to Login
          </a>
        </div>
      </main>
    </div>
  );
}
