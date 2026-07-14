"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, AudioLines, Brain, Square } from "lucide-react";

interface VoiceAssistantProps {
  isOpen: boolean;
  status: "idle" | "listening" | "thinking" | "speaking";
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
  if (!isOpen) return null;

  const isListening = status === "listening";
  const isThinking = status === "thinking";
  const isSpeaking = status === "speaking";
  const isActive = isListening || isThinking || isSpeaking;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a0a] text-white overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ${
              isListening
                ? "bg-cyan-500/15"
                : isThinking
                ? "bg-violet-500/15"
                : isSpeaking
                ? "bg-orange-500/10"
                : "bg-transparent"
            }`}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 hover:text-rose-400 transition-all"
        >
          <X size={20} />
        </button>

        {/* Status label */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <motion.span
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[11px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full border ${
              isListening
                ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                : isThinking
                ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
                : isSpeaking
                ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                : "text-gray-400 bg-white/5 border-white/10"
            }`}
          >
            {isListening
              ? "Listening"
              : isThinking
              ? "Thinking"
              : isSpeaking
              ? "Speaking"
              : "Voice Assistant"}
          </motion.span>
        </div>

        {/* Orb Container — Main visual */}
        <div className="relative flex items-center justify-center mb-12">
          <div className="orb-container" onClick={isActive ? onInterrupt : onToggleListening}>
            {/* Outer glow ring */}
            <div
              className={`absolute w-[220px] h-[220px] rounded-full transition-all duration-500 ${
                isListening
                  ? "shadow-[0_0_60px_rgba(6,182,212,0.3)]"
                  : isThinking
                  ? "shadow-[0_0_60px_rgba(139,92,246,0.3)]"
                  : isSpeaking
                  ? "shadow-[0_0_60px_rgba(251,146,60,0.3)]"
                  : ""
              }`}
            />

            {/* Animated rings */}
            {isListening && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-[200px] h-[200px] rounded-full border border-cyan-400/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  className="absolute w-[200px] h-[200px] rounded-full border border-cyan-300/40"
                />
              </>
            )}

            {isThinking && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute w-[200px] h-[200px] rounded-full border-2 border-transparent border-t-violet-400 border-r-violet-400/50"
              />
            )}

            {isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-orange-400/40"
              />
            )}

            {/* Orb base */}
            <div className="orb" />

            {/* Orb inner shapes */}
            <div className="orb-inner" />
            <div className="orb-inner" />

            {/* Center icon */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
              {isListening ? (
                <Mic size={28} className="text-cyan-400 animate-pulse" />
              ) : isThinking ? (
                <Brain size={28} className="text-violet-400 animate-pulse" />
              ) : isSpeaking ? (
                <AudioLines size={28} className="text-orange-400 animate-pulse" />
              ) : (
                <Mic size={28} className="text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Live transcript */}
        <div className="absolute bottom-32 left-0 right-0 px-8 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-lg text-gray-300 leading-relaxed">
                  {isThinking ? (
                    <span className="text-violet-300 italic">{transcript}</span>
                  ) : (
                    transcript
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {responseText && !transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-lg text-gray-400 leading-relaxed italic">{responseText}</p>
            </motion.div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {!isActive ? (
            <button
              onClick={onToggleListening}
              className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <Mic size={18} />
              Start Listening
            </button>
          ) : (
            <button
              onClick={onInterrupt}
              className={`px-8 py-3.5 rounded-full font-bold text-sm active:scale-95 transition-all flex items-center gap-2 ${
                isSpeaking
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Square size={16} fill="currentColor" />
              {isSpeaking ? "Stop Speaking" : "Stop"}
            </button>
          )}
        </div>

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            {isActive ? "Tap orb or button to interrupt" : "Tap to start voice conversation"}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
