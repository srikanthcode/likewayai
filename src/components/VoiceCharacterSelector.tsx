"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { User, Sparkles, Volume2, CheckCircle2, Radio } from "lucide-react";

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
    <div className="w-full max-w-2xl bg-zinc-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6 font-sans">
      {/* Glow Effects */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles size={13} />
          Neural Voice Matrix
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          Choose Your AI Persona
        </h2>
        <p className="text-zinc-400 text-xs md:text-sm mt-1.5">
          Select an AI persona. Tap to select or double-click to preview speech.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 py-1">
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
                "group relative flex flex-col items-center gap-3 p-4.5 rounded-2xl border text-center transition-all duration-300 cursor-pointer",
                isSelected
                  ? isFemale
                    ? "border-pink-500/60 bg-pink-500/15 shadow-[0_0_25px_rgba(236,72,153,0.2)]"
                    : "border-cyan-500/60 bg-cyan-500/15 shadow-[0_0_25px_rgba(6,182,212,0.2)]"
                  : "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
              )}
            >
              {/* Persona Icon Badge */}
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105",
                  isSelected
                    ? isFemale
                      ? "bg-pink-500/20 border-pink-400/50 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                      : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "bg-white/10 border-white/10 text-gray-300"
                )}
              >
                <User size={22} />
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">{char.name}</span>
                <span className="text-[11px] text-zinc-400 mt-0.5 font-medium">{char.desc}</span>
                <span
                  className={cn(
                    "text-[9px] mt-1.5 uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full inline-block mx-auto",
                    isFemale
                      ? "bg-pink-500/15 text-pink-300 border border-pink-500/20"
                      : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                  )}
                >
                  {char.gender}
                </span>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 size={16} className={isFemale ? "text-pink-400" : "text-cyan-400"} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {onConfirm && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 border-t border-white/10 pt-5">
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Volume2 size={14} className="text-cyan-400" />
            Double-click any persona to preview sound
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            Activate Persona
          </button>
        </div>
      )}
    </div>
  );
}
