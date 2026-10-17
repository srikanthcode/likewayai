"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check, Download, Edit3, Terminal, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptBlockProps {
  title?: string;
  content: string;
  theme?: "dark" | "light";
}

export default function PromptBlock({
  title = "Optimized Prompt",
  content,
  theme = "dark",
}: PromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(content);

  const charCount = editedText.length;
  const wordCount = editedText.trim().split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.round(wordCount * 1.33);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const ta = document.createElement("textarea");
      ta.value = editedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [editedText]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prompt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editedText, title]);

  return (
    <div
      className={cn(
        "my-4 rounded-xl border overflow-hidden shadow-lg transition-all",
        theme === "dark"
          ? "border-amber-500/30 bg-[#0d1117] text-gray-200"
          : "border-amber-500/40 bg-amber-50/20 text-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b",
          theme === "dark"
            ? "bg-amber-950/20 border-amber-500/20"
            : "bg-amber-100/40 border-amber-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-400">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
            Prompt Artifact
          </span>
          <span className="text-xs font-medium opacity-60">|</span>
          <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-none">
            {title}
          </span>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-[11px] opacity-60 mr-1">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>~{tokenEstimate} tokens</span>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
              isEditing
                ? "bg-amber-500/20 text-amber-300"
                : "hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
            )}
            title={isEditing ? "View raw" : "Edit prompt"}
          >
            <Edit3 size={13} />
            <span className="hidden sm:inline">{isEditing ? "Done" : "Edit"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100 transition-colors"
            title="Download prompt as .txt"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm",
              copied
                ? "bg-green-600 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            )}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-x-auto">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-48 bg-transparent font-mono text-sm leading-relaxed p-2 border border-amber-500/20 rounded-lg focus:outline-none focus:border-amber-500/50 resize-y"
          />
        ) : (
          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
            {editedText}
          </pre>
        )}
      </div>
    </div>
  );
}
