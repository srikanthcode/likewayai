"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, guestLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      const messages: Record<string, string> = {
        google_access_denied: "Google sign-in was cancelled.",
        token_exchange_failed: "Token exchange failed. Please try again.",
        userinfo_failed: "Failed to fetch user info from Google.",
        no_email: "Google account does not provide an email.",
        invalid_state: "Security verification failed.",
        internal_error: "Something went wrong. Please try again.",
      };
      setError(messages[err] || "Authentication failed.");
    }
  }, []);

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
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
    const result = await login(email, password);
    setIsLoading(false);
    if (result.error) setError(result.error);
  };

  const handleGoogleLogin = () => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    window.location.href = `/api/auth/google/redirect${search}`;
  };

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

  return (
    <div className="min-h-screen bg-[#121414] text-[#e2e2e2] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-8%] left-[-8%] w-[350px] h-[350px] bg-[#c0c1ff] rounded-full blur-[70px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: '12s' }}></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[300px] h-[300px] bg-[#8083ff] rounded-full blur-[70px] opacity-15 animate-pulse pointer-events-none" style={{ animationDuration: '12s', animationDelay: '-3s' }}></div>

      <main className="w-full max-w-[360px] z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-[26px] font-semibold text-[#e2e2e2] tracking-tighter">Likeway</h1>
        </div>

        {/* Modal Card */}
        <div className="bg-[rgba(23,23,23,0.8)] backdrop-blur-[12px] border border-[#2F2F2F] rounded-xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#c0c1ff] to-transparent opacity-50"></div>

          <header className="text-center mb-5">
            <h2 className="text-[20px] font-semibold text-[#e2e2e2] mb-1.5">Welcome back</h2>
            <p className="text-[13px] text-[#c7c4d7]">Log in to your Likeway account to continue</p>
          </header>

          {/* Social Auth */}
          <div className="space-y-2 mb-5">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#908fa0] hover:bg-[#333535] transition-all duration-200 group active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
              </svg>
              <span className="text-[13px] text-[#e2e2e2]">Continue with Google</span>
            </button>
            <button
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#908fa0] hover:bg-[#333535] transition-all duration-200 group active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-[#e2e2e2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.073 10.157c.01 2.132 1.705 3.158 1.73 3.17-.015.044-.27 1.025-1.029 2.115-.658.941-1.341 1.88-2.398 1.9-.993.02-1.341-.58-2.484-.58-1.144 0-1.45.58-2.484.58-1.034.02-1.83-.98-2.49-1.933-1.352-1.944-2.39-5.485-.986-7.896.697-1.196 1.934-1.955 3.284-1.975 1.012-.02 1.968.68 2.583.68.614 0 1.782-.843 2.976-.72 1.233.052 2.21.493 2.85 1.424-.047.03-.54.316-.54 1.335zM14.662 4.41c.54-.654.905-1.56.805-2.46-.816.033-1.806.545-2.39 1.228-.525.604-.985 1.53-.86 2.41.91.07 1.837-.457 2.445-1.178z"></path>
              </svg>
              <span className="text-[13px] text-[#e2e2e2]">Continue with Apple</span>
            </button>
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#3A3A3A] hover:border-[#c0c1ff]/50 bg-white/[0.02] hover:bg-white/[0.06] text-[#e2e2e2] hover:text-white transition-all duration-200 group active:scale-[0.98]"
            >
              <Sparkles size={14} className="text-[#c0c1ff] group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-medium">Continue without signing up</span>
              <ArrowRight size={13} className="text-[#908fa0] group-hover:text-white group-hover:translate-x-0.5 transition-all ml-0.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 h-[1px] bg-[#908fa0]"></div>
            <span className="text-[12px] text-[#908fa0] tracking-widest uppercase">OR</span>
            <div className="flex-1 h-[1px] bg-[#908fa0]"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] text-[#c7c4d7] mb-1.5 ml-1" htmlFor="email">Email address</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0] group-focus-within:text-[#c0c1ff] transition-colors text-[16px]">✉️</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="name@company.com"
                  required
                  suppressHydrationWarning
                  className={`w-full pl-9 pr-4 py-2.5 bg-[#1e2020] border ${emailError ? 'border-red-500' : 'border-[#908fa0]'} rounded-lg text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] transition-all duration-200 text-[14px]`}
                />
              </div>
              {emailError && <p className="text-red-400 text-xs mt-1 ml-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-[13px] text-[#c7c4d7] mb-1.5 ml-1" htmlFor="password">Password</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0] group-focus-within:text-[#c0c1ff] transition-colors text-[16px]">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                  suppressHydrationWarning
                  className={`w-full pl-9 pr-9 py-2.5 bg-[#1e2020] border ${passwordError ? 'border-red-500' : 'border-[#908fa0]'} rounded-lg text-[#e2e2e2] placeholder:text-[#908fa0]/50 focus:outline-none focus:border-[#c0c1ff] transition-all duration-200 text-[14px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#908fa0] hover:text-[#e2e2e2] cursor-pointer"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {passwordError && <p className="text-red-400 text-xs mt-1 ml-1">{passwordError}</p>}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex justify-end -mt-1">
              <a href="/login/reset-password" className="text-[12px] text-[#c0c1ff] hover:text-[#8083ff] font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!emailError || !!passwordError || !email || !password}
              className="w-full py-2.5 bg-[#e2e2e2] text-[#0c0f0f] text-[13px] font-bold rounded-lg hover:bg-[#c0c1ff] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <footer className="mt-4 text-center">
            <p className="text-[13px] text-[#c7c4d7]">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-[#c0c1ff] hover:text-[#8083ff] font-semibold transition-colors ml-1">
                Sign up
              </a>
            </p>
          </footer>

        </div>

        {/* Footer Links */}
        <div className="mt-4 flex justify-center gap-5">
          <a href="/legal/privacy" className="text-[12px] text-[#908fa0] hover:text-[#e2e2e2] transition-colors">Privacy Policy</a>
          <a href="/legal/terms" className="text-[12px] text-[#908fa0] hover:text-[#e2e2e2] transition-colors">Terms of Service</a>
        </div>
      </main>
    </div>
  );
}
