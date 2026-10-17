"use client";

import React, { useState, useCallback, useEffect } from "react";
import { X, Copy, Check, Download, FileText, Code, Eye, Play, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

export type ArtifactType = "code" | "markdown" | "html" | "mermaid" | "doc" | "react";

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
  const isHtmlPreviewable =
    type === "html" ||
    /<!doctype html>|<html[\s>]|<body[\s>]|<div[\s>]/i.test(content);

  const [viewMode, setViewMode] = useState<"preview" | "rendered" | "raw">(
    isHtmlPreviewable ? "preview" : type === "code" ? "raw" : "rendered"
  );

  useEffect(() => {
    if (isHtmlPreviewable) {
      setViewMode("preview");
    } else if (type === "code" || type === "react") {
      setViewMode("raw");
    } else {
      setViewMode("rendered");
    }
  }, [type, title, isHtmlPreviewable]);

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
    const htmlContent = isHtmlPreviewable
      ? content
      : `<!DOCTYPE html>
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
  }, [content, title, isHtmlPreviewable]);

  if (!isOpen) return null;

  const displayType = type === "doc" ? "markdown" : type;

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-[100] w-full sm:max-w-xl border-l shadow-2xl flex flex-col",
        theme === "dark"
          ? "bg-[#0f0f0f] border-white/10 text-white"
          : "bg-white border-black/10 text-gray-900"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit safe-area-top">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-500">
            <Sparkles size={11} />
            <span>LikeWay Canvas · {displayType}</span>
          </div>
          <h2 className="font-bold truncate text-sm mt-0.5">{title || "Interactive Artifact"}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <div className="flex items-center bg-black/10 dark:bg-white/5 rounded-lg p-0.5 mr-1">
            {isHtmlPreviewable && (
              <button
                onClick={() => setViewMode("preview")}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1",
                  viewMode === "preview"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Interactive Live Preview"
              >
                <Play size={11} />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={() => setViewMode("rendered")}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1",
                viewMode === "rendered"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500 hover:text-gray-300"
              )}
              title="Rendered view"
            >
              <Eye size={11} />
              <span>Reader</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1",
                viewMode === "raw"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500 hover:text-gray-300"
              )}
              title="Source Code"
            >
              <Code size={11} />
              <span>Code</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            title="Copy to clipboard"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>

          <div className="relative group/export">
            <button
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Export artifact"
            >
              <Download size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-50 p-1.5">
              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs font-medium transition-all"
              >
                <FileText size={14} className="text-blue-400" />
                Export as Markdown (.md)
              </button>
              <button
                onClick={handleExportHTML}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs font-medium transition-all"
              >
                <FileText size={14} className="text-orange-400" />
                Export as HTML (.html)
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
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {viewMode === "preview" && isHtmlPreviewable ? (
          <div className="w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white">
            <iframe
              title={title || "Artifact Preview"}
              srcDoc={content}
              sandbox="allow-scripts"
              className="w-full h-full min-h-[420px] border-0"
            />
          </div>
        ) : viewMode === "raw" ? (
          <CodeBlock language={type === "code" ? "typescript" : type} value={content} isGenerating={false} />
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
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }: any) => <>{children}</>,
                code: ({ className, children, ...props }: any) => {
                  const match = /language-([\w+#.-]+)/.exec(className || "");
                  const isBlock = Boolean(match) || String(children).includes("\n");
                  return isBlock ? (
                    <CodeBlock
                      language={match?.[1] || "text"}
                      value={String(children).replace(/\n$/, "")}
                      isGenerating={false}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                table: ({ children, ...props }: any) => (
                  <div className="w-full my-4 overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 shadow-sm bg-black/[0.02] dark:bg-white/[0.02]">
                    <table className="w-full min-w-full text-left text-sm border-collapse" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children, ...props }: any) => (
                  <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-xs uppercase tracking-wider font-semibold text-gray-700 dark:text-gray-200" {...props}>
                    {children}
                  </thead>
                ),
                tbody: ({ children, ...props }: any) => (
                  <tbody className="divide-y divide-black/5 dark:divide-white/5" {...props}>
                    {children}
                  </tbody>
                ),
                th: ({ children, ...props }: any) => (
                  <th className="px-4 py-2 font-bold text-gray-900 dark:text-white whitespace-nowrap" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }: any) => (
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 align-top" {...props}>
                    {children}
                  </td>
                ),
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
          placeholder="Ask LikeWay to refine or add features to this artifact…"
          className={cn(
            "flex-1 rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:border-cyan-500/50",
            theme === "dark"
              ? "bg-black/40 border-white/10 placeholder-gray-500 text-white"
              : "bg-gray-50 border-black/10 placeholder-gray-400 text-gray-900"
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

function renderMarkdownToHTML(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^---$/gm, "<hr />")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  html = "<p>" + html + "</p>";
  html = html.replace(/(<li>.*<\/li>)/gs, (match) => "<ul>" + match + "</ul>");
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
