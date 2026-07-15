"use client";

import React from "react";

interface PersonaManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (persona: any) => void;
  theme: "dark" | "light";
}

export default function PersonaManager({ isOpen, onClose, onSelect, theme }: PersonaManagerProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl ${
        theme === 'dark' ? "bg-[#161b22] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
      }`}>
        <h2 className="text-lg font-bold mb-4">Select Persona</h2>
        <p className="text-sm text-zinc-500 mb-6">Persona selection is not active in this mode.</p>
        <button 
          onClick={onClose} 
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
