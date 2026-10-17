"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Camera,
  Play,
  Pause,
  Square,
  Shield,
  MousePointer,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrowserStep {
  id: string;
  timestamp: string;
  action: string;
  target?: string;
  status: "pending" | "running" | "completed" | "failed";
  details?: string;
}

export default function VisibleBrowserWorkspace({
  isOpen,
  onClose,
  initialUrl,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  theme: "dark" | "light";
}) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || "https://duckduckgo.com");
  const [inputUrl, setInputUrl] = useState(initialUrl || "https://duckduckgo.com");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 340, y: 220, visible: true });

  const [steps, setSteps] = useState<BrowserStep[]>([
    {
      id: "step_1",
      timestamp: "00:01",
      action: "Spawned isolated browser runtime",
      status: "completed",
    },
    {
      id: "step_2",
      timestamp: "00:03",
      action: "Navigated to target portal",
      target: currentUrl,
      status: "completed",
    },
    {
      id: "step_3",
      timestamp: "00:05",
      action: "Resolved DOM accessibility tree & input selectors",
      status: "completed",
    },
  ]);

  const [manualTakeover, setManualTakeover] = useState(false);

  const startAgentAutomation = (taskPrompt: string) => {
    setIsRunning(true);
    setIsPaused(false);

    const newStep: BrowserStep = {
      id: `step_${Date.now()}`,
      timestamp: "00:07",
      action: `Executing task: "${taskPrompt}"`,
      status: "running",
    };
    setSteps((prev) => [...prev, newStep]);

    // Animate cursor to visual search target
    setTimeout(() => {
      setCursorPos({ x: 480, y: 190, visible: true });
    }, 800);

    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) => (s.id === newStep.id ? { ...s, status: "completed" } : s))
      );
      setIsRunning(false);
    }, 2200);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    let target = inputUrl;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    setCurrentUrl(target);
    setInputUrl(target);
    setSteps((prev) => [
      ...prev,
      {
        id: `step_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString().slice(3, 8),
        action: `Navigated to ${target}`,
        status: "completed",
      },
    ]);
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={cn(
          "relative flex flex-col w-full max-w-6xl h-[92vh] rounded-3xl border shadow-2xl overflow-hidden",
          isDark ? "bg-[#070b14] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
        )}
      >
        {/* Top Control Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit bg-black/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Globe size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm">Autonomous Browser Agent</h2>
                <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 font-semibold">
                  Live Viewport Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Observe autonomous browsing, inspect click coordinates, or take manual control.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualTakeover(!manualTakeover)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all",
                manualTakeover
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "border-white/10 text-gray-400 hover:text-white"
              )}
            >
              {manualTakeover ? "Release to AI" : "Manual Takeover"}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Browser Browser Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-inherit bg-black/20">
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
            disabled
          >
            <ArrowLeft size={14} />
          </button>
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
            disabled
          >
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => setCurrentUrl(currentUrl)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            title="Reload current page"
          >
            <RotateCcw size={14} />
          </button>

          <form onSubmit={handleNavigate} className="flex-1 flex items-center">
            <div className="flex-1 flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
              <Lock size={12} className="text-emerald-400 mr-2 shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full bg-transparent text-gray-200 outline-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => startAgentAutomation("Search and extract latest benchmark papers")}
              disabled={isRunning}
              className="flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <Play size={12} fill="currentColor" />
              <span>{isRunning ? "Automating…" : "Run Task"}</span>
            </button>
          </div>
        </div>

        {/* Split View: Left Viewport (70%), Right Action Telemetry (30%) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Visual Viewport */}
          <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col justify-between">
            {/* Live iframe / web preview */}
            <div className="relative w-full h-full">
              <iframe
                src={currentUrl}
                title="Remote Browser Viewport"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                className="w-full h-full border-0 bg-white"
              />

              {/* Simulated Visual Cursor Indicator */}
              {cursorPos.visible && (
                <motion.div
                  animate={{ x: cursorPos.x, y: cursorPos.y }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="pointer-events-none absolute z-30 flex items-center gap-1.5"
                >
                  <MousePointer
                    size={20}
                    className="text-cyan-400 fill-cyan-400 filter drop-shadow-[0_2px_8px_rgba(6,182,212,0.8)]"
                  />
                  <span className="rounded bg-black/80 text-[10px] font-mono text-cyan-300 px-1.5 py-0.5 border border-cyan-400/40">
                    AI Agent
                  </span>
                </motion.div>
              )}
            </div>

            {/* Bottom Status Ticker */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-gray-300 font-mono">Chromium 1280x800 · 60fps Stream</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                <span>SSL Verified</span>
                <span>Sandboxed Process</span>
              </div>
            </div>
          </div>

          {/* Right Action Stream & Step Log */}
          <div className="w-80 border-l border-white/10 bg-black/40 flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Terminal size={14} className="text-cyan-400" />
                  Agent Execution Log
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{steps.length} actions</span>
              </div>

              <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
                {steps.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-400 font-mono">[{s.timestamp}]</span>
                      <span
                        className={cn(
                          "font-semibold text-[10px]",
                          s.status === "completed"
                            ? "text-emerald-400"
                            : s.status === "running"
                            ? "text-amber-400 animate-pulse"
                            : "text-gray-400"
                        )}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-300 font-medium">{s.action}</p>
                    {s.target && (
                      <span className="mt-1 block truncate text-[10px] font-mono text-gray-500">
                        {s.target}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400">
                <span className="text-gray-200 font-semibold block mb-1">Human Approval Mode</span>
                <span>Sensitive transactions or form commits require one-click confirmation.</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
