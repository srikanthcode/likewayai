"use client";

import { cn } from "@/lib/utils";

// Starter prompt chips shown on an empty conversation.

export interface EmptyStateChip {
  icon: string;
  label: string;
  prompt: string;
}

export const DEFAULT_EMPTY_STATE_CHIPS: EmptyStateChip[] = [
  { icon: "✦", label: "Write code", prompt: "Write a Python script to " },
  { icon: "⟡", label: "Analyze data", prompt: "Analyze this data and " },
  { icon: "⊕", label: "Search web", prompt: "Search the web for " },
  { icon: "◈", label: "Create image", prompt: "Generate an image of " },
  { icon: "◎", label: "Summarize", prompt: "Summarize the following: " },
  { icon: "⚡", label: "Brainstorm", prompt: "Brainstorm ideas for " },
];

interface EmptyStateChipsProps {
  chips?: EmptyStateChip[];
  theme: "dark" | "light";
  onPick: (prompt: string) => void;
}

export default function EmptyStateChips({ chips = DEFAULT_EMPTY_STATE_CHIPS, theme, onPick }: EmptyStateChipsProps) {
  return (
    <div className={cn("premium-suggestion-chips", theme === "light" && "premium-suggestion-chips-light")}>
      {chips.map((chip) => (
        <button key={chip.label} type="button" onClick={() => onPick(chip.prompt)}>
          <span className="opacity-60">{chip.icon}</span> {chip.label}
        </button>
      ))}
    </div>
  );
}