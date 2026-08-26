"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CircleDot, Loader2, AlertCircle } from "lucide-react";
import { TaskTimelineStep } from "@/lib/orchestrator/ai-orchestrator";

export default function TaskTimeline({ steps }: { steps: TaskTimelineStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md text-xs font-sans select-none my-2 max-w-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Execution Progress</span>
        <span className="text-[9px] font-mono text-cyan-400">
          {steps.filter((s) => s.status === "completed").length}/{steps.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id || idx}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            {step.status === "completed" ? (
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            ) : step.status === "running" ? (
              <Loader2 size={13} className="text-cyan-400 animate-spin shrink-0" />
            ) : step.status === "failed" ? (
              <AlertCircle size={13} className="text-rose-400 shrink-0" />
            ) : (
              <CircleDot size={13} className="text-gray-600 shrink-0" />
            )}

            <span
              className={`text-[11px] leading-tight ${
                step.status === "completed"
                  ? "text-gray-300 font-medium line-through opacity-70"
                  : step.status === "running"
                  ? "text-cyan-300 font-bold"
                  : "text-gray-500 font-normal"
              }`}
            >
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
