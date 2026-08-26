"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Square, Sparkles } from "lucide-react";

interface VoiceAssistantProps {
  isOpen: boolean;
  status: "idle" | "listening" | "thinking" | "acting" | "speaking";
  transcript: string;
  responseText: string;
  onToggleListening: () => void;
  onInterrupt: () => void;
  onClose: () => void;
}

export default function VoiceAssistant({
  isOpen,
  status,
  transcript,
  responseText,
  onToggleListening,
  onInterrupt,
  onClose,
}: VoiceAssistantProps) {
  // Auto-start listening as soon as VoiceAssistant opens
  useEffect(() => {
    if (isOpen && status === "idle") {
      onToggleListening();
    }
  }, [isOpen, status, onToggleListening]);

  if (!isOpen) return null;

  const isListening = status === "listening" || status === "idle";
  const isThinking = status === "thinking";
  const isActing = status === "acting";
  const isSpeaking = status === "speaking";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#07090e] text-white overflow-hidden select-none"
      >
        {/* Dynamic Background Aura Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              scale: isListening ? [1, 1.25, 1] : isSpeaking ? [1.1, 1.35, 1.1] : [1, 1.1, 1],
              opacity: isListening ? [0.25, 0.45, 0.25] : isSpeaking ? [0.4, 0.6, 0.4] : 0.2,
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[140px] transition-colors duration-1000 ${
              isListening
                ? "bg-gradient-to-tr from-cyan-500/30 via-blue-600/30 to-purple-600/20"
                : isThinking
                ? "bg-gradient-to-tr from-violet-600/35 via-fuchsia-600/30 to-indigo-600/30"
                : isActing
                ? "bg-gradient-to-tr from-emerald-500/35 via-teal-500/30 to-cyan-500/30"
                : isSpeaking
                ? "bg-gradient-to-tr from-amber-500/30 via-rose-500/30 to-orange-500/25"
                : "bg-cyan-500/20"
            }`}
          />
        </div>

        {/* Top Header Controls */}
        <div className="absolute top-6 left-0 right-0 px-8 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
              Gemini Live Voice
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
            title="Close voice assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <motion.span
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[11px] font-black uppercase tracking-[0.25em] px-6 py-2 rounded-full border backdrop-blur-md transition-all shadow-lg ${
              isListening
                ? "text-cyan-300 bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                : isThinking
                ? "text-violet-300 bg-violet-500/15 border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                : isActing
                ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse"
                : isSpeaking
                ? "text-orange-300 bg-orange-500/15 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
                : "text-cyan-300 bg-cyan-500/15 border-cyan-500/30"
            }`}
          >
            {isListening
              ? "Listening..."
              : isThinking
              ? "Thinking..."
              : isActing
              ? "Executing Action..."
              : isSpeaking
              ? "Speaking..."
              : "Listening..."}
          </motion.span>
        </div>

        {/* Interactive Glowing Orb */}
        <div className="relative flex items-center justify-center mb-8 cursor-pointer" onClick={onInterrupt}>
          <motion.div
            animate={{
              scale: isListening ? [1, 1.06, 1] : isSpeaking ? [1.02, 1.12, 1.02] : [1, 1.03, 1],
            }}
            transition={{ duration: isSpeaking ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="orb-container"
          >
            <div className="orb">
              <div className="orb-inner" />
              <div className="orb-inner" />
            </div>
          </motion.div>
        </div>

        {/* Dynamic Voice Waveform (Active while Speaking / Listening) */}
        <div className="flex items-center justify-center gap-1.5 h-10 mb-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking
                  ? [6, 24 + ((i * 7) % 18), 10, 32, 6]
                  : isListening
                  ? [4, 12 + ((i * 3) % 10), 6, 16, 4]
                  : [4, 6, 4],
              }}
              transition={{
                duration: isSpeaking ? 0.7 : 1.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i * 0.04) % 0.6,
              }}
              className={`w-1 rounded-full ${
                isSpeaking
                  ? "bg-gradient-to-t from-orange-500 to-rose-400"
                  : isActing
                  ? "bg-gradient-to-t from-emerald-400 to-cyan-400"
                  : "bg-gradient-to-t from-cyan-400 to-violet-400 opacity-70"
              }`}
            />
          ))}
        </div>

        {/* Live Conversation Transcript & Response */}
        <div className="max-w-2xl w-full px-8 text-center min-h-[70px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {transcript ? (
              <motion.p
                key="transcript"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-lg md:text-xl text-gray-100 font-medium leading-relaxed"
              >
                {isThinking ? (
                  <span className="text-violet-300 italic">Thinking: {transcript}</span>
                ) : isActing ? (
                  <span className="text-emerald-300">{transcript}</span>
                ) : (
                  <span>{transcript}</span>
                )}
              </motion.p>
            ) : responseText ? (
              <motion.p
                key="response"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-base md:text-lg text-gray-300 leading-relaxed italic"
              >
                {responseText}
              </motion.p>
            ) : (
              <p className="text-sm text-gray-500 font-light tracking-wide animate-pulse">
                Listening to your voice... Speak naturally.
              </p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Interrupt / Stop control */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            type="button"
            onClick={onInterrupt}
            className={`px-7 py-3 rounded-full font-bold text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg backdrop-blur-md ${
              isSpeaking
                ? "bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/30"
                : "bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10"
            }`}
          >
            <Square size={14} fill="currentColor" />
            {isSpeaking ? "Interrupt Speech" : "Pause"}
          </button>
        </div>

        {/* Subtle Gemini hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
            {isSpeaking ? "Tap orb or speak to interrupt" : "Continuous conversation enabled"}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
