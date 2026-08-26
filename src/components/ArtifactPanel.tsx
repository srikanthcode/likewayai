"use client";

import React, { useState, useCallback } from "react";
import { X, Copy, Check, Download, FileText, Code, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

export type ArtifactType = "code" | "markdown" | "html" | "mermaid" | "doc";

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
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"rendered" | "raw">(
    type === "code" ? "raw" : "rendered"
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handleExportMarkdown = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "document"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, title]);

  const handleExportHTML = useCallback(() => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a1a; }
    h1, h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 1rem; text-align: left; }
    th { background: #f8f8f8; font-weight: 600; }
    blockquote { border-left: 4px solid #ccc; margin: 1rem 0; padding: 0.5rem 1rem; color: #555; }
    a { color: #0066cc; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #eee; margin: 2rem 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${renderMarkdownToHTML(content)}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "document"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, title]);

  if (!isOpen) return null;

  const displayType = type === "doc" ? "markdown" : type;
  const isCode = displayType === "code";

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-[100] w-full sm:max-w-lg border-l shadow-2xl flex flex-col",
        theme === "dark"
          ? "bg-[#0f0f0f] border-white/10 text-white"
          : "bg-white border-black/10 text-gray-900"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit safe-area-top">
        <div className="min-w-0 flex-1">
          <p className="text-xs opacity-60 uppercase tracking-wide">{displayType}</p>
          <h2 className="font-semibold truncate">{title || "Artifact"}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* View mode toggle (for non-code types) */}
          {!isCode && (
            <div className="flex items-center bg-black/10 dark:bg-white/5 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setViewMode("rendered")}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-semibold transition-all",
                  viewMode === "rendered"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Rendered view"
              >
                <Eye size={12} />
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-semibold transition-all",
                  viewMode === "raw"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Raw view"
              >
                <Code size={12} />
              </button>
            </div>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            title="Copy to clipboard"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>

          {/* Export dropdown */}
          <div className="relative group/export">
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Export document"
            >
              <Download size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-50 p-1.5">
              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs font-medium transition-all"
              >
                <FileText size={14} className="text-blue-400" />
                Export as Markdown
              </button>
              <button
                onClick={handleExportHTML}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs font-medium transition-all"
              >
                <FileText size={14} className="text-orange-400" />
                Export as HTML
              </button>
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs font-medium transition-all"
              >
                <Copy size={14} className="text-green-400" />
                Copy raw content
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {isCode || viewMode === "raw" ? (
          <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        ) : (
          <div
            className={cn(
              "prose max-w-none text-sm",
              theme === "dark"
                ? "prose-invert prose-headings:text-white prose-p:text-gray-300 prose-a:text-cyan-400 prose-strong:text-cyan-300 prose-code:text-pink-400 prose-pre:bg-[#1a1a1a]"
                : "prose-stone"
            )}
          >
            <ReactMarkdown
              components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                      isGenerating={false}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Refine Input */}
      <div className="p-3 sm:p-4 border-t border-inherit flex gap-2 safe-area-bottom">
        <input
          type="text"
          placeholder="Refine this artifact..."
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm border",
            theme === "dark"
              ? "bg-black/40 border-white/10 placeholder-gray-600"
              : "bg-gray-50 border-black/10 placeholder-gray-400"
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

// Simple markdown to HTML converter for export
function renderMarkdownToHTML(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // Horizontal rules
    .replace(/^---$/gm, "<hr />")
    // Blockquotes
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Line breaks → paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  // Wrap in paragraphs
  html = "<p>" + html + "</p>";

  // Clean up list items into proper lists
  html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
    return "<ul>" + match + "</ul>";
  });

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>(<h[1-6]>)/g, "$1");
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<hr\s*\/?>)/g, "$1");
  html = html.replace(/(<hr\s*\/?>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");

  return html;
}
