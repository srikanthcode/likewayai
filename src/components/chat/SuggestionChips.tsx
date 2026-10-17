"use client";

// Follow-up action chips emitted by the assistant (<suggestions> SSE event).
// Clicking a chip sends it as the next user message.

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  theme?: "dark" | "light";
}

export default function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
  theme = "dark",
}: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0 || disabled) return null;

  const isLight = theme === "light";

  return (
    <div className="max-w-3xl mx-auto mb-4 flex flex-wrap gap-2 justify-center px-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s)}
          className={`px-4 py-2 rounded-2xl text-[13px] font-medium border transition-all text-left shadow-sm ${
            isLight
              ? "bg-gray-100 hover:bg-gray-200/90 text-gray-900 border-gray-300 hover:border-gray-400"
              : "bg-[#2f2f2f] hover:bg-[#3a3a3a] text-gray-100 border-white/10 hover:border-white/20"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}