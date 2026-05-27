import React from "react";
import { motion } from "framer-motion";
import { Mic, X, RefreshCw, AudioLines } from "lucide-react";

interface VoiceOverlayProps {
  status: "idle" | "listening" | "thinking" | "speaking";
  transcript: string;
  characterName: string;
  characterEmoji: string;
  onInterrupt: () => void;
  onClose: () => void;
  onChangeVoice: () => void;
}

export default function VoiceOverlay({
  status,
  transcript,
  characterName,
  characterEmoji,
  onInterrupt,
  onClose,
  onChangeVoice,
}: VoiceOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg text-white p-6"
    >
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <button
          onClick={onChangeVoice}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-all px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
        >
          <RefreshCw size={14} />
          Change Voice
        </button>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 hover:text-rose-400 p-2.5 rounded-full transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="text-center max-w-lg w-full flex flex-col items-center gap-8">
        {/* Character Info */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {characterEmoji}
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2">{characterName}</h2>
          <span className="text-xs uppercase tracking-widest font-black text-cyan-400">
            {status}
          </span>
        </div>

        {/* Visualizer Orb */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Animated rings based on status */}
          {status === "listening" && (
            <>
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-cyan-500/40"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute inset-4 rounded-full border border-cyan-400/50"
              />
            </>
          )}

          {status === "speaking" && (
            <>
              <motion.div
                animate={{ scale: [1, 1.4, 1], rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-violet-500/50"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-6 rounded-full bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20"
              />
            </>
          )}

          {status === "thinking" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400"
            />
          )}

          {/* Core Button/Orb */}
          <button
            onClick={onInterrupt}
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              status === "listening"
                ? "bg-cyan-500 text-black shadow-cyan-500/30 hover:scale-105"
                : status === "speaking"
                ? "bg-violet-600 text-white shadow-violet-600/30 hover:bg-violet-500 hover:scale-105 cursor-pointer"
                : status === "thinking"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-700 text-white"
            }`}
          >
            {status === "speaking" ? (
              <AudioLines size={36} className="animate-pulse" />
            ) : (
              <Mic size={36} className={status === "listening" ? "animate-bounce" : ""} />
            )}
          </button>
        </div>

        {/* Live Transcript / Response text */}
        <div className="min-h-[60px] flex items-center justify-center px-4 w-full">
          <p className="text-zinc-300 text-lg font-medium leading-relaxed italic">
            {transcript || (status === "listening" ? "Listening..." : status === "thinking" ? "Thinking..." : "")}
          </p>
        </div>

        {/* Tap to Interrupt hint */}
        {status === "speaking" && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-[10px] uppercase tracking-widest font-black text-violet-400 bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20 cursor-pointer"
            onClick={onInterrupt}
          >
            Tap Orb to Interrupt
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
