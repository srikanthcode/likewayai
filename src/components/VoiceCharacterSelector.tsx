"use client";

import { cn } from "@/lib/utils";

export interface VoiceCharacter {
  id: string;
  name: string;
  emoji: string;
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
    <div className="w-full max-w-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
      {/* Glow Effect */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
          Choose Assistant Voice
        </h2>
        <p className="text-zinc-400 text-sm mt-2">
          Select your preferred persona. Double click any card to hear a voice preview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-2">
        {characters.map((char) => (
          <button
            key={char.id}
            type="button"
            onClick={() => onSelect(char.id)}
            onDoubleClick={() => onPreview(char.id)}
            className={cn(
              "group relative flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all duration-300",
              selectedId === char.id
                ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : "border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10"
            )}
          >
            <span className="text-4xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] transform transition-transform group-hover:scale-110 duration-300">
              {char.emoji}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white tracking-wide">{char.name}</span>
              <span className="text-[11px] text-zinc-400 mt-0.5 font-medium">{char.desc}</span>
              <span className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                {char.gender}
              </span>
            </div>
            
            {/* Active Indicator Dot */}
            {selectedId === char.id && (
              <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {onConfirm && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 border-t border-white/5 pt-6">
          <p className="text-xs text-zinc-500 text-center sm:text-left">
            Double click a voice character card above to preview speech.
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            Confirm & Activate Voice
          </button>
        </div>
      )}
    </div>
  );
}
