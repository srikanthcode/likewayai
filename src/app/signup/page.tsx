"use client";

import { useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const { register, guestLogin } = useAuth();

  const handleContinueAsGuest = async () => {
    setIsLoading(true);
    if (typeof document !== "undefined") {
      const oneYear = 365 * 24 * 60 * 60;
      document.cookie = `lw_guest=true; path=/; max-age=${oneYear}; SameSite=Lax`;
      document.cookie = `likeway_guest_mode=true; path=/; max-age=${oneYear}; SameSite=Lax`;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("likeway_guest_mode", "true");
      localStorage.setItem("likeway_plan", "Core");
    }
    const res = await guestLogin();
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentAI, setConsentAI] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 5) strength++;
    if (password.length > 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    
    setEmailError(emailValidation);
    setPasswordError(passwordValidation);
    
    if (emailValidation || passwordValidation) return;
    
    setIsLoading(true);
    const result = await register(name, email, password);
    setIsLoading(false);
    if (result.error) setError(result.error);
  };

  const handleGoogleLogin = () => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    window.location.href = `/api/auth/google/redirect${search}`;
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return "None";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 4) return "Medium";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (password.length === 0) return "bg-[#ffb4ab]";
    if (passwordStrength <= 2) return "bg-[#ffb4ab]";
    if (passwordStrength <= 4) return "bg-[#FBBC05]";
    return "bg-[#c0c1ff]";
  };

  const getStrengthWidth = () => {
    if (password.length === 0) return "0%";
    if (passwordStrength <= 2) return "25%";
    if (passwordStrength <= 4) return "60%";
    return "100%";
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#e2e2e2] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Atmospheric Background Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#c0c1ff]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#c0c1ff]/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <main className="z-10 w-full max-w-xs">
        {/* Brand Header */}
        <div className="text-center mb-2">
          <h1 className="text-[18px] font-extrabold tracking-tight text-[#e2e2e2]">
            Likeway
          </h1>
        </div>

        {/* Signup Modal Card */}
        <div className="bg-[rgba(23,23,23,0.8)] backdrop-blur-[12px] border border-[#2F2F2F] p-4 rounded-xl shadow-2xl flex flex-col gap-3">
          {/* Header Section */}
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-[18px] font-semibold text-[#e2e2e2]">Create your account</h2>
            <p className="text-[12px] text-[#c7c4d7]">Start your journey with Likeway AI</p>
          </div>

          {/* Social Auth Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-[#908fa0] rounded-lg text-[12px] text-[#e2e2e2] hover:bg-[#333535] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
              </svg>
              Continue with Google
            </button>
            <button
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-[#908fa0] rounded-lg text-[12px] text-[#e2e2e2] hover:bg-[#333535] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-.94-.44-2.09-.45-3.1 0-1.16.53-2 .54-3.03-.43C3.5 16.2 4.1 8.82 8.44 8.5c1.1.1 1.95.73 2.7.73.74 0 1.9-.84 3.37-.68 1.63.17 2.86.83 3.6 1.9-3.13 1.87-2.6 6.3.38 7.6-.6 1.55-1.4 3.1-3.04 3.23zm-3.1-15.5c.6-.74 1-1.78.88-2.78-1 .04-2.13.67-2.85 1.5-.63.75-1.12 1.83-.95 2.76 1.05.08 2.07-.53 2.92-1.48z"></path>
              </svg>
              Continue with Apple
            </button>
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-[#3A3A3A] hover:border-[#c0c1ff]/50 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-[12px] text-[#e2e2e2] hover:text-white transition-all active:scale-[0.98] group"
            >
              <Sparkles size={13} className="text-[#c0c1ff] group-hover:scale-110 transition-transform" />
              <span>Continue without signing up</span>
              <ArrowRight size={12} className="text-[#908fa0] group-hover:text-white group-hover:translate-x-0.5 transition-all ml-0.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[#908fa0]"></div>
            <span className="flex-shrink mx-2 text-[12px] text-[#c7c4d7] uppercase tracking-widest text-[10px]">OR</span>
            <div className="flex-grow border-t border-[#908fa0]"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {/* Name Field */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-[#c7c4d7] ml-1" htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                suppressHydrationWarning
                className="w-full bg-[#1e2020] border border-[#908fa0] rounded-lg py-2 px-3 text-[13px] text-[#e2e2e2] placeholder:text-[#c7c4d7]/50 focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-[#c7c4d7] ml-1" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="name@example.com"
                suppressHydrationWarning
                className={`w-full bg-[#1e2020] border ${emailError ? 'border-red-500' : 'border-[#908fa0]'} rounded-lg py-2 px-3 text-[13px] text-[#e2e2e2] placeholder:text-[#c7c4d7]/50 focus:outline-none focus:border-[#6366F1] transition-colors`}
              />
              {emailError && <p className="text-red-400 text-xs mt-0.5">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-[#c7c4d7] ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  suppressHydrationWarning
                  className={`w-full bg-[#1e2020] border ${passwordError ? 'border-red-500' : 'border-[#908fa0]'} rounded-lg py-2 px-3 text-[13px] text-[#e2e2e2] placeholder:text-[#c7c4d7]/50 focus:outline-none focus:border-[#6366F1] transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c7c4d7] hover:text-[#e2e2e2] cursor-pointer text-xs"
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
              {passwordError && <p className="text-red-400 text-xs mt-0.5">{passwordError}</p>}
              
              {/* Password Strength Indicator */}
              <div className="mt-1 px-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[#c7c4d7]">Strength</span>
                  <span className="text-[10px] text-[#c7c4d7]">{getStrengthLabel()}</span>
                </div>
                <div className="h-1 w-full bg-[#333535] rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full ${getStrengthColor()} transition-all duration-300`}
                    style={{ width: getStrengthWidth() }}
                  ></div>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            {/* Consent Checkboxes (DPDP Act 2023) */}
            <div className="flex flex-col gap-3 py-2">
              <label className="flex items-start gap-3 cursor-pointer group min-h-[44px] py-1">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border border-[#908fa0] bg-[#1e2020] peer-checked:bg-[#c0c1ff] peer-checked:border-[#c0c1ff] transition-all flex items-center justify-center">
                    {consentTerms && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0c0f0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#c7c4d7] leading-tight pt-0.5">
                  I agree to the{" "}
                  <a href="/legal/terms" target="_blank" className="text-[#c0c1ff] hover:underline font-medium">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/legal/privacy" target="_blank" className="text-[#c0c1ff] hover:underline font-medium">Privacy Policy</a>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group min-h-[44px] py-1">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={consentAI}
                    onChange={(e) => setConsentAI(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border border-[#908fa0] bg-[#1e2020] peer-checked:bg-[#c0c1ff] peer-checked:border-[#c0c1ff] transition-all flex items-center justify-center">
                    {consentAI && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0c0f0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#c7c4d7] leading-tight pt-0.5">
                  I consent to AI processing of my conversations by third-party providers as described in our{" "}
                  <a href="/legal/privacy" target="_blank" className="text-[#c0c1ff] hover:underline font-medium">Privacy Policy</a>
                </span>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading || !!emailError || !!passwordError || !email || !password || !consentTerms || !consentAI}
              className="w-full bg-[#e2e2e2] text-[#0c0f0f] text-[12px] py-2 rounded-lg hover:bg-[#c0c1ff] transition-colors active:scale-95 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin mx-auto" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-[12px] text-[#c7c4d7]">
              Already have an account?{" "}
              <a href="/login" className="text-[#c0c1ff] hover:underline font-medium">
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <footer className="mt-3 text-center flex flex-col gap-1">
          <div className="flex justify-center gap-3">
            <a href="/legal/terms" className="text-[11px] text-[#c7c4d7] hover:text-[#e2e2e2] transition-colors">Terms of Service</a>
            <a href="/legal/privacy" className="text-[11px] text-[#c7c4d7] hover:text-[#e2e2e2] transition-colors">Privacy Policy</a>
            <a href="/legal/cookies" className="text-[11px] text-[#c7c4d7] hover:text-[#e2e2e2] transition-colors">Cookies</a>
          </div>
          <p className="text-[10px] text-[#c7c4d7]/50">© 2026 Aixphonic. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
