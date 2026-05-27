import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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
    <div className="relative group rounded-2xl overflow-hidden my-4 border border-white/10 bg-[#0d1117] font-mono text-sm shadow-xl">
      {/* CodeBlock Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/5 text-xs text-zinc-400">
        <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check size={13} className="text-cyan-400" />
              <span className="text-cyan-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span className="font-semibold">Copy code</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Content */}
      <div className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <SyntaxHighlighter
          language={language || "javascript"}
          style={vscDarkPlus}
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
