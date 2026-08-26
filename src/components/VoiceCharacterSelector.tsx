"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { User, Sparkles, Volume2, CheckCircle2 } from "lucide-react";

export interface VoiceCharacter {
  id: string;
  name: string;
  emoji?: string;
  gender: string;
  desc: string;
}

export default function VoiceCharacterSelector({
  characters,
  selectedId,
  onSelect,
  onPreview,
  onConfirm,
}: {
  characters: VoiceCharacter[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="w-[92vw] max-w-md bg-zinc-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-3.5 font-sans select-none max-h-[85vh] overflow-y-auto">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center relative">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1">
          <Sparkles size={11} />
          Neural Voice Matrix
        </div>
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
          Choose Your AI Persona
        </h2>
        <p className="text-zinc-400 text-[11px] sm:text-xs mt-0.5">
          Select a voice. Tap to choose or double-click to preview sound.
        </p>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 py-0.5">
        {characters.map((char) => {
          const isSelected = selectedId === char.id;
          const isFemale = char.gender === "female";

          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onSelect(char.id)}
              onDoubleClick={() => onPreview(char.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer active:scale-95",
                isSelected
                  ? isFemale
                    ? "border-pink-500/60 bg-pink-500/15 shadow-[0_0_20px_rgba(236,72,153,0.25)]"
                    : "border-cyan-500/60 bg-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                  : "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
              )}
            >
              {/* Persona Icon Badge */}
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 group-hover:scale-105",
                  isSelected
                    ? isFemale
                      ? "bg-pink-500/20 border-pink-400/50 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                      : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                    : "bg-white/10 border-white/10 text-gray-300"
                )}
              >
                <User size={16} />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-white tracking-wide">{char.name}</span>
                <span className="text-[10px] text-zinc-400 font-medium leading-tight line-clamp-1">{char.desc}</span>
                <span
                  className={cn(
                    "text-[8px] mt-1 uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full",
                    isFemale
                      ? "bg-pink-500/15 text-pink-300 border border-pink-500/20"
                      : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                  )}
                >
                  {char.gender}
                </span>
              </div>

              {/* Selection Checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 size={13} className={isFemale ? "text-pink-400" : "text-cyan-400"} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Controls */}
      {onConfirm && (
        <div className="flex items-center justify-between gap-3 mt-1 border-t border-white/10 pt-3">
          <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Volume2 size={13} className="text-cyan-400" />
            Double-click to hear voice
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            Activate Persona
          </button>
        </div>
      )}
    </div>
  );
}
