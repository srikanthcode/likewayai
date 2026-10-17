"use client";

import React, { useState } from "react";
import { Bug, Search, Wrench, CheckCircle, Terminal, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebugWorkflowProps {
  error?: string;
  rootCause?: string;
  solution?: string;
  code?: string;
  language?: string;
  verification?: string;
  theme?: "dark" | "light";
}

export default function DebugWorkflowBlock({
  error,
  rootCause,
  solution,
  code,
  language = "typescript",
  verification,
  theme = "dark",
}: DebugWorkflowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "my-4 rounded-xl border overflow-hidden shadow-lg transition-all",
        theme === "dark"
          ? "border-rose-500/30 bg-[#120e10] text-gray-200"
          : "border-rose-500/40 bg-rose-50/20 text-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          theme === "dark"
            ? "bg-rose-950/20 border-rose-500/20"
            : "bg-rose-100/40 border-rose-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20 text-rose-400">
            <Bug size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
            Debug Workflow
          </span>
          <span className="text-xs font-medium opacity-60">|</span>
          <span className="text-xs font-semibold">Root Cause & Verified Fix</span>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* 1. Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <Bug className="text-rose-400 shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                The Issue
              </div>
              <div className="text-xs font-medium mt-0.5 text-gray-200">{error}</div>
            </div>
          </div>
        )}

        {/* 2. Root Cause */}
        {rootCause && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Search className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Root Cause
              </div>
              <div className="text-xs font-medium mt-0.5 text-gray-200">{rootCause}</div>
            </div>
          </div>
        )}

        {/* 3. Solution */}
        {solution && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Wrench className="text-cyan-400 shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Solution
              </div>
              <div className="text-xs font-medium mt-0.5 text-gray-200">{solution}</div>
            </div>
          </div>
        )}

        {/* 4. Corrected Code */}
        {code && (
          <div className="rounded-lg border border-white/10 overflow-hidden bg-black/40">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5 text-[11px]">
              <span className="font-mono text-gray-400">Fix Implementation ({language})</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-white"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300">
              <code>{code}</code>
            </pre>
          </div>
        )}

        {/* 5. Verification */}
        {verification && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Verification Command
              </div>
              <div className="text-xs font-mono font-medium mt-1 px-2 py-1 rounded bg-black/30 inline-block text-emerald-200">
                {verification}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
