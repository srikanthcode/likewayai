"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type AuthMode = "login" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google/redirect";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setIsLoading(false);
          return;
        }
        const result = await register(name, email, password);
        if (result.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
      }
      handleClose();
    } catch {
      setError("Connection failed. Please try again.");
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    resetForm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-full max-w-[400px] mx-4"
          >
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
                
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {mode === "login" ? "Welcome back" : "Create account"}
                  </h1>
                  <p className="text-sm text-gray-400">
                    {mode === "login" 
                      ? "Log in to continue chatting with AI" 
                      : "Sign up to start your AI journey"}
                  </p>
                </div>
              </div>

              {/* Social Auth */}
              <div className="px-6 pb-4">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all duration-200 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-medium text-white">Continue with Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-gray-500 mt-2">Must be at least 8 characters</p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !password || (mode === "signup" && !name)}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {mode === "login" ? "Log in" : "Sign up"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {mode === "login" && (
                  <a href="/login/reset-password" className="block text-center text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                    Forgot password?
                  </a>
                )}
              </form>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                <p className="text-center text-sm text-gray-400">
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={switchMode}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    {mode === "login" ? "Sign up" : "Log in"}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
