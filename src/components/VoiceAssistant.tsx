"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Square,
  Mic,
  MicOff,
  Cpu,
  Brain,
  Layers,
  Sparkles,
  CheckCircle2,
  CircleDot,
  Radio,
  Volume2,
  RefreshCw,
  Lock,
  MessageSquare,
  Sliders,
  Terminal,
} from "lucide-react";

export interface VoiceCharacterInfo {
  id: string;
  name: string;
  gender: string;
  desc: string;
  emoji?: string;
}

interface VoiceAssistantProps {
  isOpen: boolean;
  status: "idle" | "listening" | "thinking" | "acting" | "speaking";
  transcript: string;
  responseText: string;
  character?: VoiceCharacterInfo;
  availableCharacters?: VoiceCharacterInfo[];
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
  onSelectCharacter,
  onToggleListening,
  onInterrupt,
  onClose,
}: VoiceAssistantProps) {
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "logs">("visual");

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
        {/* Ambient Chromatic Grid & Lighting */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div
            className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full blur-[160px] transition-colors duration-1000 ${
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
        <header className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
            <span className="text-xs font-bold tracking-wider text-gray-300 uppercase">
              Voice Assistant
            </span>
          </div>

          {/* Quick Voice Persona Switcher & Controls */}
          <div className="flex items-center gap-3">
            {/* Voice Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVoicePicker((p) => !p)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-gray-200 transition-all cursor-pointer shadow-md"
              >
                <Radio size={14} className="text-cyan-400" />
                <span>Voice: {character.name} ({character.gender})</span>
                <RefreshCw size={12} className="text-gray-400 ml-1" />
              </button>

              <AnimatePresence>
                {showVoicePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                      Choose Neural Persona
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
                          <p className="text-[10px] text-gray-400 mt-0.5">{c.desc}</p>
                        </div>
                        {character.id === c.id && <CheckCircle2 size={14} className="text-cyan-400" />}
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
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 hover:text-rose-400 active:scale-95 transition-all cursor-pointer border border-white/10"
              title="Close Voice Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main 3-Column Command Dashboard */}
        <main className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* ════════════════════════════════════════════════════════════════════
              LEFT COLUMN: Neural Activity, Telemetry & Capabilities
              ════════════════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-3 flex flex-col gap-4">
            {/* Real-time Listening Wave Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isListening ? "bg-cyan-400 animate-ping" : isSpeaking ? "bg-orange-400" : "bg-purple-400"}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    {isListening ? "Listening..." : isThinking ? "Processing..." : isActing ? "Executing..." : "Speaking..."}
                  </span>
                </div>
                <Volume2 size={14} className="text-gray-400" />
              </div>

              {/* Dynamic Soundwave Spectrum */}
              <div className="flex items-center justify-center gap-1 h-10 px-2 bg-black/40 rounded-xl border border-white/5">
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isSpeaking
                        ? [6, 22 + ((i * 5) % 14), 8, 30, 6]
                        : isListening
                        ? [4, 12 + ((i * 3) % 8), 5, 18, 4]
                        : [3, 6, 3],
                    }}
                    transition={{
                      duration: isSpeaking ? 0.6 : 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (i * 0.04) % 0.6,
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
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                    Neural Network Activity
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">99.8% ACC</span>
              </div>

              {/* 3D Holographic Brain Image */}
              <div className="relative rounded-xl overflow-hidden border border-purple-500/20 bg-black/60 aspect-video flex items-center justify-center group">
                <img
                  src="/avatars/neural_brain.jpg"
                  alt="3D Neural Network Brain"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-gray-300 font-mono">
                  <span>SYNAPSE: ACTIVE</span>
                  <span className="text-cyan-400 animate-pulse">● LIVE</span>
                </div>
              </div>

              {/* Neural Synaptic Channels */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-medium text-gray-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  <span>Language</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                  <span>Memory</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                  <span>Reasoning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]" />
                  <span>Understanding</span>
                </div>
              </div>
            </div>

            {/* AI Capabilities Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Core Capabilities
              </span>
              <ul className="flex flex-col gap-2 text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                  <span>Understand natural speech</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                  <span>Real-time web knowledge</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                  <span>Autonomous web task execution</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                  <span>Conversational Gemini intelligence</span>
                </li>
              </ul>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              CENTER COLUMN: Photorealistic AI Avatar & Chest Neural Core
              ════════════════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[460px]">
            {/* Avatar Frame with Cybernetic Lighting */}
            <div className="relative w-full max-w-md h-[460px] rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-zinc-900/80 to-black shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center justify-end group">
              {/* Photorealistic AI Avatar Image (Female or Male) */}
              <img
                src={avatarSrc}
                alt={`${character.name} AI Avatar`}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />

              {/* Gradient Shade Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

              {/* Chest Neural Core Glow */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.25, 1] : isListening ? [1, 1.1, 1] : [1, 1.05, 1],
                  opacity: isSpeaking ? [0.8, 1, 0.8] : 0.6,
                }}
                transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-28 w-16 h-16 rounded-full bg-cyan-400/40 blur-xl pointer-events-none"
              />

              {/* Central Chest Reactor Pulse Button (Click to Interrupt/Listen) */}
              <button
                type="button"
                onClick={onInterrupt}
                className="absolute bottom-28 w-14 h-14 rounded-full border-2 border-cyan-400 bg-cyan-500/20 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:scale-110 active:scale-95 transition-all z-30"
                title="Tap to interrupt or speak"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-pulse" />
              </button>

              {/* Chest Frequency Wave Ribbon */}
              <div className="absolute bottom-16 left-6 right-6 z-20 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1 w-full h-8">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isSpeaking
                          ? [4, 18 + ((i * 7) % 14), 6, 26, 4]
                          : isListening
                          ? [3, 8 + ((i * 3) % 8), 4, 12, 3]
                          : [2, 4, 2],
                      }}
                      transition={{
                        duration: isSpeaking ? 0.5 : 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i * 0.03) % 0.5,
                      }}
                      className={`w-1 rounded-full ${
                        isFemale
                          ? "bg-gradient-to-t from-cyan-400 to-pink-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                          : "bg-gradient-to-t from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      }`}
                    />
                  ))}
                </div>

                {/* Subtitle / Processing status */}
                <div className="text-center">
                  <p className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                    {isListening ? "Listening Actively..." : isThinking ? "Thinking..." : isActing ? "Executing Task..." : "Speaking..."}
                  </p>
                  <p className="text-[10px] text-gray-300 font-medium drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                    {character.name} is ready for continuous conversation
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Real-Time Conversation Cards & Telemetry
              ════════════════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-3 flex flex-col gap-4">
            {/* Live Conversation Stream Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-3 flex-1 min-h-[220px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                    Live Conversation
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">REALTIME</span>
              </div>

              {/* Live Transcript / Assistant Message Bubbles */}
              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[190px] pr-1">
                {/* User Voice Bubble */}
                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="self-end max-w-[90%] p-3 rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600/60 to-purple-600/60 border border-blue-400/30 text-xs text-white shadow-md leading-relaxed"
                  >
                    <p className="font-semibold text-[10px] text-blue-200 mb-0.5">You (Voice)</p>
                    <p>{transcript}</p>
                  </motion.div>
                )}

                {/* AI Assistant Spoken Bubble */}
                {responseText ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="self-start max-w-[95%] p-3 rounded-2xl rounded-tl-sm bg-zinc-800/80 border border-white/10 text-xs text-gray-200 shadow-md leading-relaxed"
                  >
                    <p className="font-semibold text-[10px] text-cyan-400 mb-0.5">{character.name} (AI)</p>
                    <p>{responseText}</p>
                  </motion.div>
                ) : !transcript ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-500">
                    <Radio size={22} className="text-gray-600 mb-2 animate-pulse" />
                    <p className="text-xs font-medium">Speak naturally into your microphone</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Voice queries will appear here in real time</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Live Task & Execution Pipeline Checklist */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Live Execution Pipeline
              </span>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-cyan-400" />
                    <span>Understanding speech</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">100%</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={isThinking || isActing || isSpeaking ? "text-cyan-400" : "text-gray-600"} />
                    <span>Analyzing intent</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{isThinking ? "RUNNING" : "READY"}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={isActing ? "text-emerald-400 animate-pulse" : "text-gray-600"} />
                    <span>Executing tools / browser</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{isActing ? "ACTIVE" : "STANDBY"}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={isSpeaking ? "text-orange-400 animate-pulse" : "text-gray-600"} />
                    <span>Neural speech synthesis</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{isSpeaking ? "OUTPUT" : "STANDBY"}</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Control Dock & Floating Bar */}
        <footer className="relative z-50 px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="font-mono text-cyan-400">Voice Assistant</span>
          </div>

          {/* Central Action Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onInterrupt}
              className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg backdrop-blur-md ${
                isSpeaking
                  ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30"
                  : "bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <Square size={13} fill="currentColor" />
              {isSpeaking ? "Interrupt Speech" : "Pause"}
            </button>
          </div>

          {/* Right Security Badge */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Lock size={12} className="text-emerald-400" />
            <span className="hidden sm:inline font-medium">Secure • Private • Gemini Core</span>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
