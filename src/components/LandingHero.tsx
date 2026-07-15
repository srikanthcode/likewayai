"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles, MessageSquare, Code, PenLine, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ThemeMode = "dark" | "light";

const examples = [
  { icon: MessageSquare, label: "Explain React hooks", color: "from-blue-400 to-cyan-400" },
  { icon: PenLine, label: "Write a professional email", color: "from-emerald-400 to-teal-400" },
  { icon: Code, label: "Generate Python code", color: "from-violet-400 to-purple-400" },
  { icon: Zap, label: "Debug my CSS layout", color: "from-amber-400 to-orange-400" },
];

export default function LandingHero() {
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("likeway_theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const form = e.target as HTMLFormElement;
      const nativeEvent = e.nativeEvent as SubmitEvent;
      const submitter = nativeEvent.submitter as HTMLButtonElement | null;
      if (submitter?.formAction) return;
      window.location.href = `/login?q=${encodeURIComponent(input.trim())}`;
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      isDark ? "bg-[#212121] text-gray-100" : "bg-white text-gray-900"
    )}>
      {/* ── Navigation ── */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-14 border-b transition-colors",
        isDark ? "bg-[#212121]/80 border-gray-700/50 backdrop-blur-lg" : "bg-white/80 border-gray-200 backdrop-blur-lg"
      )}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-shadow">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">MyAI</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.97]",
              isDark
                ? "border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white"
                : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"
            )}
          >
            Log In
          </Link>
          <Link
            href="/login?signup=1"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-200 active:scale-[0.97]"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto text-center"
        >
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-10",
              isDark ? "text-gray-100" : "text-gray-900"
            )}
          >
            How can I help you today?
          </motion.h1>

          {/* ── Chat Input ── */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            onSubmit={handleSubmit}
            className={cn(
              "relative flex items-center rounded-2xl border shadow-sm transition-shadow duration-200 focus-within:shadow-md",
              isDark
                ? "bg-[#2f2f2f] border-gray-600 focus-within:border-gray-500"
                : "bg-white border-gray-300 focus-within:border-gray-400"
            )}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className={cn(
                "flex-1 bg-transparent px-5 py-4 text-base outline-none placeholder:select-none",
                isDark
                  ? "text-gray-100 placeholder:text-gray-500"
                  : "text-gray-900 placeholder:text-gray-400"
              )}
              aria-label="Ask anything"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className={cn(
                "mr-2 p-2.5 rounded-xl transition-all duration-200 flex-shrink-0",
                input.trim()
                  ? isDark
                    ? "bg-gray-100 text-gray-800 hover:bg-white cursor-pointer"
                    : "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                  : isDark
                    ? "bg-gray-600 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed",
                "active:scale-[0.92]"
              )}
            >
              <ArrowUp size={18} />
            </button>
          </motion.form>

          {/* ── Example Prompts ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mt-4"
          >
            {examples.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setInput(ex.label)}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                  isDark
                    ? "border-gray-600 text-gray-300 hover:border-gray-500 hover:text-gray-100 bg-transparent hover:bg-gray-700/50"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 bg-transparent hover:bg-gray-50"
                )}
              >
                <ex.icon size={15} className={cn(
                  "transition-colors duration-200",
                  isDark ? "text-gray-500 group-hover:text-gray-300" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {ex.label}
              </button>
            ))}
          </motion.div>

          {/* ── Get Responses Tailored to You ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={cn(
              "mt-8 p-5 sm:p-6 rounded-2xl border text-left transition-colors",
              isDark
                ? "bg-[#2f2f2f] border-gray-700"
                : "bg-gray-50 border-gray-200"
            )}
          >
            <h3 className={cn(
              "text-base font-semibold mb-1.5",
              isDark ? "text-gray-100" : "text-gray-900"
            )}>
              Get responses tailored to you
            </h3>
            <p className={cn(
              "text-sm leading-relaxed mb-4",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              Log in to get answers based on your previous chats, create images,
              upload files, and access personalized features.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.97]",
                  isDark
                    ? "border-gray-600 text-gray-200 hover:border-gray-500 hover:text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
                )}
              >
                Log In
              </Link>
              <Link
                href="/login?signup=1"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-sm hover:shadow-md hover:shadow-cyan-500/20 transition-all duration-200 active:scale-[0.97]"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* ── Footer Disclaimer ── */}
      <footer className="pb-4 px-4">
        <p className={cn(
          "text-center text-xs leading-relaxed max-w-md mx-auto",
          isDark ? "text-gray-500" : "text-gray-400"
        )}>
          AI can make mistakes. Verify important information.
        </p>
      </footer>
    </div>
  );
}
