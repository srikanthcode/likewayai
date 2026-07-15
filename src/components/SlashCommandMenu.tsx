"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  filterCommands,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SlashCommand,
} from "@/lib/commands";

interface SlashCommandMenuProps {
  isOpen: boolean;
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  theme: "dark" | "light";
}

export default function SlashCommandMenu({
  isOpen,
  query,
  onSelect,
  onClose,
  theme,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const filtered = filterCommands(query);

  // Group by category in defined order
  const grouped = CATEGORY_ORDER
    .filter((cat) => filtered.some((cmd) => cmd.category === cat))
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      commands: filtered.filter((cmd) => cmd.category === cat),
    }));

  // Flat list for keyboard navigation
  const flatCommands = grouped.flatMap((g) => g.commands);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % flatCommands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            onSelect(flatCommands[selectedIndex]);
          }
          break;
        case "Tab":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            onSelect(flatCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, flatCommands, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || filtered.length === 0) return null;

  // Map flat index back to grouped position for highlighting
  let globalIdx = 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "absolute bottom-full left-0 right-0 mb-2 mx-0 sm:mx-4 max-h-[50vh] sm:max-h-[400px] overflow-hidden rounded-2xl shadow-2xl border z-50 flex flex-col",
          theme === "dark"
            ? "bg-[#1a1d27] border-white/10"
            : "bg-white border-black/10"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "px-4 py-2.5 border-b flex items-center gap-2",
            theme === "dark"
              ? "border-white/5 text-gray-400"
              : "border-black/5 text-gray-500"
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {filtered.length} command{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] ml-auto opacity-50">
            ↑↓ navigate · ↵ select · esc close
          </span>
        </div>

        {/* Command List */}
        <div ref={listRef} className="overflow-y-auto overscroll-contain">
          {grouped.map(({ category, label, commands }) => (
            <div key={category}>
              <div
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0",
                  theme === "dark"
                    ? "bg-[#1a1d27] text-gray-500 border-b border-white/5"
                    : "bg-white text-gray-400 border-b border-black/5"
                )}
              >
                {label}
              </div>
              {commands.map((cmd) => {
                const idx = globalIdx;
                globalIdx++;
                const isSelected = idx === selectedIndex;
                const Icon = cmd.icon;

                return (
                  <button
                    key={cmd.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(idx, el);
                    }}
                    type="button"
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isSelected
                        ? theme === "dark"
                          ? "bg-white/10"
                          : "bg-black/5"
                        : theme === "dark"
                          ? "hover:bg-white/5"
                          : "hover:bg-black/[0.03]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-400"
                          : theme === "dark"
                            ? "bg-white/5 text-gray-400"
                            : "bg-black/5 text-gray-500"
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-semibold font-mono",
                            isSelected
                              ? "text-white"
                              : theme === "dark"
                                ? "text-gray-200"
                                : "text-gray-800"
                          )}
                        >
                          {cmd.label}
                        </span>
                        {cmd.needsInput && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-medium">
                            + text
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xs truncate",
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        {cmd.description}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] text-cyan-400 font-mono opacity-60">
                        ↵
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
