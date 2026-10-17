"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  Code2,
  Bug,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CodeBlock from "@/components/CodeBlock";

export type ViewportMode = "desktop" | "tablet" | "mobile";

export interface LivePreviewLog {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
}

export default function LivePreviewWorkspace({
  isOpen,
  onClose,
  title,
  initialCode,
  language = "react",
  onCodeChange,
  theme = "dark",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialCode: string;
  language?: string;
  onCodeChange?: (newCode: string) => void;
  theme?: "dark" | "light";
}) {
  const [code, setCode] = useState(initialCode);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LivePreviewLog[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "error" | "warn" | "info">("all");
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "console">("preview");
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [runtimeError, setRuntimeError] = useState<{ message: string; stack?: string } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Synchronize internal code if initialCode changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Create or refresh preview session on backend
  const startPreview = useCallback(async (codeToRun: string) => {
    try {
      setIsLoading(true);
      setRuntimeError(null);

      const res = await fetch("/api/preview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: codeToRun,
          language,
        }),
      });

      if (!res.ok) throw new Error("Failed to start preview session");

      const data = await res.json();
      setSessionId(data.session.id);
      setPreviewUrl(data.previewUrl);
      setIsRunning(true);

      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}`,
          level: "info",
          message: `Build complete · Runtime: ${data.session.runtime.toUpperCase()}`,
          source: "compiler",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setRuntimeError({ message: err.message });
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}`,
          level: "error",
          message: `Compilation error: ${err.message}`,
          source: "compiler",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [title, language]);

  useEffect(() => {
    if (isOpen && code) {
      startPreview(code);
    }
  }, [isOpen, startPreview]);

  // Listen to postMessage telemetry and errors from isolated preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;

      if (e.data.type === "PREVIEW_CONSOLE" && e.data.log) {
        setLogs((prev) => [
          ...prev,
          {
            id: `log_${Date.now()}_${Math.random()}`,
            level: e.data.log.level || "info",
            message: e.data.log.message,
            source: "console",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }

      if (e.data.type === "PREVIEW_ERROR" && e.data.error) {
        setRuntimeError({
          message: e.data.error.message,
          stack: e.data.error.stack,
        });
        setLogs((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            level: "error",
            message: e.data.error.message,
            source: "runtime",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }

      if (e.data.type === "PREVIEW_READY") {
        setIsLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRestart = () => {
    setLogs([]);
    startPreview(code);
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/preview/session?sessionId=${sessionId}`, { method: "DELETE" });
      setIsRunning(false);
      setLogs((prev) => [
        ...prev,
        {
          id: `stop_${Date.now()}`,
          level: "warn",
          message: "Preview execution paused by user",
          source: "system",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch {}
  };

  const handleRepairWithAI = async () => {
    if (!runtimeError && logs.filter((l) => l.level === "error").length === 0) return;
    const errMessage = runtimeError?.message || logs.find((l) => l.level === "error")?.message || "Unknown error";

    try {
      setIsRepairing(true);
      setRepairSuccessMsg(null);

      const res = await fetch("/api/preview/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: errMessage,
          stack: runtimeError?.stack,
          language,
          title,
        }),
      });

      if (!res.ok) throw new Error("AI repair request failed");

      const data = await res.json();
      if (data.success && data.repairedCode) {
        setCode(data.repairedCode);
        onCodeChange?.(data.repairedCode);
        setRepairSuccessMsg(data.explanation || "Repaired code successfully!");
        setRuntimeError(null);
        startPreview(data.repairedCode);
      }
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: `rep_err_${Date.now()}`,
          level: "error",
          message: `AI repair failed: ${err.message}`,
          source: "ai",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleCopyUrl = () => {
    if (!previewUrl) return;
    const fullUrl = window.location.origin + previewUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";

  // Filtered console logs
  const filteredLogs = logs.filter((l) => {
    if (logFilter === "all") return true;
    return l.level === logFilter;
  });

  return (
    <div
      className={cn(
        "fixed inset-0 z-[105] flex flex-col transition-colors duration-200",
        isFullscreen ? "p-0" : "p-2 sm:p-4 bg-black/70 backdrop-blur-md"
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={cn(
          "relative flex flex-col w-full h-full rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden",
          isDark
            ? "bg-[#080d1a] border-white/10 text-gray-100 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)]"
            : "bg-white border-gray-200 text-gray-900 shadow-xl"
        )}
      >
        {/* ── Toolbar Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-inherit bg-black/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
              <Play size={16} fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">
                  {title || "Interactive Live Preview"}
                </h3>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                  {language.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-semibold",
                    runtimeError
                      ? "text-rose-400"
                      : isRunning
                      ? "text-emerald-400"
                      : "text-gray-500"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      runtimeError
                        ? "bg-rose-400 animate-pulse"
                        : isRunning
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-gray-500"
                    )}
                  />
                  <span>{runtimeError ? "Error" : isRunning ? "Live Running" : "Stopped"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center: Device Viewport Controls */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
            <button
              onClick={() => setViewport("desktop")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                viewport === "desktop"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
              title="Desktop viewport (100% fluid)"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                viewport === "tablet"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
              title="Tablet viewport (768px)"
            >
              <Tablet size={14} />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                viewport === "mobile"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
              title="Mobile viewport (375px)"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Right: Actions (Zoom, Run/Stop, Fullscreen, Open Tab, Close) */}
          <div className="flex items-center gap-1.5">
            {/* Zoom */}
            <div className="hidden md:flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-xs text-gray-400">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="hover:text-white"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="w-9 text-center font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                className="hover:text-white"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Run / Stop */}
            <button
              onClick={isRunning ? handleStop : handleRestart}
              className={cn(
                "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
                isRunning
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30"
                  : "bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold"
              )}
            >
              {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              <span>{isRunning ? "Stop" : "Run"}</span>
            </button>

            <button
              onClick={handleRestart}
              className="p-1.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh preview"
            >
              <RotateCcw size={15} />
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Open in new window"
              >
                <ExternalLink size={15} />
              </a>
            )}

            <button
              onClick={handleCopyUrl}
              className="p-1.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Copy preview URL"
            >
              {copiedUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs (Preview / Code / Logs) ── */}
        <div className="flex items-center justify-between border-b border-inherit bg-black/20 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                activeTab === "preview"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Live Preview
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                activeTab === "code"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Source Code
            </button>
            <button
              onClick={() => setActiveTab("console")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all",
                activeTab === "console"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Terminal size={12} />
              <span>Diagnostics & Logs</span>
              {logs.filter((l) => l.level === "error").length > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {logs.filter((l) => l.level === "error").length}
                </span>
              )}
            </button>
          </div>

          {/* AI Auto-Repair Button */}
          {(runtimeError || logs.some((l) => l.level === "error")) && (
            <button
              onClick={handleRepairWithAI}
              disabled={isRepairing}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-violet-500/30 hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={13} className={isRepairing ? "animate-spin" : ""} />
              <span>{isRepairing ? "AI Debugging & Fixing…" : "✦ Fix Error with AI"}</span>
            </button>
          )}
        </div>

        {/* ── Main Canvas Viewport Area ── */}
        <div className="relative flex-1 bg-[#05070f] overflow-auto flex items-center justify-center p-4">
          {activeTab === "preview" && (
            <div
              className={cn(
                "relative transition-all duration-300 shadow-2xl flex flex-col overflow-hidden bg-white",
                viewport === "desktop"
                  ? "w-full h-full rounded-xl"
                  : viewport === "tablet"
                  ? "w-[768px] h-[95%] rounded-3xl border-8 border-gray-800"
                  : "w-[375px] h-[667px] rounded-[40px] border-[10px] border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              )}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {/* Mobile Speaker / Notch Bar */}
              {viewport === "mobile" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-gray-800 rounded-b-xl z-20" />
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 text-white">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                  <p className="mt-3 text-xs font-mono text-cyan-400">Compiling sandbox bundle…</p>
                </div>
              )}

              {/* Runtime Error Overlay */}
              {runtimeError && (
                <div className="absolute inset-x-4 top-4 z-20 rounded-xl border border-rose-500/30 bg-rose-950/90 p-4 text-xs text-rose-200 backdrop-blur-md shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <AlertTriangle size={16} />
                      <span>Runtime Error in Sandbox</span>
                    </div>
                    <button
                      onClick={() => setRuntimeError(null)}
                      className="text-rose-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-2 font-mono">{runtimeError.message}</p>
                  {runtimeError.stack && (
                    <pre className="mt-2 max-h-32 overflow-auto text-[10px] text-rose-300/80 bg-black/40 p-2 rounded">
                      {runtimeError.stack}
                    </pre>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleRepairWithAI}
                      disabled={isRepairing}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold px-3 py-1"
                    >
                      <Sparkles size={12} />
                      <span>Let AI Fix This</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Repair Success Notification */}
              {repairSuccessMsg && (
                <div className="absolute inset-x-4 top-4 z-20 rounded-xl border border-emerald-500/30 bg-emerald-950/90 p-3 text-xs text-emerald-200 backdrop-blur-md shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <span>{repairSuccessMsg}</span>
                  </div>
                  <button onClick={() => setRepairSuccessMsg(null)}>✕</button>
                </div>
              )}

              {/* Executable Sandboxed Iframe */}
              {previewUrl && (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  title={title || "Live Preview"}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                  className="w-full h-full border-0 bg-white"
                />
              )}
            </div>
          )}

          {/* Source Code View */}
          {activeTab === "code" && (
            <div className="w-full h-full overflow-auto">
              <CodeBlock language={language} value={code} isGenerating={false} />
            </div>
          )}

          {/* Console / Diagnostics View */}
          {activeTab === "console" && (
            <div className="w-full h-full flex flex-col rounded-xl border border-white/10 bg-[#060810] p-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-bold">Filter:</span>
                  {(["all", "error", "warn", "info"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilter(lvl)}
                      className={cn(
                        "rounded px-2 py-0.5 uppercase text-[10px] font-bold transition-all",
                        logFilter === lvl
                          ? "bg-cyan-500 text-black font-extrabold"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="text-gray-400 hover:text-white text-[11px]"
                >
                  Clear Logs
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-3 space-y-1.5">
                {filteredLogs.length === 0 ? (
                  <p className="text-gray-500 italic p-4 text-center">No logs recorded yet.</p>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "p-2 rounded flex items-start gap-2",
                        log.level === "error"
                          ? "bg-rose-950/30 text-rose-300 border-l-2 border-rose-500"
                          : log.level === "warn"
                          ? "bg-amber-950/30 text-amber-300 border-l-2 border-amber-500"
                          : "bg-white/[0.02] text-gray-300 border-l-2 border-cyan-500"
                      )}
                    >
                      <span className="text-gray-500 shrink-0 text-[10px]">[{log.timestamp}]</span>
                      <span className="uppercase text-[9px] font-bold px-1 rounded bg-black/40">
                        {log.level}
                      </span>
                      <span className="flex-1 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
