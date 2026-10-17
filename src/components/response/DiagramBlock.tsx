"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GitBranch, Copy, Check, Download, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagramBlockProps {
  code: string;
  theme?: "dark" | "light";
}

let mermaidInstance: any = null;

export default function DiagramBlock({ code, theme = "dark" }: DiagramBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [id] = useState(() => `mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      if (!code.trim()) return;

      try {
        if (!mermaidInstance) {
          const mermaidModule = await import("mermaid");
          mermaidInstance = mermaidModule.default;
        }

        mermaidInstance.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          themeVariables: theme === "dark"
            ? {
                primaryColor: "#0891b2",
                primaryTextColor: "#f3f4f6",
                primaryBorderColor: "#06b6d4",
                lineColor: "#64748b",
                secondaryColor: "#1e293b",
                tertiaryColor: "#0f172a",
              }
            : {
                primaryColor: "#0284c7",
                primaryTextColor: "#1e293b",
                primaryBorderColor: "#0284c7",
                lineColor: "#94a3b8",
                secondaryColor: "#f1f5f9",
                tertiaryColor: "#ffffff",
              },
        });

        // Clean code of any markdown backticks or language tags
        const cleanCode = code
          .replace(/^```(mermaid)?/im, "")
          .replace(/```$/im, "")
          .trim();

        const { svg } = await mermaidInstance.render(id, cleanCode);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to render diagram");
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code, theme, id]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const handleDownloadSvg = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `architecture-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgContent]);

  return (
    <div
      className={cn(
        "my-4 rounded-xl border overflow-hidden shadow-lg transition-all",
        isFullscreen ? "fixed inset-4 z-50 flex flex-col bg-slate-900 border-cyan-500/50" : "",
        theme === "dark"
          ? "border-cyan-500/20 bg-[#090d16] text-gray-200"
          : "border-cyan-500/30 bg-cyan-50/20 text-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          theme === "dark"
            ? "bg-cyan-950/20 border-cyan-500/20"
            : "bg-cyan-100/40 border-cyan-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400">
            <GitBranch size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400">
            Visual Diagram
          </span>
          <span className="text-xs font-medium opacity-60">|</span>
          <span className="text-xs opacity-80">Interactive Architecture</span>
        </div>

        <div className="flex items-center gap-1">
          {svgContent && (
            <button
              onClick={handleDownloadSvg}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100 transition-colors"
              title="Download as SVG image"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export SVG</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm ml-1",
              copied
                ? "bg-green-600 text-white"
                : "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
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
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Render Area */}
      <div
        ref={containerRef}
        className={cn(
          "p-6 flex items-center justify-center overflow-x-auto min-h-[160px]",
          isFullscreen ? "flex-1 overflow-auto" : ""
        )}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center text-center p-4 max-w-md">
            <AlertCircle className="text-amber-400 mb-2" size={24} />
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Diagram Syntax Notice
            </p>
            <p className="text-[11px] opacity-70 mb-3">{error}</p>
            <pre className="text-left font-mono text-xs p-3 rounded bg-black/30 w-full overflow-x-auto text-gray-300">
              {code}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto transition-transform"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center gap-2 text-xs opacity-60">
            <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span>Rendering diagram…</span>
          </div>
        )}
      </div>
    </div>
  );
}
