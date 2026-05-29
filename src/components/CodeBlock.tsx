import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-4 border border-zinc-800/40 bg-[#0d0d0d] font-mono text-xs sm:text-sm shadow-xl">
      {/* CodeBlock Header (ChatGPT style) */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-xs text-zinc-300 font-sans select-none">
        <span className="font-sans lowercase text-zinc-400">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors py-1 px-2 rounded hover:bg-zinc-700/50"
        >
          {copied ? (
            <>
              <Check size={12} className="text-[#a5b4fc]" />
              <span className="text-[#a5b4fc] font-medium text-[11px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="font-medium text-[11px]">Copy code</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Content */}
      <div className="overflow-x-auto p-4 text-[13px] sm:text-[14px] leading-relaxed select-text">
        <SyntaxHighlighter
          language={language || "javascript"}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "inherit",
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
