"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Square, Sparkles, User, RefreshCw, Volume2 } from "lucide-react";

export interface VoiceCharacterInfo {
  id: string;
  name: string;
  gender: string;
  desc: string;
  emoji: string;
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
    emoji: "👩",
  },
  availableCharacters = [
    { id: "aria", name: "Aria", gender: "female", desc: "Warm & Friendly", emoji: "👩" },
    { id: "nova", name: "Nova", gender: "female", desc: "Clear & Professional", emoji: "👩‍💼" },
    { id: "echo", name: "Echo", gender: "male", desc: "Deep & Confident", emoji: "🧑" },
    { id: "spark", name: "Spark", gender: "female", desc: "Bright & Energetic", emoji: "👧" },
    { id: "atlas", name: "Atlas", gender: "male", desc: "Calm & Authoritative", emoji: "🧑‍💻" },
    { id: "luna", name: "Luna", gender: "female", desc: "Soft & Soothing", emoji: "🌙" },
  ],
  onSelectCharacter,
  onToggleListening,
  onInterrupt,
  onClose,
}: VoiceAssistantProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number>(0);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Auto-start listening on open
  useEffect(() => {
    if (isOpen && status === "idle") {
      onToggleListening();
    }
  }, [isOpen, status, onToggleListening]);

  const isFemale = character.gender === "female";
  const isListening = status === "listening" || status === "idle";
  const isThinking = status === "thinking";
  const isActing = status === "acting";
  const isSpeaking = status === "speaking";

  // 3D Neural Network Hologram Simulation on HTML5 Canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = 340);
    let height = (canvas.height = 340);

    // Generate 3D Neural Synaptic Nodes on a Sphere Lattice
    const nodeCount = isFemale ? 56 : 64;
    const nodes: Array<{
      x: number;
      y: number;
      z: number;
      ox: number;
      oy: number;
      oz: number;
      baseRadius: number;
      phase: number;
      pulseSpeed: number;
    }> = [];

    const radius = 100;
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const phi = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);

      nodes.push({
        x,
        y,
        z,
        ox: x,
        oy: y,
        oz: z,
        baseRadius: Math.random() * 2.2 + 1.2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.05 + 0.02,
      });
    }

    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Rotation speeds based on state
      const speedMult = isThinking ? 3.5 : isActing ? 2.5 : isSpeaking ? 1.8 : 1.0;
      rotX += 0.007 * speedMult;
      rotY += 0.011 * speedMult;
      rotZ += 0.004 * speedMult;

      // Audio pulsation magnitude
      const audioPulse = isSpeaking
        ? Math.sin(time * 8) * 16 + Math.cos(time * 12) * 8
        : isListening
        ? Math.sin(time * 4) * 5
        : isActing
        ? Math.sin(time * 10) * 10
        : 2;

      // Project 3D nodes to 2D
      const projectedNodes = nodes.map((node) => {
        // Expand/contract with neural breath & voice
        const currentR = radius + audioPulse + Math.sin(time * 3 + node.phase) * 6;
        const norm = Math.sqrt(node.ox * node.ox + node.oy * node.oy + node.oz * node.oz);
        const nx = (node.ox / norm) * currentR;
        const ny = (node.oy / norm) * currentR;
        const nz = (node.oz / norm) * currentR;

        // 3D Rotation matrices
        // Rotate Y
        let x1 = nx * Math.cos(rotY) + nz * Math.sin(rotY);
        let y1 = ny;
        let z1 = -nx * Math.sin(rotY) + nz * Math.cos(rotY);

        // Rotate X
        let x2 = x1;
        let y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Rotate Z
        let x3 = x2 * Math.cos(rotZ) - y2 * Math.sin(rotZ);
        let y3 = x2 * Math.sin(rotZ) + y2 * Math.cos(rotZ);
        let z3 = z2;

        // Perspective projection
        const fov = 280;
        const scale = fov / (fov + z3 + 80);
        const px = cx + x3 * scale;
        const py = cy + y3 * scale;

        return {
          px,
          py,
          scale,
          z: z3,
          brightness: Math.max(0.15, (z3 + radius) / (2 * radius)),
        };
      });

      // Draw Synaptic Neural Connections
      ctx.lineWidth = isFemale ? 0.9 : 1.2;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const dx = projectedNodes[i].px - projectedNodes[j].px;
          const dy = projectedNodes[i].py - projectedNodes[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = isFemale ? 58 : 64;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.45 * Math.min(projectedNodes[i].brightness, projectedNodes[j].brightness);

            // Persona-based color palette
            if (isFemale) {
              // Female Palette: Cyan, Magenta, Purple, Rose
              if (isSpeaking) {
                ctx.strokeStyle = `rgba(244, 114, 182, ${alpha * 1.3})`; // Rose Pink
              } else if (isThinking) {
                ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 1.3})`; // Purple
              } else if (isActing) {
                ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 1.3})`; // Mint Emerald
              } else {
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 1.2})`; // Sky Cyan
              }
            } else {
              // Male Palette: Cobalt Blue, Neon Emerald, Amber Gold
              if (isSpeaking) {
                ctx.strokeStyle = `rgba(251, 146, 60, ${alpha * 1.3})`; // Neon Amber
              } else if (isThinking) {
                ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 1.3})`; // Electric Indigo
              } else if (isActing) {
                ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 1.3})`; // Emerald
              } else {
                ctx.strokeStyle = `rgba(14, 165, 233, ${alpha * 1.2})`; // Deep Cobalt
              }
            }

            ctx.beginPath();
            ctx.moveTo(projectedNodes[i].px, projectedNodes[i].py);
            ctx.lineTo(projectedNodes[j].px, projectedNodes[j].py);
            ctx.stroke();
          }
        }
      }

      // Draw Synaptic Nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        const node = projectedNodes[i];
        const r = Math.max(1.2, 2.5 * node.scale);

        ctx.beginPath();
        ctx.arc(node.px, node.py, r, 0, Math.PI * 2);

        if (isFemale) {
          ctx.fillStyle = isSpeaking
            ? `rgba(255, 182, 217, ${node.brightness})`
            : isThinking
            ? `rgba(216, 180, 254, ${node.brightness})`
            : `rgba(186, 230, 253, ${node.brightness})`;
        } else {
          ctx.fillStyle = isSpeaking
            ? `rgba(254, 215, 170, ${node.brightness})`
            : isThinking
            ? `rgba(199, 210, 254, ${node.brightness})`
            : `rgba(186, 230, 253, ${node.brightness})`;
        }

        ctx.fill();
      }

      // Center Core Hologram Aura
      const coreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 75 + audioPulse);
      if (isFemale) {
        coreGrad.addColorStop(0, isSpeaking ? "rgba(236, 72, 153, 0.4)" : isThinking ? "rgba(168, 85, 247, 0.4)" : "rgba(6, 182, 212, 0.35)");
        coreGrad.addColorStop(0.6, isSpeaking ? "rgba(219, 39, 119, 0.15)" : "rgba(59, 130, 246, 0.1)");
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        coreGrad.addColorStop(0, isSpeaking ? "rgba(249, 115, 22, 0.4)" : isThinking ? "rgba(99, 102, 241, 0.4)" : "rgba(2, 132, 199, 0.35)");
        coreGrad.addColorStop(0.6, isSpeaking ? "rgba(234, 88, 12, 0.15)" : "rgba(16, 185, 129, 0.1)");
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 75 + audioPulse, 0, Math.PI * 2);
      ctx.fill();

      animIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [isOpen, isFemale, isListening, isThinking, isActing, isSpeaking]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#06080e] text-white overflow-hidden select-none"
      >
        {/* Dynamic Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1.1, 1.35, 1.1] : [1, 1.1, 1],
              opacity: isListening ? [0.2, 0.4, 0.2] : isSpeaking ? [0.35, 0.55, 0.35] : 0.2,
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px] transition-colors duration-1000 ${
              isFemale
                ? isSpeaking
                  ? "bg-gradient-to-tr from-pink-500/30 via-rose-500/25 to-purple-600/30"
                  : isThinking
                  ? "bg-gradient-to-tr from-purple-600/35 via-fuchsia-600/25 to-indigo-600/30"
                  : "bg-gradient-to-tr from-cyan-500/25 via-sky-600/20 to-purple-600/25"
                : isSpeaking
                ? "bg-gradient-to-tr from-orange-500/30 via-amber-500/25 to-blue-600/30"
                : isThinking
                ? "bg-gradient-to-tr from-indigo-600/35 via-violet-600/25 to-cyan-600/30"
                : "bg-gradient-to-tr from-blue-600/30 via-cyan-500/20 to-emerald-600/25"
            }`}
          />
        </div>

        {/* Top Bar Controls */}
        <div className="absolute top-6 left-0 right-0 px-8 flex items-center justify-between z-50">
          {/* Persona Badge with Quick Voice Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPersonaMenu((p) => !p)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Click to change AI Voice Persona"
            >
              <span className="text-xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                {character.emoji}
              </span>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide">{character.name}</span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                      isFemale ? "bg-pink-500/20 text-pink-300" : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    {character.gender}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{character.desc}</span>
              </div>
              <RefreshCw size={12} className="text-gray-400 ml-1" />
            </button>

            {/* Quick Persona Dropdown */}
            <AnimatePresence>
              {showPersonaMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-zinc-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                    Select Neural Voice Persona
                  </p>
                  {availableCharacters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCharacter?.(c.id);
                        setShowPersonaMenu(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                        character.id === c.id
                          ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white"
                          : "hover:bg-white/10 text-gray-300"
                      }`}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{c.name}</span>
                          <span className="text-[9px] text-gray-400 capitalize">({c.gender})</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{c.desc}</span>
                      </div>
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
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 hover:text-rose-400 active:scale-95 transition-all cursor-pointer shadow-lg"
            title="Close Voice Assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40">
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
                ? isFemale
                  ? "text-pink-300 bg-pink-500/15 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.25)]"
                  : "text-orange-300 bg-orange-500/15 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
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

        {/* 3D Neural Network Avatar Core (Interactive & Clickable to Interrupt) */}
        <div
          className="relative flex items-center justify-center my-4 cursor-pointer group"
          onClick={onInterrupt}
          title="Click to interrupt or speak"
        >
          {/* Outer Hologram Ring */}
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: isSpeaking ? [1, 1.06, 1] : [1, 1.02, 1],
            }}
            transition={{
              rotate: { duration: isThinking ? 8 : 22, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            }}
            className={`absolute w-[330px] h-[330px] rounded-full border-2 border-dashed transition-colors duration-700 pointer-events-none ${
              isFemale
                ? isSpeaking
                  ? "border-pink-500/40 shadow-[0_0_30px_rgba(236,72,153,0.2)]"
                  : isThinking
                  ? "border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                  : "border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                : isSpeaking
                ? "border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.2)]"
                : isThinking
                ? "border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                : "border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.15)]"
            }`}
          />

          {/* 3D Neural Canvas Simulation */}
          <canvas
            ref={canvasRef}
            className="w-[340px] h-[340px] z-10 transition-transform duration-300 group-hover:scale-105"
          />

          {/* Central AI Entity Badge inside Neural Core */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <span className="text-4xl filter drop-shadow-[0_0_16px_rgba(255,255,255,0.7)] animate-pulse">
              {character.emoji}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mt-1.5 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
              {character.name}
            </span>
          </div>
        </div>

        {/* Dynamic Frequency Equalizer Spectrum */}
        <div className="flex items-center justify-center gap-1.5 h-8 mb-4">
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking
                  ? [5, 20 + ((i * 7) % 18), 8, 28, 5]
                  : isListening
                  ? [4, 10 + ((i * 3) % 8), 5, 14, 4]
                  : [3, 5, 3],
              }}
              transition={{
                duration: isSpeaking ? 0.6 : 1.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i * 0.035) % 0.5,
              }}
              className={`w-1 rounded-full ${
                isFemale
                  ? isSpeaking
                    ? "bg-gradient-to-t from-pink-500 to-rose-400"
                    : isActing
                    ? "bg-gradient-to-t from-emerald-400 to-cyan-400"
                    : "bg-gradient-to-t from-cyan-400 to-purple-400 opacity-70"
                  : isSpeaking
                  ? "bg-gradient-to-t from-orange-500 to-amber-400"
                  : isActing
                  ? "bg-gradient-to-t from-emerald-400 to-cyan-400"
                  : "bg-gradient-to-t from-sky-400 to-indigo-400 opacity-70"
              }`}
            />
          ))}
        </div>

        {/* Live Conversation Transcript & Response Box */}
        <div className="max-w-2xl w-full px-8 text-center min-h-[65px] flex items-center justify-center">
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
              <p className="text-xs md:text-sm text-gray-400 font-light tracking-wide animate-pulse">
                {isFemale ? "Aria Neural AI is listening... Speak naturally." : "Echo Cybernetic AI is listening... Speak naturally."}
              </p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Pause / Interrupt Control Button */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            type="button"
            onClick={onInterrupt}
            className={`px-7 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg backdrop-blur-md ${
              isSpeaking
                ? isFemale
                  ? "bg-pink-600 text-white hover:bg-pink-500 shadow-pink-600/30"
                  : "bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/30"
                : "bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10"
            }`}
          >
            <Square size={13} fill="currentColor" />
            {isSpeaking ? "Interrupt Speech" : "Pause"}
          </button>
        </div>

        {/* Gemini Live Footer Indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
            {isSpeaking ? "Tap neural core to interrupt" : "3D Neural Network Engine Active"}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
