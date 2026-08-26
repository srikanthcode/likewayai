"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Square,
  Cpu,
  Brain,
  CheckCircle2,
  Volume2,
  RefreshCw,
  Lock,
  MessageSquare,
  Radio,
  Sliders,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";

export interface VoiceCharacterInfo {
  id: string;
  name: string;
  gender: string;
  desc: string;
}

export interface AppLaunchInfo {
  name: string;
  url: string;
  status?: string;
}

interface VoiceAssistantProps {
  isOpen: boolean;
  status: "idle" | "listening" | "thinking" | "acting" | "speaking";
  transcript: string;
  responseText: string;
  character?: VoiceCharacterInfo;
  availableCharacters?: VoiceCharacterInfo[];
  activeAppLaunch?: AppLaunchInfo | null;
  onDismissLaunch?: () => void;
  onSelectCharacter?: (id: string) => void;
  onToggleListening: () => void;
  onInterrupt: () => void;
  onClose: () => void;
}

export default function VoiceAssistant({
  isOpen,
  status,
  transcript,
  responseText,
  character = {
    id: "aria",
    name: "Aria",
    gender: "female",
    desc: "Warm & Friendly",
  },
  availableCharacters = [
    { id: "aria", name: "Aria", gender: "female", desc: "Warm & Friendly" },
    { id: "nova", name: "Nova", gender: "female", desc: "Clear & Professional" },
    { id: "echo", name: "Echo", gender: "male", desc: "Deep & Confident" },
    { id: "spark", name: "Spark", gender: "female", desc: "Bright & Energetic" },
    { id: "atlas", name: "Atlas", gender: "male", desc: "Calm & Authoritative" },
    { id: "luna", name: "Luna", gender: "female", desc: "Soft & Soothing" },
  ],
  activeAppLaunch,
  onDismissLaunch,
  onSelectCharacter,
  onToggleListening,
  onInterrupt,
  onClose,
}: VoiceAssistantProps) {
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [mobileTab, setMobileTab] = useState<"assistant" | "telemetry">("assistant");

  // Auto-start listening on mount
  useEffect(() => {
    if (isOpen && status === "idle") {
      onToggleListening();
    }
  }, [isOpen, status, onToggleListening]);

  if (!isOpen) return null;

  const isFemale = character.gender === "female";
  const isListening = status === "listening" || status === "idle";
  const isThinking = status === "thinking";
  const isActing = status === "acting";
  const isSpeaking = status === "speaking";

  const avatarSrc = isFemale ? "/avatars/avatar_female.jpg" : "/avatars/avatar_male.jpg";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col bg-[#030712] text-white overflow-hidden select-none font-sans"
      >
        {/* Ambient Chromatic Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />
          <div
            className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] lg:w-[850px] h-[450px] lg:h-[550px] rounded-full blur-[140px] transition-colors duration-1000 ${
              isFemale
                ? isSpeaking
                  ? "bg-pink-600/20"
                  : isThinking
                  ? "bg-purple-600/25"
                  : "bg-cyan-600/20"
                : isSpeaking
                ? "bg-amber-600/20"
                : isThinking
                ? "bg-indigo-600/25"
                : "bg-blue-600/20"
            }`}
          />
        </div>

        {/* Top Header Bar */}
        <header className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
            <span className="text-xs font-bold tracking-wider text-gray-300 uppercase">
              Voice Assistant
            </span>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center p-0.5 rounded-xl bg-white/10 border border-white/10">
            <button
              type="button"
              onClick={() => setMobileTab("assistant")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                mobileTab === "assistant" ? "bg-cyan-500/30 text-white shadow-sm" : "text-gray-400"
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("telemetry")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                mobileTab === "telemetry" ? "bg-cyan-500/30 text-white shadow-sm" : "text-gray-400"
              }`}
            >
              Stats
            </button>
          </div>

          {/* Quick Voice Persona Switcher & Close */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVoicePicker((p) => !p)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] sm:text-xs font-semibold text-gray-200 transition-all cursor-pointer shadow-md"
              >
                <Radio size={13} className="text-cyan-400 shrink-0" />
                <span>{character.name}</span>
                <RefreshCw size={11} className="text-gray-400" />
              </button>

              <AnimatePresence>
                {showVoicePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-zinc-950/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                      Select Persona
                    </p>
                    {availableCharacters.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onSelectCharacter?.(c.id);
                          setShowVoicePicker(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                          character.id === c.id
                            ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border border-cyan-500/40 text-white"
                            : "hover:bg-white/10 text-gray-300"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5 capitalize">({c.gender})</span>
                        </div>
                        {character.id === c.id && <CheckCircle2 size={13} className="text-cyan-400" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 hover:text-rose-400 active:scale-95 transition-all cursor-pointer border border-white/10"
              title="Close Voice Assistant"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Main Command Dashboard */}
        <main className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* ════════════════════════════════════════════════════════════════════
              LEFT COLUMN (Hidden on mobile if tab != telemetry)
              ════════════════════════════════════════════════════════════════════ */}
          <section
            className={`lg:col-span-3 flex flex-col gap-3.5 ${
              mobileTab === "telemetry" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Real-time Listening Wave Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isListening ? "bg-cyan-400 animate-ping" : isSpeaking ? "bg-orange-400" : "bg-purple-400"
                    }`}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                    {isListening ? "Listening..." : isThinking ? "Processing..." : isActing ? "Executing..." : "Speaking..."}
                  </span>
                </div>
                <Volume2 size={13} className="text-gray-400" />
              </div>

              {/* Soundwave Spectrum */}
              <div className="flex items-center justify-center gap-1 h-8 px-2 bg-black/40 rounded-xl border border-white/5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isSpeaking
                        ? [4, 18 + ((i * 5) % 12), 6, 24, 4]
                        : isListening
                        ? [3, 10 + ((i * 3) % 6), 4, 14, 3]
                        : [2, 4, 2],
                    }}
                    transition={{
                      duration: isSpeaking ? 0.6 : 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (i * 0.04) % 0.5,
                    }}
                    className={`w-1 rounded-full ${
                      isSpeaking
                        ? "bg-gradient-to-t from-orange-500 to-amber-300"
                        : isThinking
                        ? "bg-gradient-to-t from-purple-500 to-pink-400"
                        : "bg-gradient-to-t from-cyan-400 to-blue-500"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 3D Neural Brain Activity Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Brain size={15} className="text-purple-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">
                    Neural Brain Activity
                  </span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400">99.8%</span>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-purple-500/20 bg-black/60 aspect-video flex items-center justify-center">
                <img
                  src="/avatars/neural_brain.jpg"
                  alt="Neural Brain"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] text-gray-300 font-mono">
                  <span>SYNAPSE: ACTIVE</span>
                  <span className="text-cyan-400 animate-pulse">● LIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] font-medium text-gray-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  <span>Language</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                  <span>Memory</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                  <span>Reasoning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]" />
                  <span>Understanding</span>
                </div>
              </div>
            </div>

            {/* Core Capabilities */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Capabilities
              </span>
              <ul className="flex flex-col gap-1.5 text-[11px] text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                  <span>Understand natural speech</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                  <span>Real-time web knowledge</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                  <span>Autonomous web task execution</span>
                </li>
              </ul>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              CENTER COLUMN: AI Avatar (Visible on Mobile Live Tab & Desktop)
              ════════════════════════════════════════════════════════════════════ */}
          <section
            className={`lg:col-span-6 flex flex-col items-center justify-center relative ${
              mobileTab === "assistant" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="relative w-full max-w-sm sm:max-w-md h-[260px] sm:h-[360px] lg:h-[430px] rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-zinc-900/80 to-black shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center justify-end group">
              <img
                src={avatarSrc}
                alt={`${character.name} AI Avatar`}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />

              {/* Shade Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

              {/* Chest Pulse Core */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.25, 1] : isListening ? [1, 1.1, 1] : [1, 1.05, 1],
                  opacity: isSpeaking ? [0.8, 1, 0.8] : 0.6,
                }}
                transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-20 sm:bottom-24 w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-cyan-400/40 blur-lg pointer-events-none"
              />

              {/* Reactor Core Button */}
              <button
                type="button"
                onClick={onInterrupt}
                className="absolute bottom-20 sm:bottom-24 w-11 sm:w-12 h-11 sm:h-12 rounded-full border-2 border-cyan-400 bg-cyan-500/20 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all z-30"
                title="Tap to interrupt or speak"
              >
                <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
              </button>

              {/* Chest Audio Waveform Ribbon */}
              <div className="absolute bottom-8 sm:bottom-10 left-4 right-4 z-20 flex flex-col items-center gap-1.5">
                <div className="flex items-center justify-center gap-1 w-full h-6 sm:h-7">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isSpeaking
                          ? [3, 14 + ((i * 7) % 12), 5, 20, 3]
                          : isListening
                          ? [2, 6 + ((i * 3) % 6), 3, 10, 2]
                          : [2, 3, 2],
                      }}
                      transition={{
                        duration: isSpeaking ? 0.5 : 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i * 0.03) % 0.5,
                      }}
                      className={`w-1 rounded-full ${
                        isFemale
                          ? "bg-gradient-to-t from-cyan-400 to-pink-400"
                          : "bg-gradient-to-t from-cyan-400 to-blue-500"
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-[11px] font-bold text-white uppercase tracking-wider drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                    {isListening ? "Listening Actively..." : isThinking ? "Thinking..." : isActing ? "Executing Task..." : "Speaking..."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Live Conversation Bubbles
              ════════════════════════════════════════════════════════════════════ */}
          <section
            className={`lg:col-span-3 flex flex-col gap-3.5 ${
              mobileTab === "assistant" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Live Conversation Stream Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2.5 flex-1 min-h-[160px] sm:min-h-[200px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-cyan-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">
                    Live Stream
                  </span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400">● LIVE</span>
              </div>

              {/* User Voice & AI Message Bubbles */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[160px] sm:max-h-[190px] pr-1">
                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="self-end max-w-[90%] p-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600/60 to-purple-600/60 border border-blue-400/30 text-xs text-white shadow-md leading-relaxed"
                  >
                    <p className="font-semibold text-[9px] text-blue-200 mb-0.5">You (Voice)</p>
                    <p>{transcript}</p>
                  </motion.div>
                )}

                {responseText ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="self-start max-w-[95%] p-2.5 rounded-2xl rounded-tl-sm bg-zinc-800/80 border border-white/10 text-xs text-gray-200 shadow-md leading-relaxed"
                  >
                    <p className="font-semibold text-[9px] text-cyan-400 mb-0.5">{character.name} (AI)</p>
                    <p>{responseText}</p>
                  </motion.div>
                ) : !transcript ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-4 text-gray-500">
                    <Radio size={18} className="text-gray-600 mb-1 animate-pulse" />
                    <p className="text-[11px] font-medium">Speak naturally into your microphone</p>
                    <p className="text-[9px] text-gray-600 mt-0.5">Your speech will appear here in real time</p>
                  </div>
                ) : null}
              </div>

              {/* Active Application / Browser Launch Action Card */}
              {activeAppLaunch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="mt-2 p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 via-cyan-950/60 to-blue-950/70 border border-emerald-500/40 shadow-lg flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[11px] font-bold text-emerald-300">
                        {activeAppLaunch.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/80">
                      {activeAppLaunch.status || "Launched"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 truncate font-mono">
                    {activeAppLaunch.url}
                  </p>
                  <a
                    href={activeAppLaunch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 cursor-pointer"
                  >
                    <span>Open {activeAppLaunch.name}</span>
                    <ExternalLink size={12} />
                  </a>
                </motion.div>
              )}
            </div>

            {/* Execution Pipeline Checklist */}
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Pipeline
              </span>
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-cyan-400" />
                    <span>Speech Input</span>
                  </div>
                  <span className="text-[9px] text-cyan-400 font-mono">100%</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      size={12}
                      className={isThinking || isActing || isSpeaking ? "text-cyan-400" : "text-gray-600"}
                    />
                    <span>Intent Analysis</span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono">{isThinking ? "RUNNING" : "READY"}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className={isActing ? "text-emerald-400 animate-pulse" : "text-gray-600"} />
                    <span>Web Action</span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono">{isActing ? "ACTIVE" : "STANDBY"}</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Control Dock */}
        <footer className="relative z-50 px-4 sm:px-8 py-3 sm:py-4 border-t border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400">
            <span className="font-mono text-cyan-400">Voice Assistant</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onInterrupt}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg backdrop-blur-md ${
                isSpeaking
                  ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30"
                  : "bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <Square size={12} fill="currentColor" />
              {isSpeaking ? "Interrupt" : "Pause"}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-400">
            <Lock size={11} className="text-emerald-400" />
            <span className="hidden sm:inline font-medium">Secure • LikeWay Neural Core</span>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
