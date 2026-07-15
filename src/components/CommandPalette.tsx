"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandAction {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  section: string;
  perform: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  actions,
}: {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = actions.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
  );

  const sections = [...new Set(filtered.map((a) => a.section))];

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent outline-none text-white text-sm"
          />
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section} className="mb-2">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">{section}</p>
              {filtered
                .filter((a) => a.section === section)
                .map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left",
                        "hover:bg-white/10 text-gray-200"
                      )}
                      onClick={() => {
                        action.perform();
                        onClose();
                      }}
                    >
                      <Icon size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{action.name}</div>
                        <div className="text-xs text-gray-500">{action.description}</div>
                      </div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
