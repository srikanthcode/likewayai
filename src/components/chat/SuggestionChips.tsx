"use client";

// SuggestionChips disabled per user request
interface SuggestionChipsProps {
  suggestions?: string[];
  onSelect?: (suggestion: string) => void;
  disabled?: boolean;
  theme?: "dark" | "light";
}

export default function SuggestionChips(_props: SuggestionChipsProps) {
  return null;
}