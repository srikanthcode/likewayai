"use client";

// Follow-up action chips emitted by the assistant (<suggestions> SSE event).
// Clicking a chip sends it as the next user message.

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0 || disabled) return null;

  return (
    <div className="max-w-3xl mx-auto mb-4 flex flex-wrap gap-2 justify-center px-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s)}
          className="px-4 py-2 rounded-2xl text-[13px] font-medium border border-gray-300/60 dark:border-white/15 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors text-left"
        >
          {s}
        </button>
      ))}
    </div>
  );
}