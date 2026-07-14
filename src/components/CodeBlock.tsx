"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Code,
  ChevronRight,
  Zap,
  Sparkles,
  Brain,
  Cpu,
} from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
  isGenerating?: boolean;
  animationId?: string;
}

// ── AI Generation Phases ──────────────────────────────────────────────
const GENERATION_PHASES = [
  { icon: Zap, label: "AI Engine Initializing", color: "#3B82F6" },
  { icon: Brain, label: "Analyzing Request", color: "#8B5CF6" },
  { icon: Sparkles, label: "Generating Solution", color: "#06B6D4" },
  { icon: Cpu, label: "Optimizing Code", color: "#10B981" },
];

// ── Simple syntax highlighter ─────────────────────────────────────────
function highlightSyntax(line: string, language: string): React.ReactNode {
  if (!line.trim()) return <span>&nbsp;</span>;

  // Language-specific patterns
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

  // Combined pattern for strings, comments, numbers, keywords
  const combined = new RegExp(
    `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`|\\b\\d+\\.?\\d*\\b|${kwPattern.source})`,
    "g"
  );

  let match;
  while ((match = combined.exec(line)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t${lastIndex}`} className="code-text-default">
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];

    if (token.startsWith("//") || token.startsWith("/*")) {
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
      // Reset lastIndex after test
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

  // Remaining text
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
  animationId,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [phase, setPhase] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [newLineHighlight, setNewLineHighlight] = useState<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const prevVisibleRef = useRef(0);

  const lines = value.split("\n");
  const isSingleLine = lines.length <= 1;

  // ── Mark as animated when generation completes ──────────────────────
  useEffect(() => {
    if (!isGenerating && visibleLines > 0 && !typingDone) {
      hasAnimatedRef.current = true;
    }
  }, [isGenerating, visibleLines, typingDone]);

  // ── AI Generation Phase Animation (only if not already animated) ───
  useEffect(() => {
    if (!isGenerating || hasAnimatedRef.current) {
      setPhase(0);
      return;
    }
    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase = (currentPhase + 1) % GENERATION_PHASES.length;
      setPhase(currentPhase);
    }, 1800);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Line-by-line typing animation (only if not already animated) ───
  useEffect(() => {
    if (isSingleLine) {
      setVisibleLines(lines.length);
      setTypingDone(true);
      hasAnimatedRef.current = true;
      return;
    }

    // If already animated OR not generating, show all lines immediately
    if (hasAnimatedRef.current || !isGenerating) {
      setVisibleLines(lines.length);
      setTypingDone(true);
      hasAnimatedRef.current = true;
      return;
    }

    if (isGenerating && visibleLines === 0) {
      setVisibleLines(0);
      setTypingDone(false);
    }

    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          clearInterval(interval);
          setTypingDone(true);
          hasAnimatedRef.current = true;
          return prev;
        }
        const next = prev + 1;
        setNewLineHighlight(next - 1);
        setTimeout(() => setNewLineHighlight(null), 200);
        return next;
      });
    }, Math.max(25, Math.min(60, 300 / lines.length)));

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll during generation ─────────────────────────────────
  useEffect(() => {
    if (codeRef.current && visibleLines > prevVisibleRef.current) {
      const el = codeRef.current;
      const lastLine = el.querySelector(`[data-line="${visibleLines - 1}"]`);
      if (lastLine) {
        lastLine.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
    prevVisibleRef.current = visibleLines;
  }, [visibleLines]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${language || "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [value, language]);

  const displayedLines = typingDone || isSingleLine ? lines : lines.slice(0, visibleLines);
  const progress = isSingleLine ? 100 : Math.min(100, (visibleLines / lines.length) * 100);
  const langLower = (language || "").toLowerCase();

  return (
    <div
      className={`neon-code-container ${expanded ? "neon-code-expanded" : ""}`}
    >
      {/* ── Ambient Glow ────────────────────────────────────────────── */}
      <div className="neon-ambient-glow" />

      {/* ── Scanning Line ───────────────────────────────────────────── */}
      <div className="neon-scan-line" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="neon-header">
        <div className="neon-header-left">
          {/* Traffic lights */}
          <div className="neon-dots">
            <span className="neon-dot neon-dot-red" />
            <span className="neon-dot neon-dot-yellow" />
            <span className="neon-dot neon-dot-green" />
          </div>

          {/* Language badge */}
          <div className="neon-lang-badge">
            <Code size={11} />
            <span>{language || "code"}</span>
          </div>

          {/* Generation phases */}
          {isGenerating && !typingDone && (
            <div className="neon-phase" style={{ "--phase-color": GENERATION_PHASES[phase].color } as React.CSSProperties}>
              {React.createElement(GENERATION_PHASES[phase].icon, { size: 12 })}
              <span>{GENERATION_PHASES[phase].label}</span>
              <span className="neon-phase-dot" />
            </div>
          )}

          {/* Completion badge */}
          {!isGenerating && typingDone && (
            <div className="neon-complete-badge">
              <Check size={11} />
              <span>Code Ready</span>
            </div>
          )}
        </div>

        <div className="neon-header-right">
          {/* Copy */}
          <button onClick={handleCopy} className="neon-action-btn" title="Copy code">
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download */}
          <button onClick={handleDownload} className="neon-action-btn" title="Download file">
            <Download size={13} />
          </button>

          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="neon-action-btn"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ── Progress Bar ────────────────────────────────────────────── */}
      {isGenerating && !typingDone && (
        <div className="neon-progress-track">
          <div
            className="neon-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ── Code Content ────────────────────────────────────────────── */}
      <div ref={codeRef} className="neon-code-content">
        <div className="neon-code-lines">
          {displayedLines.map((line, i) => (
            <div
              key={i}
              data-line={i}
              className={`neon-code-line ${
                newLineHighlight === i ? "neon-line-highlight" : ""
              }`}
              style={{
                animationDelay: `${i * 30}ms`,
              }}
            >
              <span className="neon-line-number">
                {String(i + 1).padStart(String(lines.length).length, "0")}
              </span>
              <span className="neon-line-code">
                {highlightSyntax(line, langLower)}
              </span>
            </div>
          ))}
        </div>

        {/* Blinking cursor */}
        {!typingDone && visibleLines > 0 && (
          <div className="neon-cursor-row">
            <span className="neon-line-number">&nbsp;</span>
            <span className="neon-cursor" />
          </div>
        )}

        {/* Typing indicator */}
        {!typingDone && (
          <div className="neon-typing-indicator">
            <ChevronRight size={10} className="animate-pulse" />
            <span>generating...</span>
          </div>
        )}
      </div>

      {/* ── Bottom Glow Line ────────────────────────────────────────── */}
      <div className="neon-bottom-glow" />
    </div>
  );
}
