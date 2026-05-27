"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ArtifactType = "code" | "markdown" | "html" | "mermaid";

export default function ArtifactPanel({
  isOpen,
  onClose,
  title,
  content,
  type,
  onRefine,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: ArtifactType;
  onRefine: (instruction: string) => void;
  theme: "dark" | "light";
}) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-[100] w-full max-w-lg border-l shadow-2xl flex flex-col",
        theme === "dark" ? "bg-[#0f0f0f] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div>
          <p className="text-xs opacity-60 uppercase tracking-wide">{type}</p>
          <h2 className="font-semibold truncate">{title || "Artifact"}</h2>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-sm whitespace-pre-wrap font-mono">{content}</pre>
      <div className="p-4 border-t border-inherit flex gap-2">
        <input
          type="text"
          placeholder="Refine this artifact..."
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm border",
            theme === "dark" ? "bg-black/40 border-white/10" : "bg-gray-50 border-black/10"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              onRefine(e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
