"use client";

import React, { useState } from "react";
import { CheckSquare, Square, Target, Flag, Layers, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanBlockProps {
  title?: string;
  content: string;
  theme?: "dark" | "light";
}

interface Milestone {
  text: string;
  checked: boolean;
}

interface Phase {
  name: string;
  milestones: Milestone[];
}

export default function PlanBlock({
  title = "Project Execution Plan",
  content,
  theme = "dark",
}: PlanBlockProps) {
  const [copied, setCopied] = useState(false);

  // Parse lines into Goal and Phases
  const lines = content.split("\n");
  let goal = "";
  const initialPhases: Phase[] = [];
  let currentPhase: Phase | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().startsWith("goal:")) {
      goal = trimmed.slice(5).trim();
      continue;
    }

    // Match "Phase 1: ...", "Phase A: ...", "Sprint 1: ...", "Week 1: ...", "## Phase ..."
    const phaseMatch = /^(?:#+\s*)?(phase|sprint|stage|step|week|milestone)\s*([0-9a-zA-Z]+)?:?\s*(.*)$/i.exec(trimmed);
    if (phaseMatch && !trimmed.startsWith("- [")) {
      if (currentPhase) initialPhases.push(currentPhase);
      const phaseTitle = phaseMatch[3] || `${phaseMatch[1]} ${phaseMatch[2] || ""}`.trim();
      currentPhase = {
        name: phaseTitle,
        milestones: [],
      };
      continue;
    }

    // Match checklist items "- [x] ...", "- [ ] ...", or "* [x]"
    const itemMatch = /^[-*]\s*\[([ xX])\]\s*(.*)$/.exec(trimmed);
    if (itemMatch) {
      if (!currentPhase) {
        currentPhase = { name: "Milestones", milestones: [] };
      }
      currentPhase.milestones.push({
        checked: itemMatch[1].toLowerCase() === "x",
        text: itemMatch[2],
      });
      continue;
    }

    // Match regular bullet items "- ..."
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!currentPhase) {
        currentPhase = { name: "Action Items", milestones: [] };
      }
      currentPhase.milestones.push({
        checked: false,
        text: trimmed.slice(2).trim(),
      });
      continue;
    }
  }

  if (currentPhase) {
    initialPhases.push(currentPhase);
  }

  const [phases, setPhases] = useState<Phase[]>(
    initialPhases.length > 0 ? initialPhases : [{ name: "Implementation Steps", milestones: [{ text: content.trim(), checked: false }] }]
  );

  const toggleItem = (phaseIdx: number, itemIdx: number) => {
    setPhases((prev) => {
      const updated = [...prev];
      const p = { ...updated[phaseIdx] };
      const m = [...p.milestones];
      m[itemIdx] = { ...m[itemIdx], checked: !m[itemIdx].checked };
      p.milestones = m;
      updated[phaseIdx] = p;
      return updated;
    });
  };

  const totalItems = phases.reduce((acc, p) => acc + p.milestones.length, 0);
  const completedItems = phases.reduce(
    (acc, p) => acc + p.milestones.filter((m) => m.checked).length,
    0
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "my-4 rounded-xl border overflow-hidden shadow-lg transition-all",
        theme === "dark"
          ? "border-emerald-500/30 bg-[#0c1410] text-gray-200"
          : "border-emerald-500/40 bg-emerald-50/20 text-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b",
          theme === "dark"
            ? "bg-emerald-950/20 border-emerald-500/20"
            : "bg-emerald-100/40 border-emerald-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400">
            <Layers size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
            Plan & Roadmap
          </span>
          <span className="text-xs font-medium opacity-60">|</span>
          <span className="text-xs font-semibold">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {totalItems > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-400">
                {completedItems}/{totalItems} ({progressPercent}%)
              </span>
              <div className="w-16 h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm",
              copied
                ? "bg-green-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            )}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Goal Callout */}
      {goal && (
        <div
          className={cn(
            "mx-4 mt-3 p-3 rounded-lg flex items-start gap-2.5 border",
            theme === "dark"
              ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          )}
        >
          <Target className="text-emerald-400 shrink-0 mt-0.5" size={16} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Primary Objective
            </div>
            <div className="text-xs font-medium mt-0.5">{goal}</div>
          </div>
        </div>
      )}

      {/* Phases */}
      <div className="p-4 space-y-4">
        {phases.map((phase, pIdx) => {
          const phaseComplete =
            phase.milestones.length > 0 && phase.milestones.every((m) => m.checked);

          return (
            <div
              key={pIdx}
              className={cn(
                "rounded-lg p-3.5 border transition-all",
                theme === "dark"
                  ? "bg-black/20 border-white/5"
                  : "bg-white/60 border-black/5"
              )}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Phase {pIdx + 1}: {phase.name}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    phaseComplete
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-black/10 dark:bg-white/10 text-gray-400"
                  )}
                >
                  {phaseComplete ? "Completed" : "In Progress"}
                </span>
              </div>

              <div className="space-y-1.5 pl-1">
                {phase.milestones.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    onClick={() => toggleItem(pIdx, iIdx)}
                    className="flex items-start gap-2 w-full text-left py-1 group cursor-pointer transition-colors"
                  >
                    {item.checked ? (
                      <CheckSquare
                        size={15}
                        className="text-emerald-400 shrink-0 mt-0.5 group-hover:text-emerald-300"
                      />
                    ) : (
                      <Square
                        size={15}
                        className="text-gray-400 shrink-0 mt-0.5 group-hover:text-emerald-400"
                      />
                    )}
                    <span
                      className={cn(
                        "text-xs leading-relaxed transition-all",
                        item.checked
                          ? "line-through opacity-50"
                          : "text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
