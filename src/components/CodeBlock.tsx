"use client";

import React, { useState, useCallback } from "react";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Code,
  Sparkles,
  Eye,
  WrapText,
  Play,
} from "lucide-react";
import LivePreviewWorkspace from "./LivePreviewWorkspace";

interface CodeBlockProps {
  language: string;
  value: string;
  isGenerating?: boolean;
  animationId?: string;
}

const EXT_MAP: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  jsx: "jsx",
  python: "py",
  py: "py",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  markdown: "md",
  md: "md",
  yaml: "yml",
  yml: "yml",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
  csharp: "cs",
  "c#": "cs",
  go: "go",
  rust: "rs",
  php: "php",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
};

function highlightSyntax(line: string, language: string): React.ReactNode {
  if (!line.trim()) return <span>&nbsp;</span>;

  const keywords: Record<string, RegExp> = {
    javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|switch|case|break|continue|do|in|of|yield|null|undefined|true|false)\b/g,
    typescript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|switch|case|break|continue|do|in|of|yield|null|undefined|true|false|interface|type|enum|implements|extends|abstract|private|protected|public|readonly|static|override)\b/g,
    python: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|None|True|False|self|print|async|await|global|nonlocal|del|assert)\b/g,
    java: /\b(public|private|protected|static|final|class|interface|extends|implements|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|super|import|package|void|int|long|double|float|boolean|char|String|byte|short|true|false|null)\b/g,
    html: /\b(html|head|body|div|span|p|a|img|ul|ol|li|h1|h2|h3|h4|h5|h6|table|tr|td|th|form|input|button|select|option|textarea|label|section|article|nav|header|footer|main|aside|meta|link|script|style|title)\b/g,
    css: /\b(color|background|margin|padding|border|display|position|width|height|font|text|align|justify|flex|grid|transition|animation|transform|opacity|overflow|z-index|top|left|right|bottom|cursor|content)\b/g,
    jsx: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false|useState|useEffect|useRef|useCallback|useMemo|useContext)\b/g,
    tsx: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false|interface|type|useState|useEffect|useRef|useCallback|useMemo|useContext)\b/g,
  };

  const lang = language?.toLowerCase() || "";
  const kwPattern = keywords[lang] || keywords.typescript || keywords.javascript;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const combined = new RegExp(
    `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`|\\b\\d+\\.?\\d*\\b|${kwPattern.source})`,
    "g"
  );

  let match;
  while ((match = combined.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t${lastIndex}`} className="code-text-default">
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];

    if (token.startsWith("//") || token.startsWith("/*") || (token.startsWith("#") && (lang === "python" || lang === "py" || lang === "bash" || lang === "sh" || lang === "yaml"))) {
      parts.push(
        <span key={`c${match.index}`} className="code-comment">
          {token}
        </span>
      );
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
      parts.push(
        <span key={`s${match.index}`} className="code-string">
          {token}
        </span>
      );
    } else if (/^\d/.test(token)) {
      parts.push(
        <span key={`n${match.index}`} className="code-number">
          {token}
        </span>
      );
    } else if (kwPattern.test(token)) {
      kwPattern.lastIndex = 0;
      parts.push(
        <span key={`k${match.index}`} className="code-keyword">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={`x${match.index}`} className="code-text-default">
          {token}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={`e${lastIndex}`} className="code-text-default">
        {line.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span className="code-text-default">{line}</span>;
}

export default function CodeBlock({
  language,
  value,
  isGenerating = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStudio, setShowStudio] = useState(false);

  const lines = (value || "").split("\n");
  const langLower = (language || "text").toLowerCase();
  const isPreviewable =
    (langLower === "html" ||
      langLower === "svg" ||
      langLower === "react" ||
      langLower === "tsx" ||
      langLower === "jsx" ||
      langLower === "javascript" ||
      langLower === "typescript" ||
      langLower === "js" ||
      langLower === "ts") &&
    value.trim().length > 20 &&
    !isGenerating;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const handleDownload = useCallback(() => {
    const ext = EXT_MAP[langLower] || langLower || "txt";
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [value, langLower]);

  return (
    <div className={`neon-code-container ${expanded ? "neon-code-expanded" : ""}`}>
      <div className="neon-ambient-glow" />
      <div className="neon-scan-line" />

      {/* Header */}
      <div className="neon-header">
        <div className="neon-header-left">
          <div className="neon-dots">
            <span className="neon-dot neon-dot-red" />
            <span className="neon-dot neon-dot-yellow" />
            <span className="neon-dot neon-dot-green" />
          </div>

          <div className="neon-lang-badge">
            <Code size={11} />
            <span>{language || "text"}</span>
            <span className="opacity-50 ml-1 text-[10px]">({lines.length} {lines.length === 1 ? "line" : "lines"})</span>
          </div>

          {isGenerating ? (
            <div className="neon-phase" style={{ "--phase-color": "#06B6D4" } as React.CSSProperties}>
              <Sparkles size={12} />
              <span>Streaming code…</span>
              <span className="neon-phase-dot" />
            </div>
          ) : (
            <div className="neon-complete-badge">
              <Check size={11} />
              <span>Ready</span>
            </div>
          )}
        </div>

        <div className="neon-header-right">
          {isPreviewable && (
            <>
              <button
                onClick={() => setShowStudio(true)}
                className="neon-action-btn font-semibold text-cyan-400 hover:text-cyan-300"
                title="Launch Live Preview Studio with Multi-Device Viewports"
              >
                <Play size={12} fill="currentColor" />
                <span>Live Studio</span>
              </button>
              <button
                onClick={() => setShowPreview((p) => !p)}
                className="neon-action-btn"
                title={showPreview ? "Show code" : "Quick preview"}
              >
                <Eye size={13} />
                <span>{showPreview ? "Code" : "Quick View"}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setWordWrap((w) => !w)}
            className="neon-action-btn"
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText size={13} />
          </button>

          <button onClick={handleCopy} className="neon-action-btn" title="Copy code">
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>

          <button onClick={handleDownload} className="neon-action-btn" title="Download code file">
            <Download size={13} />
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="neon-action-btn"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Live Preview or Code Content */}
      {showPreview && isPreviewable ? (
        <div className="w-full bg-white rounded-b-xl overflow-hidden border-t border-white/10">
          <iframe
            title="Live HTML Preview"
            srcDoc={value}
            sandbox="allow-scripts"
            className="w-full h-80 border-0"
          />
        </div>
      ) : (
        <div className="neon-code-content">
          <div className="neon-code-lines">
            {lines.map((line, i) => (
              <div
                key={i}
                data-line={i}
                className="neon-code-line"
                style={wordWrap ? { whiteSpace: "pre-wrap", wordBreak: "break-word" } : undefined}
              >
                <span className="neon-line-number">
                  {String(i + 1).padStart(String(lines.length).length, " ")}
                </span>
                <span className="neon-line-code">
                  {highlightSyntax(line, langLower)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="neon-bottom-glow" />

      {showStudio && (
        <LivePreviewWorkspace
          isOpen={showStudio}
          onClose={() => setShowStudio(false)}
          title={`${language || "Code"} App Preview`}
          initialCode={value}
          language={language}
        />
      )}
    </div>
  );
}
