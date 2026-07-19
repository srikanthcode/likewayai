"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ScanLine, Search, Layout, MousePointer2, CheckCircle2,
  ChevronRight, X, Maximize2, Minimize2, Loader2, Brain
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BrowserStage = 
  | "idle"
  | "launching"
  | "loading"
  | "scanning"
  | "reading"
  | "detecting"
  | "finding"
  | "understanding"
  | "planning"
  | "acting"
  | "verifying"
  | "success"
  | "error";

interface BrowserOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stage: BrowserStage;
  currentAction?: string;
  theme?: "light" | "dark";
}

const STAGE_CONFIG: Record<BrowserStage, { text: string; icon: any; color: string }> = {
  idle:         { text: "Waiting...",              icon: Globe,          color: "text-gray-400"   },
  launching:    { text: "Launching Browser...",    icon: Globe,          color: "text-blue-400"   },
  loading:      { text: "Loading Page...",         icon: Loader2,        color: "text-blue-400"   },
  scanning:     { text: "Scanning Page...",        icon: ScanLine,       color: "text-purple-400" },
  reading:      { text: "Reading DOM...",          icon: Layout,         color: "text-purple-400" },
  detecting:    { text: "Detecting Inputs...",     icon: Search,         color: "text-cyan-400"   },
  finding:      { text: "Finding Elements...",     icon: Search,         color: "text-cyan-400"   },
  understanding:{ text: "Understanding Layout...", icon: Layout,         color: "text-indigo-400" },
  planning:     { text: "Planning Next Action...", icon: Brain,          color: "text-orange-400" },
  acting:       { text: "Executing Action...",     icon: MousePointer2,  color: "text-pink-400"   },
  verifying:    { text: "Verifying Result...",     icon: ScanLine,       color: "text-teal-400"   },
  success:      { text: "Task Completed",          icon: CheckCircle2,   color: "text-green-500"  },
  error:        { text: "Execution Error",         icon: X,              color: "text-red-500"    },
};

export default function BrowserOverlay({ isOpen, onClose, stage, currentAction, theme = "dark" }: BrowserOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.idle;
  const Icon = config.icon;

  const isDark = theme === "dark";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
        className={cn(
          "fixed z-50 transition-all duration-300 shadow-2xl",
          isMinimized 
            ? "bottom-4 right-4 w-64 rounded-2xl" 
            : "bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg rounded-3xl",
          isDark ? "bg-[#1c2128]/95 border border-white/10 backdrop-blur-xl" : "bg-white/95 border border-black/10 backdrop-blur-xl"
        )}
      >
        <div className="flex flex-col overflow-hidden rounded-inherit">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-gray-300" : "text-gray-600")}>
                Browser Agent
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", isDark ? "text-gray-400" : "text-gray-500")}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button 
                onClick={onClose}
                className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", isDark ? "text-gray-400" : "text-gray-500")}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={cn("relative p-6", isMinimized && "hidden")}>
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                isDark ? "bg-white/5" : "bg-black/5"
              )}>
                <motion.div
                  key={stage}
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className={config.color}
                >
                  <Icon size={24} className={stage === "loading" ? "animate-spin" : ""} />
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <motion.h3 
                  key={stage + "-text"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("text-lg font-bold truncate", isDark ? "text-white" : "text-gray-900")}
                >
                  {config.text}
                </motion.h3>
                <AnimatePresence mode="wait">
                  {currentAction && (
                    <motion.p
                      key={currentAction}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("text-xs truncate mt-1", isDark ? "text-gray-400" : "text-gray-500")}
                    >
                      {currentAction}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Scanning Animation */}
            {stage !== "success" && stage !== "error" && stage !== "idle" && (
              <div className="relative h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 w-full mt-4">
                <motion.div
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              </div>
            )}
            
            {/* Action History / Next Steps visually mocked as continuous execution */}
            <div className="mt-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-gray-500">
              <span className="flex items-center gap-1"><ScanLine size={10} /> Observe</span>
              <ChevronRight size={10} className="opacity-30" />
              <span className="flex items-center gap-1"><Brain size={10} /> Think</span>
              <ChevronRight size={10} className="opacity-30" />
              <span className="flex items-center gap-1"><MousePointer2 size={10} /> Act</span>
              <ChevronRight size={10} className="opacity-30" />
              <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Verify</span>
            </div>
          </div>
          
          {/* Minimized View */}
          {isMinimized && (
            <div className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", isDark ? "bg-white/5" : "bg-black/5")}>
                 <Icon size={16} className={cn(config.color, stage === "loading" && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-gray-900")}>
                  {config.text}
                </p>
                <p className={cn("text-[10px] truncate", isDark ? "text-gray-400" : "text-gray-500")}>
                  {currentAction || "Processing..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
