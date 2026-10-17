"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeft,
  Settings,
  Trash2,
  User,
  Mic,
  Monitor,
  ChevronDown,
  Paperclip,
  X,
  Image as ImageIcon,
  Search,
  MessageSquare,
  Plus,
  Globe,
  History,
  Briefcase,
  Star,
  Zap,
  Sun,
  Moon,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  MoreHorizontal,
  Check,
  Copy,
  ArrowUp,
  AudioLines,
  Edit,
  Bot,
  FolderPlus,
  Brain,
  ExternalLink,
  Sparkles,
  BookOpen,
  Cpu,
  Lock,
  FileText,
  Download,
  Video,
  Play
} from "lucide-react";


import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MODELS } from "@/lib/models";
import { PLANS, getCurrentPlan, PlanType, getBrowserAutomationRemaining, startBrowserTrial } from "@/lib/plans";
import { AgentMode } from "@/lib/agents";
import ArtifactPanel, { ArtifactType } from "@/components/ArtifactPanel";
import PersonaManager from "@/components/PersonaManager";
import CommandPalette from "@/components/CommandPalette";
import CodeBlock from "@/components/CodeBlock";
import VoiceOverlay from "@/components/VoiceOverlay";
import VoiceAssistant from "@/components/VoiceAssistant";
import PremiumVoiceInput from "@/components/PremiumVoiceInput";
import ConfirmDialog from "@/components/ConfirmDialog";
import AgentSelector from "@/components/AgentSelector";
import PricingModal from "@/components/PricingModal";
import VoiceCharacterSelector from "@/components/VoiceCharacterSelector";
import AccountMenu from "@/components/AccountMenu";
import SlashCommandMenu from "@/components/SlashCommandMenu";
import SupportModal from "@/components/SupportModal";
import LivePreviewWorkspace from "@/components/LivePreviewWorkspace";
import VisibleBrowserWorkspace from "@/components/VisibleBrowserWorkspace";
import ConnectedAppsModal from "@/components/ConnectedAppsModal";
import SuggestionChips from "@/components/chat/SuggestionChips";
import EmptyStateChips from "@/components/chat/EmptyStateChips";
import ModePills from "@/components/chat/ModePills";
import { cn } from "@/lib/utils";
import { consumeChatStream } from "@/hooks/useSSEChatStream";
import { cleanTextForSpeech } from "@/lib/voice-text";
import { type SlashCommand } from "@/lib/commands";
import {
  SEARCH_KEYWORDS,
  TIME_KEYWORDS,
  CODING_KEYWORDS_PATTERN,
  CODING_ACTION_PATTERN,
  REAL_TIME_TERM_PATTERN
} from "@/lib/constants";


function formatAIResponse(content: string) {
  if (!content) return "";

  let formatted = content;

  // Strip trailing <suggestions>...</suggestions> (or partial <suggestions> during streaming)
  formatted = formatted.replace(/<suggestions>[\s\S]*?(?:<\/suggestions>|$)/gi, "");

  // Self-close unclosed tags dynamically during progressive streaming
  const isThoughtOpen = formatted.includes("<thought>") && !formatted.includes("</thought>");
  if (isThoughtOpen) {
    formatted += "</thought>";
  }
  if (formatted.includes("<artifact") && !formatted.includes("</artifact>")) {
    formatted += "</artifact>";
  }

  // Format <thought> blocks into a clean ChatGPT/Claude-style collapsible reasoning section
  formatted = formatted.replace(/<thought>([\s\S]*?)<\/thought>/gi, (_match, thought) => {
    const cleanThought = thought
      .trim()
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n");
    const header = isThoughtOpen
      ? "> 🧠 **Thinking step-by-step…**"
      : "> 🧠 **Thought Process** *(Verified Reasoning)*";
    return `\n${header}\n>\n${cleanThought}\n\n`;
  });

  // Format <artifact ...> blocks with attributes in ANY order (id, type, language, title)
  formatted = formatted.replace(/<artifact([^>]*)>([\s\S]*?)<\/artifact>/gi, (_match, attrs, artifactContent) => {
    const typeMatch = /type="([^"]+)"/i.exec(attrs || "");
    const langMatch = /language="([^"]+)"/i.exec(attrs || "");
    const titleMatch = /title="([^"]+)"/i.exec(attrs || "");
    const aType = (typeMatch?.[1] || "code").toLowerCase();
    const aLang = langMatch?.[1] || (aType === "react" ? "tsx" : aType === "html" ? "html" : aType === "mermaid" ? "mermaid" : "");
    const aTitle = titleMatch?.[1] || "Interactive Artifact";
    const body = artifactContent.trim();

    if ((aType === "code" || aType === "react" || aType === "html" || aType === "mermaid") && !body.startsWith("```")) {
      return `\n\n> ✨ **Artifact Ready:** **${aTitle}** *(Opened in LikeWay Canvas)*\n\n\`\`\`${aLang || "tsx"}\n${body}\n\`\`\`\n\n`;
    }
    return `\n\n> ✨ **Document Artifact:** **${aTitle}**\n\n${body}\n\n`;
  });

  // Convert [source:Name] or [source:Name](url) into special links for SourceBadge rendering
  formatted = formatted.replace(/\[source:([^\]]+)\]\(([^)]+)\)/gi, (_match, name, url) => {
    return `[${name.trim()}](source://${encodeURIComponent(name.trim())}?url=${encodeURIComponent(url)})`;
  });
  formatted = formatted.replace(/\[source:([^\]]+)\]/gi, (_match, name) => {
    return `[${name.trim()}](source://${encodeURIComponent(name.trim())})`;
  });

  return formatted;
}

// ── Settings Helper Components ─────────────────────────────────────────
// Source Badge Component for inline citations
function SourceBadge({ name, url }: { name: string; url?: string }) {
  const getInitials = (n: string) => {
    const words = n.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Generate a consistent color from the name
  const getColor = (n: string) => {
    const colors = ['#c92228', '#0077B5', '#FF6600', '#1DA1F2', '#4267B2', '#E60023', '#333', '#6B46C1'];
    let hash = 0;
    for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const color = getColor(name);

  const badge = (
    <span className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-300 dark:hover:bg-white/20 transition-colors align-middle">
      <span 
        className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      {name}
    </span>
  );

  if (url) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className="no-underline">{badge}</a>;
  }
  return badge;
}

// Dynamic, premium interactive YouTube Video Component
function YoutubeCard({ ytId, titleText, href }: { ytId: string; titleText: string; href: string }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPlaying) {
    return (
      <span className="block my-4 w-full max-w-xl group/video">
        <span className="inline-flex items-center gap-2 text-[10px] font-extrabold mb-2 uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] relative">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute"></span>
          <span className="pl-3">{titleText} (Playing)</span>
        </span>
        <span className="block relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
            title={titleText}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          ></iframe>
        </span>
        <div className="flex items-center gap-4 mt-2.5">
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-400 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-bold transition-colors duration-200"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.516 3.5 12 3.5 12 3.5s-7.516 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.484 20.5 12 20.5 12 20.5s7.516 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch on YouTube
          </a>
          <button 
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-bold transition-colors duration-200"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 stroke-current text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                </svg>
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </span>
    );
  }

  return (
    <span className="block my-4 w-full max-w-xl group/video">
      <span className="inline-flex items-center gap-2 text-[10px] font-extrabold mb-2 uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] relative">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute"></span>
        <span className="pl-3">{titleText}</span>
      </span>
      
      {/* Dynamic Thumbnail Preview Card */}
      <span 
        onClick={() => setIsPlaying(true)}
        className="block relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 bg-zinc-900 cursor-pointer transition-all duration-500 group-hover/video:scale-[1.01] group-hover/video:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
      >
        {/* Background Thumbnail Image */}
        <img 
          src={thumbnailUrl} 
          alt={titleText} 
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover/video:scale-105"
          onError={(e) => {
            e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          }}
        />
        
        {/* Dark Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 transition-opacity duration-300 group-hover/video:opacity-90" />

        {/* Premium YouTube Red Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-11 bg-[#FF0000] rounded-[14px] flex items-center justify-center transition-all duration-300 shadow-[0_10px_30px_rgba(255,0,0,0.4)] group-hover/video:scale-110 group-hover/video:bg-[#E60000]">
            <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Video Duration / Subtitle indicator */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white/90 text-xs font-semibold">
          <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 fill-current text-rose-500" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.5-9H13V6c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1h4.5c.55 0 1-.45 1-1s-.45-1-1-1z" />
            </svg>
            Interactive Video
          </span>
          <span className="bg-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Click to Play</span>
        </div>
      </span>

      {/* Copy link and External play links */}
      <div className="flex items-center gap-4 mt-2.5">
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-400 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-bold transition-colors duration-200"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.516 3.5 12 3.5 12 3.5s-7.516 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.484 20.5 12 20.5 12 20.5s7.516 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Watch on YouTube
        </a>
        <button 
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-bold transition-colors duration-200"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 stroke-current text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </span>
  );
}

// Shared ReactMarkdown component map — renders step cards for ordered lists
// isGeneratingRef is read by CodeBlock via module-level variable to avoid re-mount
const _isGeneratingRef = { current: false };
function getIsGenerating() { return _isGeneratingRef.current; }
void getIsGenerating; // keep helper referenced; not a valid Next.js page export

// ── ID generators (module scope: impure by design — only called from event handlers) ──
function generateConversationId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomChars = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return timestamp + randomChars;
}

function generateUserMsgId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateAssistantMsgId(): string {
  return `msg_${Date.now()}_assistant`;
}

// Proper component for markdown images (download/copy actions need state → must be a component)
function MarkdownImage({ src, alt, ...props }: any) {
  const [copied, setCopied] = React.useState(false);
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src || '';
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleCopyImage = async () => {
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard.writeText(src || '');
    }
  };
  return (
    <span className="block my-4 w-full max-w-xl group/img">
      <span className="block relative w-full rounded-2xl overflow-hidden shadow-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
        <img
          src={src}
          alt={alt || "Generated Visual"}
          loading="lazy"
          className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover/img:scale-[1.02]"
          {...props}
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
          <button
            onClick={handleDownload}
            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-colors inline-flex"
            title="Download image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button
            onClick={handleCopyImage}
            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-colors inline-flex"
            title="Copy image"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        </span>
      </span>
    </span>
  );
}

function buildMarkdownComponents() {
  const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return {
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-6 my-3 space-y-2" {...props}>{children}</ol>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-6 my-2 space-y-1" {...props}>{children}</ul>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-[15px] leading-relaxed" {...props}>{children}</li>
    ),
    pre: ({ children }: any) => <>{children}</>,
    code: ({ className, children, ...props }: any) => {
      const match = /language-([\w+#.-]+)/.exec(className || '');
      const valueStr = String(children).replace(/\n$/, '');
      const isBlock = Boolean(match) || valueStr.includes('\n');
      return isBlock ? (
        <CodeBlock language={match?.[1] || 'text'} value={valueStr} isGenerating={_isGeneratingRef.current} />
      ) : (
        <code className={cn(className, "bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono")} {...props}>
          {children}
        </code>
      );
    },
    p: ({ children, ...props }: any) => (
      <p className="my-1.5 text-[15px] leading-relaxed" {...props}>{children}</p>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-cyan-600 dark:text-cyan-400" {...props}>{children}</strong>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-xl font-bold mt-6 mb-3" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-lg font-bold mt-5 mb-2" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-base font-bold mt-4 mb-2" {...props}>{children}</h3>
    ),
    a: ({ href, children, ...props }: any) => {
      // Inline Source Badge rendering
      if (href && href.startsWith("source://")) {
        const urlObj = new URL(href.replace("source://", "https://"));
        const name = decodeURIComponent(urlObj.pathname.replace("/", ""));
        const realUrl = urlObj.searchParams.get("url") ? decodeURIComponent(urlObj.searchParams.get("url")!) : undefined;
        return <SourceBadge name={name} url={realUrl} />;
      }
      
      const ytId = getYoutubeId(href || "");
      if (ytId) {
        const linkText = typeof children === "string" ? children : "";
        const titleText = (linkText && !linkText.startsWith("http")) ? linkText : "Recommended Video";
        return <YoutubeCard ytId={ytId} titleText={titleText} href={href} />;
      }
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-semibold underline" 
          {...props}
        >
          {children}
        </a>
      );
    },
    img: (props: any) => <MarkdownImage {...props} />,
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
    tr: ({ children, ...props }: any) => (
      <tr className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-4 py-2.5 font-bold text-gray-900 dark:text-white whitespace-nowrap" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 align-top" {...props}>
        {children}
      </td>
    ),
  };
}

const VOICE_CHARACTERS = [
  { id: 'kani',     name: 'Kani (தமிழ்)',     gender: 'female', desc: 'Tamil & Multilingual',  emoji: '🌸', keywords: ['ta-IN','ta_IN','Tamil','Valluvar','Kani','Google தமிழ்','Microsoft Kani','Rishi','Aria','Samantha'] },
  { id: 'valluvar', name: 'Valluvar (தமிழ்)', gender: 'male',   desc: 'Tamil & Multilingual',  emoji: '👑', keywords: ['ta-IN','ta_IN','Tamil','Valluvar','Google தமிழ்','Microsoft Valluvar','Rishi','David','Mark'] },
  { id: 'aria',     name: 'Aria',             gender: 'female', desc: 'Warm & Friendly',       emoji: '👩', keywords: ['Zira','Aria','Samantha','Google UK English Female','Microsoft Zira'] },
  { id: 'nova',     name: 'Nova',             gender: 'female', desc: 'Clear & Professional',  emoji: '👩‍💼', keywords: ['Google US English Female','Ava','Victoria','Karen','Moira','Tessa'] },
  { id: 'echo',     name: 'Echo',             gender: 'male',   desc: 'Deep & Confident',      emoji: '🧑', keywords: ['Google UK English Male','Daniel','Microsoft David','Fred'] },
  { id: 'spark',    name: 'Spark',            gender: 'female', desc: 'Bright & Energetic',    emoji: '👧', keywords: ['Google IN English Female','Rishi','Alex','Fiona'] },
  { id: 'atlas',    name: 'Atlas',            gender: 'male',   desc: 'Calm & Authoritative',  emoji: '🧑‍💻', keywords: ['Microsoft Mark','Google US English Male','Tom','Ralph'] },
  { id: 'luna',     name: 'Luna',             gender: 'female', desc: 'Soft & Soothing',       emoji: '🌙', keywords: ['Nicky','Amelie','Monica','Kyoko','Mei-Jia'] },
];

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [messages, setMessages] = useState<{ id?: string; role: string; content: string; status?: 'thinking' | 'typing' | 'streaming' | 'done' | 'searching' | 'generating'; animationPlayed?: boolean }[]>([]);
  const [input, setInput] = useState("");
  
  // High-performance streaming & scroll state
  const [isStreaming, setIsStreaming] = useState(false);
  // Follow-up "next step" chips emitted by the assistant after each answer
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bufferRef = useRef("");
  const [userScrolling, setUserScrolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isProgrammaticScroll = useRef(false);
  const isInitialLoad = useRef(true); // Prevent auto-scroll on history load
  const isSendingRef = useRef(false); // Prevent history load from clearing messages during send
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<{ title: string; content: string; type: ArtifactType } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [showBrowserWorkspace, setShowBrowserWorkspace] = useState(false);
  const [showConnectedApps, setShowConnectedApps] = useState(false);
  const [previewCustomCode, setPreviewCustomCode] = useState("");
  const [previewCustomTitle, setPreviewCustomTitle] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<AgentMode>("General");
  const [selectedAgentId, setSelectedAgentId] = useState("general");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isInputModelMenuOpen, setIsInputModelMenuOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [modelCategoryFilter, setModelCategoryFilter] = useState<"all" | "Claude" | "GPT" | "Other">("all");
  const [selectedModel, setSelectedModel] = useState(MODELS.find(m => m.id === "gpt-6-astra") || MODELS[0]);

  const filteredModelsList = useMemo(() => {
    let list = MODELS;
    if (modelCategoryFilter !== "all") {
      list = list.filter(m => m.category === modelCategoryFilter);
    }

    if (modelSearchQuery.trim()) {
      const q = modelSearchQuery.trim().toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [modelCategoryFilter, modelSearchQuery]);
  const [isExtendedThinking, setIsExtendedThinking] = useState(false);
  const [isWebSearchMode, setIsWebSearchMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isBrowserMode, setIsBrowserMode] = useState(false);
  const [isAutomationMode, setIsAutomationMode] = useState(false);
  const toggleBrowserMode = useCallback(() => {
    setIsBrowserMode(p => {
      const next = !p;
      setSelectedMode(next ? "Browser" : "General");
      return next;
    });
  }, []);
  const toggleAutomationMode = useCallback(() => {
    setIsAutomationMode(p => {
      const next = !p;
      setSelectedMode(next ? "Automation" : "General");
      return next;
    });
  }, []);
  const recognitionRef = useRef<any>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'acting' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [activeAppLaunch, setActiveAppLaunch] = useState<{ name: string; url: string; status?: string } | null>(null);
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [companionStatus, setCompanionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [companionInfo, setCompanionInfo] = useState<any>(null);
  const [computerPermissionMode, setComputerPermissionMode] = useState<'autonomous' | 'assisted' | 'chat_only'>('autonomous');

  useEffect(() => {
    const checkCompanion = async () => {
      try {
        const res = await fetch("http://127.0.0.1:4141/health", { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          setCompanionStatus('connected');
          setCompanionInfo(data);
        } else {
          setCompanionStatus('disconnected');
        }
      } catch {
        setCompanionStatus('disconnected');
      }
    };
    checkCompanion();
    const interval = setInterval(checkCompanion, 8000);
    return () => clearInterval(interval);
  }, []);
  const voiceRecognitionRef = useRef<any>(null);
  const voiceRecognitionActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const currentSpeakingTextRef = useRef('');
  const utteranceRef = useRef<any>(null);
  const speechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const speechHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  // Sentence-queue generation token (bumped to cancel in-flight speech) and
  // neural-TTS/Web Audio plumbing.
  const speechTokenRef = useRef(0);
  const neuralTtsAvailableRef = useRef<boolean | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const micPermissionGrantedRef = useRef(false);
  const [showVoiceCharSelector, setShowVoiceCharSelector] = useState(false);
  const [pendingVoiceLaunch, setPendingVoiceLaunch] = useState(false);
  const [selectedVoiceChar, setSelectedVoiceChar] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('likeway_voice_char') || 'aria';
    return 'aria';
  });
  const [customInstructions, setCustomInstructions] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('gemma_memory') || '';
    return '';
  });
  const [userId, setUserId] = useState<string>("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [switchUserIdInput, setSwitchUserIdInput] = useState("");

  useEffect(() => {
    const id = user?.id || localStorage.getItem('gemma_userId') || 'anonymous-user';
    setUserId(id);
  }, [user]);

  const [copiedMsgIndex, setCopiedMsgIndex] = useState<number | null>(null);
  const [sharedMsgIndex, setSharedMsgIndex] = useState<number | null>(null);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [msgFeedback, setMsgFeedback] = useState<Record<number, "up" | "down">>({});

  // Listen to new assistant messages and auto-open generated artifacts in side panel
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.status === "done") {
      const match = lastMsg.content.match(/<artifact([^>]*)>([\s\S]*?)<\/artifact>/i);
      if (match) {
        const [, attrs, content] = match;
        const typeMatch = /type="([^"]+)"/i.exec(attrs || "");
        const titleMatch = /title="([^"]+)"/i.exec(attrs || "");
        const rawType = (typeMatch?.[1] || "code").trim().toLowerCase();
        const title = (titleMatch?.[1] || "Generated Artifact").trim();
        const mappedType: ArtifactType =
          rawType === "doc" ? "markdown" : rawType === "react" ? "code" : (rawType as ArtifactType);
        setActiveArtifact({
          title,
          content: content.trim(),
          type: mappedType,
        });
        setIsArtifactOpen(true);
      }
    }
  }, [messages]);

  const markdownComponents = useMemo(() => buildMarkdownComponents(), []);

  const findVoiceForChar = (charId: string, textSample: string = '') => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const isTamilText = /[\u0B80-\u0BFF]/.test(textSample);
    const isHindiText = /[\u0900-\u097F]/.test(textSample);

    // 1. If text is Tamil or persona is Kani/Valluvar, prioritize Tamil voices
    if (isTamilText || charId === 'kani' || charId === 'valluvar') {
      const tamilVoice = voices.find(v => 
        v.lang?.toLowerCase().startsWith('ta') ||
        v.name.toLowerCase().includes('tamil') ||
        v.name.includes('தமிழ்') ||
        v.name.includes('Valluvar') ||
        v.name.includes('Kani')
      );
      if (tamilVoice) return tamilVoice;
    }

    // 2. If text is Hindi, prioritize Hindi voices
    if (isHindiText) {
      const hindiVoice = voices.find(v => v.lang?.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी'));
      if (hindiVoice) return hindiVoice;
    }

    // 3. Match by character keywords
    const char = VOICE_CHARACTERS.find(c => c.id === charId);
    if (char) {
      for (const kw of char.keywords) {
        const v = voices.find(v => v.name.includes(kw) || v.lang?.includes(kw));
        if (v) return v;
      }
      // Fallback by gender
      const genderFallback = voices.find(v => {
        const n = v.name.toLowerCase();
        return char.gender === 'female' ? (n.includes('female') || n.includes('zira') || n.includes('aria') || n.includes('samantha')) : (n.includes('male') || n.includes('david') || n.includes('mark'));
      });
      if (genderFallback) return genderFallback;
    }

    return voices[0] || null;
  };

  // Project state
  const [projects, setProjects] = useState<{_id: string; name: string; emoji: string; desc: string}[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectEmoji, setNewProjectEmoji] = useState('📁');
  const [recentConversations, setRecentConversations] = useState<{_id: string, title: string, updatedAt: Date}[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const localUserId = userId || 'anonymous-user';
      const res = await fetch("/api/chat/history/list", {
        headers: { "x-user-id": localUserId }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setRecentConversations(data);
          localStorage.setItem("likeway_recent_chats", JSON.stringify(data));
          return;
        }
      }
    } catch (err) {
      console.error("Failed to fetch recent conversations", err);
    }
    // Fallback: load from localStorage cache
    try {
      const cached = localStorage.getItem("likeway_recent_chats");
      if (cached) {
        setRecentConversations(JSON.parse(cached));
      }
    } catch {}
  };

  useEffect(() => {
    fetchProjects();
    fetchRecentConversations();
  }, [user]);

  const PROJECT_EMOJIS = ['📁','🎵','📱','🎬','💼','🚀','🎨','🌐','📊','🔬','✍️','🎮','🏆','⚡','🧠'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFiles(prev => [...prev, base64String]);
        setFilePreviews(prev => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
    setIsAttachmentMenuOpen(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          hasImage = true;
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setFiles(prev => [...prev, base64String]);
            setFilePreviews(prev => [...prev, base64String]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
    
    if (hasImage) {
      e.preventDefault();
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;
    Array.from(droppedFiles).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFiles(prev => [...prev, base64String]);
        setFilePreviews(prev => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        setMessages([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Play one base64 audio chunk (neural TTS) through the Web Audio API.
  // Handles raw PCM (audio/L16) and compressed formats.
  const playBase64Audio = async (b64: string, mimeType?: string): Promise<void> => {
    if (!audioCtxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) throw new Error("Web Audio unavailable");
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current!;
    if (ctx.state === "suspended") await ctx.resume();

    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    let buffer: AudioBuffer;
    if (/L16|pcm/i.test(mimeType || "")) {
      const rateMatch = /rate=(\d+)/i.exec(mimeType || "");
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      buffer = ctx.createBuffer(1, Math.max(1, pcm.length), sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    } else {
      buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    activeAudioSrcRef.current = src;
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start();
    });
    if (activeAudioSrcRef.current === src) activeAudioSrcRef.current = null;
  };

  const speakText = (text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    try { activeAudioSrcRef.current?.stop(); } catch {}
    activeAudioSrcRef.current = null;
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }

    // 1. Strip Artifacts and Tags for Speech
    const cleaned = cleanTextForSpeech(text);

    if (!cleaned) {
      isSpeakingRef.current = false;
      onEnd?.();
      return;
    }

    currentSpeakingTextRef.current = cleaned;

    const isTamilText = /[\u0B80-\u0BFF]/.test(cleaned);
    const isHindiText = /[\u0900-\u097F]/.test(cleaned);
    const isTamilChar = selectedVoiceChar === 'kani' || selectedVoiceChar === 'valluvar';

    // Split into sentences so the first words are audible almost immediately
    // and a long answer never stalls behind a single giant utterance.
    const sentences = cleaned
      .split(/(?<=[.!?।])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (sentences.length === 0) sentences.push(cleaned);

    const token = ++speechTokenRef.current;
    let hasEnded = false;
    const cleanupAndEnd = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      if (speechHeartbeatRef.current) {
        clearInterval(speechHeartbeatRef.current);
        speechHeartbeatRef.current = null;
      }
      isSpeakingRef.current = false;
      currentSpeakingTextRef.current = '';
      (window as any).__currentUtterance = null;
      onEnd?.();
    };

    const pickLang = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const tamilVoiceAvailable = allVoices.some(v =>
        v.lang?.toLowerCase().startsWith('ta') ||
        v.name.toLowerCase().includes('tamil') ||
        v.name.includes('தமிழ்')
      );
      if ((isTamilText || isTamilChar) && tamilVoiceAvailable) return 'ta-IN';
      if (isTamilChar && !tamilVoiceAvailable) {
        const warnKey = 'likeway_tamil_tts_warned';
        if (!sessionStorage.getItem(warnKey)) {
          sessionStorage.setItem(warnKey, '1');
          setLiveTranscript(
            '⚠️ Tamil voice not installed on this device. Speaking in English. To enable Tamil voice: Settings → Time & Language → Speech → Add voices → Tamil (India)'
          );
        }
        return 'en-IN';
      }
      if (isHindiText) return 'hi-IN';
      return 'en-IN';
    };

    const speakSentenceWithBrowser = (sentence: string) => new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(sentence);
      utteranceRef.current = u;
      (window as any).__currentUtterance = u; // pinned to window to avoid Chromium GC freeze
      u.rate = isTamilText ? 0.95 : 1.05;
      u.pitch = selectedVoiceChar === 'spark' ? 1.15 : selectedVoiceChar === 'luna' ? 0.9 : 1.0;
      u.lang = pickLang();
      const voice = findVoiceForChar(selectedVoiceChar, sentence);
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

    // Try a neural TTS chunk first; fall back to the browser voice silently.
    const tryNeuralSentence = async (sentence: string): Promise<boolean> => {
      if (neuralTtsAvailableRef.current === false) return false;
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: sentence }),
        });
        if (!res.ok) { neuralTtsAvailableRef.current = false; return false; }
        const data = await res.json();
        if (!data?.audioBase64) return false;
        await playBase64Audio(data.audioBase64, data.mimeType);
        neuralTtsAvailableRef.current = true;
        return true;
      } catch {
        neuralTtsAvailableRef.current = false;
        return false;
      }
    };

    isSpeakingRef.current = true;

    (async () => {
      const estimatedMs = Math.max(6000, Math.ceil((cleaned.length / 10) * 1000) + 6000);
      speechWatchdogRef.current = setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn("[Voice] Speech watchdog triggered completion recovery");
          cleanupAndEnd();
        }
      }, estimatedMs);

      for (const sentence of sentences) {
        if (speechTokenRef.current !== token || !isSpeakingRef.current) return;
        const played = await tryNeuralSentence(sentence);
        if (speechTokenRef.current !== token || !isSpeakingRef.current) return;
        if (!played) await speakSentenceWithBrowser(sentence);
      }
      cleanupAndEnd();
    })();
  };

  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processVoiceQuery = async (text: string) => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Cut off any ongoing speech immediately if user asks a new question
    // (barge-in): cancel the sentence queue AND any playing neural audio.
    speechTokenRef.current++;
    window.speechSynthesis.cancel();
    try { activeAudioSrcRef.current?.stop(); } catch {}
    activeAudioSrcRef.current = null;
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    if (speechHeartbeatRef.current) clearInterval(speechHeartbeatRef.current);
    isSpeakingRef.current = false;

    if (!text.trim()) {
      if (isVoiceMode) startVoiceListeningCycle();
      return;
    }
    setVoiceStatus('thinking');
    setInput(text);
    setUserScrolling(false);
    setShowScrollButton(false);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { id: `msg_${Date.now()}_user`, role: 'user', content: text }]);

    try {
      let fullContent = '';

      // 1. First attempt: Dedicated real-time Gemini Voice Chat API
      try {
        const voiceRes = await fetch('/api/voice-chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({ 
            prompt: text, 
            history, 
            userId: userId
          }),
        });

        if (voiceRes.ok) {
          const voiceData = await voiceRes.json();
          if (voiceData.success) {
            fullContent = voiceData.text || '';

            // Handle client navigation action
            if (voiceData.clientAction) {
              if (voiceData.clientAction === "open_pricing") setIsPricingOpen(true);
              else if (voiceData.clientAction === "open_account") setIsProfileModalOpen(true);
              else if (voiceData.clientAction === "new_chat") {
                setMessages([]);
                setActiveConversationId(null);
              }
            }

            // Handle direct App Launch (e.g. WhatsApp, YouTube, Google, etc.)
            if (voiceData.appLaunch) {
              const launchInfo = {
                name: voiceData.appLaunch.appName || voiceData.appLaunch.siteName || "Application",
                url: voiceData.appLaunch.targetUrl,
                status: "Opened",
              };
              setActiveAppLaunch(launchInfo);
              setVoiceStatus('acting');
              setLiveTranscript(`Opening ${launchInfo.name}...`);

              // Automatically open the application in a new window/tab
              try {
                const w = window.open(launchInfo.url, '_blank', 'noopener,noreferrer');
                if (w) {
                  w.focus();
                } else {
                  // Fallback synthetic link trigger
                  const link = document.createElement('a');
                  link.href = launchInfo.url;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  setTimeout(() => link.remove(), 100);
                }
              } catch (wErr) {
                console.warn("[Voice Assistant] Automatic window open fallback:", wErr);
                try {
                  const link = document.createElement('a');
                  link.href = launchInfo.url;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  setTimeout(() => link.remove(), 100);
                } catch (e) {}
              }
            } else if (voiceData.browserTask) {
              // Handle deep autonomous browser task
              setVoiceStatus('acting');
              const targetName = voiceData.browserTask.siteName || voiceData.browserTask.targetUrl || 'web page';
              setLiveTranscript(`Navigating to ${targetName}...`);

              if (voiceData.browserTask.targetUrl) {
                try {
                  const w = window.open(voiceData.browserTask.targetUrl, '_blank', 'noopener,noreferrer');
                  if (!w) {
                    const link = document.createElement('a');
                    link.href = voiceData.browserTask.targetUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => link.remove(), 100);
                  }
                } catch (wErr) {
                  console.warn("[Voice Assistant] Window open blocked:", wErr);
                }
              }

              if (!voiceData.browserTask.isDirectLaunch) {
                try {
                  setLiveTranscript(`Executing browser task: "${voiceData.browserTask.task}"...`);
                  const apiBase = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
                  const agentUrl = apiBase ? `${apiBase}/api/browser-agent` : '/api/browser-agent';
                  const browserRes = await fetch(agentUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      task: voiceData.browserTask.task,
                      startUrl: voiceData.browserTask.targetUrl,
                    }),
                  });
                  if (browserRes.ok) {
                    const browserData = await browserRes.json();
                    if (browserData.answer) {
                      fullContent = browserData.answer;
                    }
                    if (browserData.lastScreenshot) {
                      // Attach screenshot to conversation for visual verification
                      setMessages(prev => [
                        ...prev,
                        {
                          id: `msg_${Date.now()}_screenshot`,
                          role: 'assistant',
                          content: `![Browser Result](${browserData.lastScreenshot})\n\n**Browser Automation Result:** ${browserData.answer || 'Task completed.'}`,
                          status: 'done',
                        }
                      ]);
                    }
                  }
                } catch (bErr) {
                  console.warn("[Voice Assistant] Browser agent execution error:", bErr);
                }
              }
            }
          }
        }
      } catch (voiceErr) {
        console.warn("[Voice Assistant] /api/voice-chat error, attempting standard chat fallback:", voiceErr);
      }

      // 2. Fallback attempt: Standard streaming chat route
      if (!fullContent) {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({ 
            prompt: text, 
            modelId: selectedModel.id, 
            history, 
            mode: selectedMode, 
            plan: currentPlan, 
            isVoiceInteraction: isVoiceMode,
            userId: userId
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          await consumeChatStream(reader, {
            onDelta: (full) => {
              fullContent = full;
            },
          });
        }
      }

      if (!fullContent) {
        fullContent = "I heard you, but I couldn't get a clear response. Could you please repeat that?";
      }

      setMessages(prev => [...prev, { id: `msg_${Date.now()}_voice`, role: 'assistant', content: fullContent, status: 'done', animationPlayed: true }]);
      setInput('');
      setVoiceStatus('speaking');
      setLiveTranscript('');
      speakText(fullContent, () => {
        if (isVoiceMode) {
          setVoiceStatus('listening');
          startVoiceListeningCycle();
        } else {
          setVoiceStatus('idle');
        }
      });
    } catch {
      setVoiceStatus('idle');
      setIsVoiceMode(false);
    }
  };

  const handleVoiceOverlayTap = () => {
    if (voiceStatus === 'speaking') {
      // Interrupt the AI and immediately start listening again
      window.speechSynthesis.cancel();
      if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
      if (speechHeartbeatRef.current) clearInterval(speechHeartbeatRef.current);
      isSpeakingRef.current = false;
      setVoiceStatus('listening');
      startVoiceListeningCycle();
    } else if (voiceStatus === 'idle') {
      startVoiceListeningCycle();
    }
  };

  const startVoiceListeningCycle = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window as any).navigator?.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

      let message = "Speech recognition is not supported in this browser.";
      if (isIOS && !isStandalone) {
        message = "To use voice on iPhone:\n\n1. Tap the Share button\n2. Tap 'Add to Home Screen'\n3. Open Likeway from your home screen\n\nOr open this page in Safari.";
      } else if (isIOS && isStandalone) {
        message = "Voice not working? Try closing and reopening from your home screen.";
      } else {
        message = "Speech recognition is not supported. Please use Chrome, Edge, or Safari.";
      }

      setLiveTranscript(message);
      return;
    }

    // Request microphone permission once on initial start
    if (!micPermissionGrantedRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        micPermissionGrantedRef.current = true;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setLiveTranscript("Microphone permission required. Click the lock icon next to the address bar to allow microphone access, then tap to start.");
        } else if (err.name === 'NotFoundError') {
          setLiveTranscript("No microphone found. Please connect a microphone.");
        } else {
          setLiveTranscript("Could not access microphone: " + err.message);
        }
        return;
      }
    }

    // Permission granted — start speech recognition
    if (voiceRecognitionRef.current) {
      try { 
        voiceRecognitionRef.current.onstart = null;
        voiceRecognitionRef.current.onresult = null;
        voiceRecognitionRef.current.onerror = null;
        voiceRecognitionRef.current.onend = null;
        voiceRecognitionRef.current.stop(); 
      } catch(e) {}
    }
    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Dynamic Tamil & Multilingual Speech Recognition
    if (selectedVoiceChar === 'kani' || selectedVoiceChar === 'valluvar') {
      recognition.lang = 'ta-IN'; // Native Tamil speech recognition
    } else {
      recognition.lang = 'en-IN'; // Indian English / Tanglish / Global speech recognition
    }

    let finalResultProcessed = false;

    recognition.onstart = () => {
      voiceRecognitionActiveRef.current = true;
      if (!isSpeakingRef.current) {
        setVoiceStatus('listening');
      }
      setLiveTranscript('');
      finalResultProcessed = false;
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; ++i) {
        const chunk = event.results[i][0]?.transcript?.trim() || '';
        if (!chunk) continue;
        if (event.results[i].isFinal) {
          final += (final ? ' ' : '') + chunk;
        } else {
          interim += (interim ? ' ' : '') + chunk;
        }
      }
      
      const currentText = (final ? (interim ? `${final} ${interim}` : final) : interim).trim();
      
      // 2. Enhanced Barge-in Logic
      // If AI is speaking and user says something meaningful (not just a filler word)
      if (isSpeakingRef.current && currentText.length > 3) {
        const fillers = ["the", "and", "but", "yes", "no", "okay", "um", "uh"];
        const isFiller = fillers.includes(currentText.toLowerCase());
        
        if (!isFiller) {
          // Barge-in: stop the sentence queue and any playing neural audio.
          speechTokenRef.current++;
          window.speechSynthesis.cancel();
          try { activeAudioSrcRef.current?.stop(); } catch {}
          activeAudioSrcRef.current = null;
          if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
          if (speechHeartbeatRef.current) clearInterval(speechHeartbeatRef.current);
          isSpeakingRef.current = false;
          setVoiceStatus('listening');
          setLiveTranscript(currentText);
        }
      }

      if (!isSpeakingRef.current) {
        setLiveTranscript(currentText);
      }

      // Voice Activity Detection Silence Debounce: Auto-send after 650ms silence when speech is detected
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (currentText.length >= 2 && !finalResultProcessed && !isSpeakingRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (!finalResultProcessed && isVoiceMode && !isSpeakingRef.current) {
            finalResultProcessed = true;
            try { recognition.stop(); } catch(e) {}
            processVoiceQuery(currentText);
          }
        }, 650);
      }

      // Automatically process if user stops talking and browser emits final
      if (final && !finalResultProcessed && !isSpeakingRef.current) {
        finalResultProcessed = true;
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        try { recognition.stop(); } catch(e) {}
        processVoiceQuery(final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e.error);
      voiceRecognitionActiveRef.current = false;

      if (e.error === 'not-allowed') {
        setLiveTranscript("Microphone blocked. Click the lock icon in the address bar → Allow microphone → refresh page.");
        setVoiceStatus('idle');
        return;
      }
      if (e.error === 'no-speech') {
        if (isVoiceMode && !isSpeakingRef.current) {
          setTimeout(startVoiceListeningCycle, 400);
        }
        return;
      }
      if (e.error === 'audio-capture') {
        setLiveTranscript("No microphone found. Please connect a microphone.");
        setVoiceStatus('idle');
        return;
      }
      if (e.error === 'network') {
        setLiveTranscript("Network issue. Reconnecting voice listener...");
        if (isVoiceMode && !isSpeakingRef.current) {
          setTimeout(startVoiceListeningCycle, 600);
        }
        return;
      }

      if (isVoiceMode && e.error !== 'aborted' && !isSpeakingRef.current) {
        setTimeout(startVoiceListeningCycle, 500);
      }
    };

    recognition.onend = () => {
      voiceRecognitionActiveRef.current = false;
      // Robust Lifecycle Management
      if (isVoiceMode && voiceStatus !== 'thinking' && voiceStatus !== 'acting' && voiceStatus !== 'speaking') {
        if (voiceStatus === 'listening' && !finalResultProcessed) {
          setLiveTranscript(prev => {
            if (prev.trim().length > 1) {
              finalResultProcessed = true;
              processVoiceQuery(prev.trim());
            }
            return prev;
          });
        }
        if (!finalResultProcessed && !isSpeakingRef.current) {
          setTimeout(startVoiceListeningCycle, 150);
        }
      }
    };

    try {
      recognition.start();
    } catch(e) {}
  };

  // Keep continuous voice recognition alive with watchdog timer
  useEffect(() => {
    if (!isVoiceMode) return;
    const interval = setInterval(() => {
      if (
        isVoiceMode &&
        (voiceStatus === 'listening' || voiceStatus === 'idle') &&
        !isSpeakingRef.current &&
        !voiceRecognitionActiveRef.current
      ) {
        console.log("[Voice Watchdog] Re-arming voice listening cycle...");
        startVoiceListeningCycle();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isVoiceMode, voiceStatus]);

  const startVoiceAssistant = () => {
    const hasChosen = localStorage.getItem('likeway_voice_char');
    if (!hasChosen) {
      // First time: show character selector first
      setPendingVoiceLaunch(true);
      setShowVoiceCharSelector(true);
    } else {
      launchVoiceAssistant();
    }
  };

  const launchVoiceAssistant = () => {
    setIsVoiceMode(true);
    setVoiceStatus('listening');
    setActiveAppLaunch(null);
    // Preload voice list so it's warm when speakText() is called
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Trigger async load — browser fires onvoiceschanged once loaded
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    }
    setTimeout(() => startVoiceListeningCycle(), 300);
  };

  const stopVoiceAssistant = () => {
    window.speechSynthesis.cancel();
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    if (speechHeartbeatRef.current) clearInterval(speechHeartbeatRef.current);
    voiceRecognitionActiveRef.current = false;
    voiceRecognitionRef.current?.stop();
    isSpeakingRef.current = false;
    setIsVoiceMode(false);
    setVoiceStatus('idle');
    setActiveAppLaunch(null);
    setInput('');
    setLiveTranscript('');
  };
  const [settings, setSettings] = useState({
    experimental: false,
    highVelocity: true,
    voiceV2: false
  });
  const [currentPlan, setCurrentPlanState] = useState<PlanType>("Core");
  const [showBrowserTrialBanner, setShowBrowserTrialBanner] = useState(false);
  const [browserTrialInfo, setBrowserTrialInfo] = useState<{ remaining: number; trialDaysLeft?: number }>({ remaining: 0 });

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentPlanState(getCurrentPlan());
    const handlePlanUpdate = () => setCurrentPlanState(getCurrentPlan());
    window.addEventListener("plan_updated", handlePlanUpdate);
    return () => window.removeEventListener("plan_updated", handlePlanUpdate);
  }, []);

  useEffect(() => {
    if (user?.plan) {
      const norm = getCurrentPlan();
      setCurrentPlanState(norm);
    }
  }, [user?.plan]);

  // Check browser automation trial status
  useEffect(() => {
    const plan = getCurrentPlan();
    if (plan === "Core") {
      const info = getBrowserAutomationRemaining();
      setBrowserTrialInfo(info);
      if (info.reason === "trial" && info.trialDaysLeft && info.trialDaysLeft > 0) {
        setShowBrowserTrialBanner(true);
        startBrowserTrial(); // Ensure trial is tracked
      }
    }
  }, []);

  // Dynamically adjust input textbox height based on content size
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Load history on mount or when activeProject/activeConversationId changes
  useEffect(() => {
    // Skip history load if we're in the middle of sending a message
    // (handleSend sets activeConversationId which triggers this effect)
    if (isSendingRef.current) return;

    isInitialLoad.current = true; // Reset flag when switching chats
    async function loadHistory() {
      try {
        if (!activeProject && !activeConversationId) {
          setMessages([]);
          isInitialLoad.current = false;
          return;
        }

        let url = activeProject ? `/api/projects/${activeProject}` : "/api/chat";
        if (activeConversationId) {
          url = `/api/chat?conversationId=${activeConversationId}`;
        }

        const localUserId = userId || 'anonymous-user';
        const res = await fetch(url, {
            headers: { "x-user-id": localUserId }
        });
        if (res.ok) {
          const loadedHistory = await res.json();
          // Double-check we haven't started sending while fetch was in flight
          if (!isSendingRef.current) {
            setMessages(loadedHistory || []);
          }
          // Jump instantly to the bottom
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            isInitialLoad.current = false;
          }, 80);
        } else {
          if (!isSendingRef.current) {
            setMessages([]);
          }
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error("Failed to load history", err);
        isInitialLoad.current = false;
      }
    }
    loadHistory();
  }, [activeProject, activeConversationId]);


  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    if (chatContainerRef.current) {
      isProgrammaticScroll.current = true;
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
      // Reset after a delay to allow scroll to complete
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, behavior === "smooth" ? 500 : 50);
    }
  }

  function handleScroll() {
    if (isProgrammaticScroll.current) return;

    const el = chatContainerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (!atBottom) {
      setUserScrolling(true);
      setShowScrollButton(true);
    } else {
      setUserScrolling(false);
      setShowScrollButton(false);
    }
  }

  // Auto scroll during active streaming (like ChatGPT)
  useEffect(() => {
    if (isInitialLoad.current) return; // Skip during history load
    if (isStreaming && chatContainerRef.current) {
      const el = chatContainerRef.current;
      // If user is near the bottom (less than 150px away) and NOT scrolling manually, keep them pinned to bottom
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (atBottom && !userScrolling) {
        requestAnimationFrame(() => scrollToBottom("auto"));
      }
    }
  }, [isStreaming, userScrolling]);

  // Auto scroll when user sends a NEW message
  useEffect(() => {
    if (isInitialLoad.current) return; // Skip during history load
    if (!userScrolling && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      // Only scroll for live statuses: new thinking/typing events
      if (lastMsg?.status === 'thinking' || lastMsg?.status === 'typing') {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
    }
  }, [messages]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function handleSend(e?: React.FormEvent, overrideMessage?: string) {
    if (e) e.preventDefault();
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend || isLoading) return;

    // A new turn starts: clear the previous follow-up chips.
    setSuggestions([]);

    // Mark sending state to prevent history load from clearing messages
    isSendingRef.current = true;

    // Cut off any ongoing speech if user types a new message
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    if (voiceStatus === 'speaking') {
      setVoiceStatus('idle');
    }

    const userMessage = messageToSend;
    // Exclude system message placeholding states (thinking, typing, searching) and messages with empty content from history payload
    const history = messages
      .filter(m => m.content && m.content.trim() !== "" && m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    let conversationIdToUse = activeConversationId;
    if (!conversationIdToUse && !activeProject) {
      conversationIdToUse = generateConversationId();
      setActiveConversationId(conversationIdToUse);
    }

    const msgId = generateUserMsgId();
    setMessages(prev => [...prev, { id: msgId, role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);
    setUserScrolling(false);
    setShowScrollButton(false);

    // Strictly programming keywords to avoid false positives on simple questions like "what is"
    const isCodingQ = CODING_KEYWORDS_PATTERN.test(userMessage) && CODING_ACTION_PATTERN.test(userMessage);

    // Terms that always indicate real-time financial, currency, weather, or political lookup
    const hasRealTimeTerm = REAL_TIME_TERM_PATTERN.test(userMessage);

    // Detect image generation requests
    const isImageRequest = /\b(generate|create|make|draw|design|paint|render|produce)\s+(an?\s+)?(image|picture|photo|photograph|illustration|artwork|art|portrait|wallpaper|logo|banner|sketch|graphic)\b/i.test(userMessage) ||
      /\b(image|picture|photo|portrait|wallpaper)\s+of\b/i.test(userMessage);

    const needsSearch =
      !isImageRequest && (
        isWebSearchMode ||
        hasRealTimeTerm ||
        SEARCH_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) ||
        (TIME_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) && !isCodingQ)
      );
    const assistantMsgId = generateAssistantMsgId();
    setMessages(prev => [...prev, { 
      id: assistantMsgId,
      role: "assistant", 
      content: "", 
      status: isImageRequest ? 'generating' : needsSearch ? 'searching' : (isExtendedThinking ? 'thinking' : 'typing'),
      animationPlayed: false
    }]);

    // Helper: make a single chat API call and stream it
    const attemptChat = async (modelId: string, trimHistory: boolean, signal?: AbortSignal) => {
      const res = await fetch("/api/chat", {
        signal,
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          prompt: userMessage,
          modelId,
          history: trimHistory ? history.slice(-4) : history,
          images: files.map((f, i) => ({
            id: `img${i}`,
            url: f,
            mimeType: f.split(';')[0].replace('data:', '')
          })),
          mode: selectedMode,
          plan: currentPlan,
          projectId: activeProject || "default",
          customInstructions,
          experimental: settings.experimental,
          extendedThinking: isExtendedThinking,
          webSearch: isWebSearchMode,
          userId: userId,
          conversationId: conversationIdToUse
        }),
      });
      return res;
    };

    const FALLBACK_MODELS = [
      { id: selectedModel.id, trim: false },
      { id: "mistral-small-latest", trim: true },
      { id: "mistral-medium-latest", trim: true },
    ];

    try {
      // Check browser automation limits before sending
      if (selectedMode === "Browser" || selectedMode === "Automation") {
        const browserInfo = getBrowserAutomationRemaining();
        if (!browserInfo.allowed) {
          const messages: Record<string, string> = {
            trial_expired: "Your 2-day free browser automation trial has ended. Upgrade to Go (50/day), Plus, or Pro (unlimited) to continue.",
            quota_exceeded: "You've used all your browser automation requests for today. Upgrade for more or try again tomorrow.",
            no_access: "Browser automation requires a paid plan. Upgrade to Go, Plus, or Pro.",
          };
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              role: "assistant",
              content: messages[browserInfo.reason] || "Browser automation not available.",
              status: 'done',
              animationPlayed: true
            };
            return copy;
          });
          return;
        }
        // Track usage
        const { trackBrowserAutomationUse } = await import("@/lib/plans");
        trackBrowserAutomationUse();
      }

      const abortController = new AbortController();
      abortRef.current = abortController;
      // Browser/automation mode needs longer timeout (up to 5 min)
      const isLongRunningMode = selectedMode === "Browser" || selectedMode === "Automation";
      const timeoutMs = isLongRunningMode ? 300000 : 60000;
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      let res: Response | null = null;
      let statusErrorMsg: string | null = null;

      for (const attempt of FALLBACK_MODELS) {
        if (abortController.signal.aborted) break;
        try {
          const r = await attemptChat(attempt.id, attempt.trim, abortController.signal);
          if (r.ok && r.body) {
            res = r;
            break;
          }
          // Do not blindly retry on 400/402/403/429 (plan entitlement, model lock, or rate limit)
          if (r.status === 400 || r.status === 402 || r.status === 403 || r.status === 429) {
            const errJson = await r.json().catch(() => ({}));
            statusErrorMsg = errJson.error || `Request denied (${r.status}).`;
            if (errJson.upgradeTo) {
              statusErrorMsg += `\n\n👉 **[Upgrade to ${errJson.upgradeTo}](/pricing?plan=${errJson.upgradeTo})** to unlock this feature immediately.`;
            }
            break;
          }
          console.warn(`[Client Failover] Model ${attempt.id} failed (${r.status}). Trying next...`);
        } catch (e) {
          console.warn(`[Client Failover] Model ${attempt.id} error:`, e);
        }
      }

      clearTimeout(timeoutId);

      if (!res || !res.ok || !res.body) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            role: "assistant",
            content: statusErrorMsg || "All models are currently unavailable. Try again in a moment.",
            status: 'done',
            animationPlayed: true
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;

      // Transition the placeholder message to streaming mode smoothly
      setIsStreaming(true);
      bufferRef.current = "";

      const { fullContent, sawDone } = await consumeChatStream(reader, {
        onDelta: (full) => {
          bufferRef.current = full;
          setMessages(prev => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = { ...copy[lastIdx], role: "assistant", content: full, status: 'streaming' };
            }
            return copy;
          });
        },
        onSuggestions: (items) => setSuggestions(items),
        onReadError: (readErr: any) => {
          if (readErr?.name === "AbortError" || readErr?.message?.includes("aborted") || readErr?.message?.includes("BodyStreamBuffer")) {
            console.log("Stream reader aborted");
          } else {
            console.error("Stream read error:", readErr);
          }
        },
      });

      // Finalize the assistant message whether the stream ended with [DONE]
      // or the connection closed early (partial answer still shown).
      {
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
            copy[lastIdx] = { ...copy[lastIdx], role: "assistant", content: fullContent, status: 'done', animationPlayed: true };
          } else {
            copy.push({ id: `msg_${Date.now()}_done`, role: "assistant", content: fullContent, status: 'done', animationPlayed: true });
          }
          return copy;
        });
        setIsStreaming(false);
        bufferRef.current = "";
        setFiles([]);
        setFilePreviews([]);
        fetchRecentConversations();
        try {
          const cached = JSON.parse(localStorage.getItem("likeway_recent_chats") || "[]");
          const idx = cached.findIndex((c: any) => c._id === conversationIdToUse);
          const entry = { _id: conversationIdToUse, title: userMessage.substring(0, 40), updatedAt: new Date() };
          if (idx >= 0) cached[idx] = entry; else cached.unshift(entry);
          localStorage.setItem("likeway_recent_chats", JSON.stringify(cached.slice(0, 50)));
        } catch {}
      }
    } catch (err: any) {
      // Gracefully handle abort (user clicked stop or timeout)
      if (err.name === "AbortError" || err.message?.includes("aborted") || err.message?.includes("BodyStreamBuffer")) {
        console.log("Request aborted by user or timeout");
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
            const content = copy[lastIdx].content || "Request was stopped.";
            copy[lastIdx] = { ...copy[lastIdx], content, status: 'done', animationPlayed: true };
          }
          return copy;
        });
      } else {
        console.error("Frontend Send Error:", err);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: "All models are currently unavailable. Try again in a moment.", status: 'done', animationPlayed: true };
          return copy;
        });
      }
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
      readerRef.current = null;
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }

  async function handleEditSubmit(index: number, newText: string) {
    if (!newText.trim() || isLoading) return;
    setEditingMessageIndex(null);

    // Cut off any ongoing speech
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    if (voiceStatus === 'speaking') {
      setVoiceStatus('idle');
    }

    // 1. Prepare the updated messages history up to index (exclusive)
    const historyMessages = messages.slice(0, index);
    const history = historyMessages
      .filter(m => m.content && m.content.trim() !== "" && m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    const userMessage = newText.trim();

    // 2. Truncate subsequent messages and set the updated user message at index
    const updatedMessages = [...historyMessages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);
    setUserScrolling(false);
    setShowScrollButton(false);

    let conversationIdToUse = activeConversationId;
    if (!conversationIdToUse && !activeProject) {
      conversationIdToUse = generateConversationId();
      setActiveConversationId(conversationIdToUse);
    }

    const isCodingQ = CODING_KEYWORDS_PATTERN.test(userMessage) && CODING_ACTION_PATTERN.test(userMessage);
    const hasRealTimeTerm = REAL_TIME_TERM_PATTERN.test(userMessage);
    const isImageRequest = /\b(generate|create|make|draw|design|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|art|poster|wallpaper|logo|banner)\b/i.test(userMessage);

    const needsSearch =
      !isImageRequest && (
        hasRealTimeTerm ||
        SEARCH_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) ||
        (TIME_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) && !isCodingQ)
      );

    const assistantMsgId = generateAssistantMsgId();
    setMessages(prev => [...prev, { 
      id: assistantMsgId,
      role: "assistant", 
      content: "", 
      status: isImageRequest ? 'generating' : needsSearch ? 'searching' : 'typing',
      animationPlayed: false
    }]);

    const attemptChat = async (modelId: string, trimHistory: boolean, signal?: AbortSignal) => {
      const res = await fetch("/api/chat", {
        signal,
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          prompt: userMessage,
          modelId,
          history: trimHistory ? history.slice(-4) : history,
          images: files.map((f, i) => ({
            id: `img${i}`,
            url: f,
            mimeType: f.split(';')[0].replace('data:', '')
          })),
          mode: selectedMode,
          plan: currentPlan,
          projectId: activeProject || "default",
          customInstructions,
          experimental: settings.experimental,
          extendedThinking: isExtendedThinking,
          webSearch: isWebSearchMode,
          userId: userId,
          conversationId: conversationIdToUse
        }),
      });
      return res;
    };

    const FALLBACK_MODELS = [
      { id: selectedModel.id, trim: false },
      { id: "mistral-small-latest", trim: true },
      { id: "mistral-medium-latest", trim: true },
    ];

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;
      // Browser/automation mode needs longer timeout (up to 5 min)
      const isLongRunningMode = selectedMode === "Browser" || selectedMode === "Automation";
      const timeoutMs = isLongRunningMode ? 300000 : 60000;
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      let res: Response | null = null;
      let statusErrorMsg: string | null = null;
      for (const attempt of FALLBACK_MODELS) {
        if (abortController.signal.aborted) break;
        try {
          const r = await attemptChat(attempt.id, attempt.trim, abortController.signal);
          if (r.ok && r.body) {
            res = r;
            break;
          }
          if (r.status === 400 || r.status === 402 || r.status === 403 || r.status === 429) {
            const errJson = await r.json().catch(() => ({}));
            statusErrorMsg = errJson.error || `Request denied (${r.status}).`;
            if (errJson.upgradeTo) {
              statusErrorMsg += `\n\n👉 **[Upgrade to ${errJson.upgradeTo}](/pricing?plan=${errJson.upgradeTo})** to unlock this feature immediately.`;
            }
            break;
          }
          console.warn(`[Client Failover] Model ${attempt.id} failed (${r.status}). Trying next...`);
        } catch (e) {
          console.warn(`[Client Failover] Model ${attempt.id} error:`, e);
        }
      }

      clearTimeout(timeoutId);

      if (!res || !res.ok || !res.body) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            role: "assistant",
            content: statusErrorMsg || "All models are currently unavailable. Try again in a moment.",
            status: 'done',
            animationPlayed: true
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      let fullContent = "";
      let streamingStarted = false;

      await consumeChatStream(reader, {
        onDelta: (full) => {
          fullContent = full;
          if (!streamingStarted) {
            setIsStreaming(true);
            streamingStarted = true;
          }
          setMessages(prev => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = {
                ...copy[lastIdx],
                role: "assistant",
                content: fullContent,
                status: 'streaming'
              };
            }
            return copy;
          });
        },
        onSuggestions: (items) => setSuggestions(items),
        onReadError: (readErr: any) => {
          if (readErr?.name === "AbortError" || readErr?.message?.includes("aborted") || readErr?.message?.includes("BodyStreamBuffer")) {
            console.log("Edit request aborted");
          } else {
            console.error("Stream read error:", readErr);
          }
        },
      });

      // Finalize the edited assistant message once streaming completes.
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = { ...copy[lastIdx], role: "assistant", content: fullContent, status: 'done', animationPlayed: true };
        } else {
          copy.push({ id: `msg_${Date.now()}_done`, role: "assistant", content: fullContent, status: 'done', animationPlayed: true });
        }
        return copy;
      });
      setIsStreaming(false);
      fetchRecentConversations();
    } catch (err: any) {
      // Gracefully handle abort
      if (err.name === "AbortError" || err.message?.includes("aborted") || err.message?.includes("BodyStreamBuffer")) {
        console.log("Edit request aborted");
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
            const content = copy[lastIdx].content || "Request was stopped.";
            copy[lastIdx] = { ...copy[lastIdx], content, status: 'done', animationPlayed: true };
          }
          return copy;
        });
      } else {
        console.error("Frontend Edit Submit Error:", err);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: "All models are currently unavailable. Try again in a moment.", status: 'done', animationPlayed: true };
          return copy;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      readerRef.current = null;
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }

  return (
    <div className={cn("flex h-dvh w-full overflow-hidden font-sans safe-area-top safe-area-bottom",
      theme === 'dark' ? "bg-[#212121] text-white" : "bg-[#FFFFFF] text-gray-900"
    )}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, pushes content on desktop (ChatGPT-style) */}
      <aside className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isSidebarOpen ? "w-64" : "w-0",
        /* Mobile: fixed overlay; Desktop: in-flow flex child that pushes main */
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[70]",
        "md:relative",
        theme === 'dark' ? "bg-[#171717] text-gray-300" : "bg-[#F7F7F8] border-r border-[#E5E5E5] text-gray-700"
      )}>
        <div className="w-64 flex flex-col h-full p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-6 px-1">
            <button
              onClick={() => {
                setActiveProject(null);
                setActiveConversationId(null);
                setMessages([]);
              }}
              className="flex flex-col leading-none hover:opacity-70 transition-opacity"
            >
              <span className={cn("text-base md:text-lg font-black tracking-widest uppercase", theme === 'dark' ? "text-white" : "text-gray-900")}>LIKEWAY</span>
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="hidden md:block p-2 hover:bg-white/10 hover:bg-black/5 rounded-xl text-gray-400 hover:text-cyan-400 transition-all" title="Close sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M9 3v18"/>
                <path d="M14 15l-3-3 3-3"/>
              </svg>
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 hover:bg-white/10 hover:bg-black/5 rounded-lg text-gray-400">
              <X size={18} />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-6">
          <div className="space-y-0.5">
            <button 
              onClick={() => {
                setActiveConversationId(null);
                setMessages([]);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
              )}
            >
              <div className="flex items-center gap-3">
                <Edit size={16} />
                New chat
              </div>
              <span className="text-[10px] text-gray-500 font-mono hidden md:block">Ctrl + Shift + O</span>
            </button>
            
            <button 
              onClick={() => setIsCommandPaletteOpen(true)}
              className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
            )}>
              <div className="flex items-center gap-3">
                <Search size={16} />
                Search chats
              </div>
              <span className="text-[10px] text-gray-500 font-mono hidden md:block">Ctrl + K</span>
            </button>

            <a 
              href="/learn"
              className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
            )}>
              <BookOpen size={16} />
              Learn
            </a>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
            )}>
              <Settings size={16} />
              Settings
            </button>
          </div>

          
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 mb-1 flex items-center justify-between">
              <span>Projects</span>
              {projects.length > 0 && (
                <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded-full">{projects.length}</span>
              )}
            </h3>
            <div className="space-y-0.5">
              <button 
                onClick={() => setIsNewProjectModalOpen(true)}
                className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                theme === 'dark' ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700"
              )}>
                <FolderPlus size={16} />
                New project
              </button>

              {projects.map((project) => (
                <div key={project._id} className="group relative">
                  <button 
                    onClick={() => { setInput(""); setActiveProject(project._id); setIsSidebarOpen(false); }}
                    className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium pr-10",
                    activeProject === project._id
                      ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-gray-900")
                      : (theme === 'dark' ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")
                  )}>
                    <span className="text-base shrink-0">{project.emoji || "📁"}</span>
                    <span className="truncate text-left flex-1">{project.name}</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        open: true,
                        title: "Delete project?",
                        message: `This will permanently delete "${project.name}" and all its conversations. This action cannot be undone.`,
                        onConfirm: async () => {
                          try {
                            const res = await fetch(`/api/projects/${project._id}`, { method: "DELETE" });
                            if (res.ok) {
                              setProjects(prev => prev.filter(p => p._id !== project._id));
                              if (activeProject === project._id) setActiveProject(null);
                            }
                          } catch (err) {
                            console.error("Failed to delete project", err);
                          }
                          setConfirmDialog(prev => ({ ...prev, open: false }));
                        },
                      });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

            </div>
          </div>

          {recentConversations.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 mb-1 flex items-center gap-2">
                <History size={12} />
                Recents
              </h3>
              <div className="space-y-0.5">
                {recentConversations.map((conv) => (
                  <div key={conv._id} className="group relative">
                    <button 
                      onClick={() => { 
                        setActiveProject(null); 
                        setActiveConversationId(conv._id); 
                        setIsSidebarOpen(false); 
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium pr-10",
                        activeConversationId === conv._id
                          ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-gray-900")
                          : (theme === 'dark' ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")
                      )}
                    >
                      <MessageSquare size={14} className="shrink-0 opacity-60" />
                      <span className="truncate text-left flex-1">{conv.title}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          open: true,
                          title: "Delete conversation?",
                          message: `This will permanently delete "${conv.title}". This action cannot be undone.`,
                          onConfirm: async () => {
                            try {
                              const res = await fetch(`/api/chat/history/${conv._id}`, {
                                method: "DELETE",
                                headers: { "x-user-id": userId }
                              });
                              if (res.ok) {
                                fetchRecentConversations();
                                if (activeConversationId === conv._id) {
                                  setActiveConversationId(null);
                                  setMessages([]);
                                }
                              }
                            } catch (err) {
                              console.error("Failed to delete conversation", err);
                            }
                            setConfirmDialog(prev => ({ ...prev, open: false }));
                          },
                        });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={cn("mt-2 pt-2 border-t space-y-1", theme === 'dark' ? "border-white/10" : "border-black/10")}>
          {currentPlan === "Core" && (
            <button
              onClick={() => setIsPricingOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30"
            >
              <Sparkles size={16} />
              Upgrade to Pro
            </button>
          )}
          <AccountMenu />
        </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-w-0 flex flex-col overflow-hidden",
        theme === 'dark' ? "bg-[#212121] text-white" : "bg-[#FFFFFF] text-[#1a1a1a]"
      )}>
        {/* ChatGPT-style 56px header */}
        <header className="chat-header h-12 sm:h-11 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 z-50 transition-colors duration-300 safe-area-top">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger: always on desktop; on mobile, hide when sidebar overlay is open */}
            <button onClick={() => setIsSidebarOpen(true)} className={cn(
              "chat-menu-btn rounded-lg transition-all",
              isSidebarOpen && "max-md:hidden",
              theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5"
            )} title="Open Sidebar">
              <PanelLeft size={20} />
            </button>
            {/* Model & Agent selectors — always on desktop; on mobile, hide when sidebar is open */}
            <div className={cn(isSidebarOpen && "max-md:hidden")}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn(
                  "px-2.5 py-1 rounded-lg border flex items-center gap-2 cursor-pointer transition-all backdrop-blur-md",
                  theme === 'dark' ? "bg-[#212121]/50 border-white/10 text-gray-300 hover:bg-[#212121]/80" : "bg-white/50 border-black/10 text-gray-700 hover:bg-white/80"
                )} onClick={() => setIsInputModelMenuOpen(true)}>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className={cn("text-[11px] font-bold")}>
                    {selectedModel.name} <span className="hidden sm:inline opacity-60">Model</span>
                  </span>
                  <ChevronDown size={12} className="text-gray-500" />
                </div>

                <AgentSelector
                  selectedAgentId={selectedAgentId}
                  onSelect={(agent) => {
                    setSelectedAgentId(agent.id);
                    const modeMap: Record<string, AgentMode> = {
                      general: "General",
                      research: "Researcher",
                      coding: "Architect",
                      creative: "Creative",
                      productivity: "General",
                      analysis: "Researcher",
                      automation: "General",
                      specialized: "General",
                    };
                    setSelectedMode(modeMap[agent.category] || "General");
                  }}
                  currentPlan={currentPlan}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Preview Studio Button */}
            <button
              onClick={() => {
                if (!previewCustomCode && !activeArtifact) {
                  for (let i = messages.length - 1; i >= 0; i--) {
                    const match = messages[i]?.content?.match(/```(?:tsx|jsx|html|javascript|typescript|react)?\n([\s\S]*?)```/);
                    if (match) {
                      setPreviewCustomCode(match[1]);
                      setPreviewCustomTitle("Generated Application");
                      break;
                    }
                  }
                }
                setShowLivePreview(true);
              }}
              className={cn(
                "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition-all duration-200",
                showLivePreview
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20"
                  : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-700 hover:text-black hover:bg-black/8")
              )}
              title="Launch Interactive Live Preview Studio"
            >
              <Play size={10} fill="currentColor" className="text-cyan-400" />
              <span className="hidden sm:inline">Live Preview</span>
            </button>

            {/* Visible Browser Agent Button */}
            <button
              onClick={() => setShowBrowserWorkspace(true)}
              className={cn(
                "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition-all duration-200",
                showBrowserWorkspace
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20"
                  : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-700 hover:text-black hover:bg-black/8")
              )}
              title="Visible Browser Automation Workspace"
            >
              <Globe size={11} className="text-emerald-400" />
              <span className="hidden sm:inline">Browser</span>
            </button>

            {/* Connected Apps & Plugins Hub */}
            <button
              onClick={() => setShowConnectedApps(true)}
              className={cn(
                "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition-all duration-200",
                showConnectedApps
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20"
                  : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-700 hover:text-black hover:bg-black/8")
              )}
              title="Connected Apps & Tool Ecosystem"
            >
              <Zap size={11} className="text-indigo-400" />
              <span className="hidden md:inline">Apps & Tools</span>
            </button>

            {/* Computer Control Agent Status Button */}
            <button
              onClick={() => setShowCompanionModal(true)}
              className={cn(
                "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition-all duration-200",
                companionStatus === 'connected'
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                  : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-gray-700 hover:text-black hover:bg-black/8")
              )}
              title="Autonomous Computer Agent"
            >
              <Monitor size={12} className={companionStatus === 'connected' ? "text-emerald-400" : "opacity-60"} />
              <span className="hidden sm:inline">
                {companionStatus === 'connected' ? "Desktop Agent" : "Computer Control"}
              </span>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                companionStatus === 'connected' ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              )} />
            </button>

            {/* Theme Toggle */}
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={cn("p-1.5 rounded-lg transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Autonomous Computer Agent Modal */}
        <AnimatePresence>
          {showCompanionModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                onClick={() => setShowCompanionModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-lg rounded-2xl shadow-2xl p-6 border",
                  theme === 'dark' ? "bg-[#18181b] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
                )}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        Autonomous Computer Agent
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          PRO ENGINE
                        </span>
                      </h2>
                      <p className="text-xs opacity-60">Physical OS automation, app launching, & 3D software development</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCompanionModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Connection Status Card */}
                <div className={cn(
                  "p-3.5 rounded-xl border mb-4 flex items-center justify-between",
                  companionStatus === 'connected'
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-200"
                )}>
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      companionStatus === 'connected' ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )} />
                    <div>
                      <div className="text-xs font-bold">
                        {companionStatus === 'connected' ? "Local Desktop Agent Connected" : "Local Companion Agent Ready"}
                      </div>
                      <div className="text-[10px] opacity-75">
                        {companionStatus === 'connected'
                          ? `Workspace: ${companionInfo?.workspace || '~/LikewayProjects'} · OS: ${companionInfo?.platform || 'Windows'}`
                          : "Run companion to enable native app launching and local dev servers"}
                      </div>
                    </div>
                  </div>
                  {companionStatus !== 'connected' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("npm run companion");
                        alert("Copied 'npm run companion' to clipboard! Run it in your terminal or double-click start-companion.bat.");
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all"
                    >
                      Copy Run Command
                    </button>
                  )}
                </div>

                {/* Permission Mode Selector */}
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">Permission Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'autonomous', title: '⚡ Autonomous', desc: 'Auto-run & launch' },
                      { id: 'assisted', title: '🛡️ Assisted', desc: 'Confirm before launch' },
                      { id: 'chat_only', title: '💬 Chat Only', desc: 'No computer access' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setComputerPermissionMode(mode.id as any)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all",
                          computerPermissionMode === mode.id
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                            : (theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/10")
                        )}
                      >
                        <div className="text-xs font-bold">{mode.title}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fast One-Click Autonomous Actions */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">Try Autonomous Actions</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { icon: '🏎️', text: 'Build me a 3D racing game and run it on my computer', tag: 'Autonomous Project' },
                      { icon: '💬', text: 'Open WhatsApp on my computer', tag: 'App Control' },
                      { icon: '🎵', text: 'Launch Spotify', tag: 'App Control' },
                      { icon: '🧮', text: 'Open Calculator', tag: 'Utility' },
                    ].map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setInput(item.text);
                          setShowCompanionModal(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all",
                          theme === 'dark' ? "bg-white/5 border-white/8 hover:bg-white/10" : "bg-black/4 border-black/8 hover:bg-black/8"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-medium truncate">{item.text}</span>
                        </div>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 opacity-60 border border-white/10 flex-shrink-0">
                          {item.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* New Project Modal */}
        <AnimatePresence>
          {isNewProjectModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                onClick={() => setIsNewProjectModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-md rounded-2xl shadow-2xl p-6",
                  theme === 'dark' ? "bg-[#2f2f2f] border border-white/10" : "bg-white border border-black/10"
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn("text-xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>New project</h2>
                  <button onClick={() => setIsNewProjectModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Emoji Picker */}
                <div className="mb-5">
                  <label className={cn("block text-xs font-semibold mb-2 uppercase tracking-wider", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewProjectEmoji(emoji)}
                        className={cn(
                          "w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all border",
                          newProjectEmoji === emoji
                            ? "bg-cyan-500/20 border-cyan-500 scale-110"
                            : (theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/10")
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Name */}
                <div className="mb-4">
                  <label className={cn("block text-xs font-semibold mb-2 uppercase tracking-wider", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Project name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. My new project"
                    autoFocus
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                      theme === 'dark' ? "bg-[#212121] border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400"
                    )}
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className={cn("block text-xs font-semibold mb-2 uppercase tracking-wider", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Description <span className="normal-case font-normal opacity-60">(optional)</span></label>
                  <textarea
                    rows={2}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="What is this project about?"
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none",
                      theme === 'dark' ? "bg-[#212121] border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400"
                    )}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                      theme === 'dark' ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-black/10 text-gray-600 hover:bg-black/5"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!newProjectName.trim() || isLoading}
                    onClick={async () => {
                      if (!newProjectName.trim()) return;
                      setIsLoading(true);
                      try {
                        const res = await fetch("/api/projects", {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "x-user-id": "anonymous-user"
                          },
                          body: JSON.stringify({
                            name: newProjectName.trim(),
                            description: newProjectDesc.trim(),
                            emoji: newProjectEmoji
                          }),
                        });

                        if (res.ok) {
                          const newProj = await res.json();
                          setProjects(prev => [newProj, ...prev]);
                          setActiveProject(newProj._id);
                          setNewProjectName('');
                          setNewProjectDesc('');
                          setNewProjectEmoji('📁');
                          setIsNewProjectModalOpen(false);
                        }
                      } catch (err) {
                        console.error("Failed to create project", err);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating..." : "Create project"}
                  </button>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isProfileModalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={cn(
                  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 rounded-2xl shadow-2xl z-[110] border flex flex-col gap-5",
                  theme === 'dark' ? "bg-[#1c2128] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
                )}
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <User size={18} className="text-cyan-500" />
                    <h3 className="text-lg font-bold">Profile & Account</h3>
                  </div>
                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-400"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Current Account Details */}
                  <div className={cn("p-4 rounded-xl border flex flex-col gap-3", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Plan Tier</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-wider">Pro Elite</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Current User ID</span>
                      <div className="flex items-center justify-between bg-black/10 dark:bg-white/5 p-2 rounded-lg gap-2">
                        <span className="font-mono text-xs truncate max-w-[240px]">{userId}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(userId);
                            alert("User ID copied to clipboard!");
                          }}
                          className="text-[10px] text-cyan-500 font-bold hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Switch Account form */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500">Access Another Account</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Paste your User ID here..."
                        value={switchUserIdInput}
                        onChange={(e) => setSwitchUserIdInput(e.target.value)}
                        className={cn(
                          "flex-1 px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono",
                          theme === 'dark' ? "bg-black/20 border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
                        )}
                      />
                      <button
                        onClick={() => {
                          const cleaned = switchUserIdInput.trim();
                          if (!cleaned) return;
                          localStorage.setItem('gemma_userId', cleaned);
                          setUserId(cleaned);
                          setIsProfileModalOpen(false);
                          // Force page reload to re-load all states and query new database history!
                          window.location.reload();
                        }}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-sm transition-all animate-none"
                      >
                        Access
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Enter your premium Account ID (e.g. <code>user_6o9qvaojbve6uzy23rigmo</code>) to restore all history and features.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-1">
                  <Link 
                    href="/pricing"
                    onClick={() => setIsProfileModalOpen(false)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex-1 border",
                      theme === 'dark' ? "border-white/10 hover:bg-white/5 text-gray-200" : "border-black/10 hover:bg-black/5 text-gray-700"
                    )}
                  >
                    Manage Plans & Billing
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <section
            ref={chatContainerRef}
            onScroll={handleScroll}
            onWheel={(e) => {
              // Only mark as user-scrolling when scrolling UP (away from bottom)
              // When scrolling DOWN at the bottom, let auto-scroll handle it
              const el = chatContainerRef.current;
              if (!el) return;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
              if (e.deltaY < 0 || !atBottom) {
                // Scrolling up, or not at bottom yet → user is in control
                isProgrammaticScroll.current = false;
                setUserScrolling(true);
                setShowScrollButton(true);
              }
              // If scrolling DOWN and already at bottom → don't interfere, auto-scroll will handle
            }}
            onTouchMove={() => { isProgrammaticScroll.current = false; setUserScrolling(true); setShowScrollButton(true); }}
            className="flex-1 overflow-y-auto overflow-x-hidden chat-messages scrollbar-hide flex flex-col custom-scrollbar scrollable-y"
          >
          <div className="chat-container max-w-3xl mx-auto w-full flex flex-col min-h-full">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-6">
                  <h1 className={cn("text-4xl font-black tracking-tight mb-2", theme === 'dark' ? "text-white" : "text-[#1a1a1a]")}>
                    LikeWay
                  </h1>
                  <p className={cn("text-sm max-w-md px-4", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                    How can I assist you today? Select a specialized mode or just start typing to experience Elite reasoning.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
            <AnimatePresence>
              {messages.map((m, i) => {
                const isMsgStreaming = m.status === 'streaming' || m.status === 'typing';
                return (
                <motion.div 
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  key={m.id || `msg-${i}`}
                  className={cn(
                    "flex gap-3 px-4 py-2 group/message relative",
                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >


                  {/* Content section */}
                  <div className={cn(
                    "max-w-[92%] sm:max-w-[85%] flex flex-col gap-1.5",
                    m.role === "user" ? "items-end" : "items-start"
                  )}>

                    <div className="flex items-center gap-1.5 group/userbubble">
                      {m.role === "user" && (!m.status || (m.status !== 'thinking' && m.status !== 'typing')) && editingMessageIndex !== i && (
                        <div className="flex flex-col gap-1 shrink-0 transition-opacity opacity-0 group-hover/message:opacity-100">
                          <button 
                            onClick={() => {
                              setEditingMessageIndex(i);
                              setEditingMessageText(m.content);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent dark:hover:border-white/10 hover:border-black/10 shadow-sm transition-all",
                              theme === 'dark' ? "bg-[#1c2128]/50" : "bg-white/80"
                            )}
                            title="Edit message"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(m.content);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-transparent dark:hover:border-white/10 hover:border-black/10 shadow-sm transition-all",
                              theme === 'dark' ? "bg-[#1c2128]/50" : "bg-white/80"
                            )}
                            title="Copy message"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}

                      <div className={cn(
                        "rounded-2xl text-[15px] leading-relaxed relative",
                        m.role === "user" 
                          ? (theme === 'dark' ? "bg-[#1c2128] border border-white/8 text-gray-100 px-4 py-2.5" : "bg-white border border-black/10 text-gray-900 px-4 py-2.5 shadow-sm")
                          : (theme === 'dark' ? "bg-transparent text-gray-100 py-1" : "bg-transparent text-gray-900 py-1")
                      )}>
                        {m.role === "assistant" ? (
                        m.status === 'thinking' ? (
                          <div className={cn("flex items-center gap-2 py-1 px-2 rounded-xl border", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                            <motion.div 
                              animate={{ opacity: [0.4, 1, 0.4] }} 
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="text-xs font-semibold text-gray-500 italic flex items-center gap-2"
                            >
                               <div className="w-3 h-3 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                               Reasoning...
                            </motion.div>
                          </div>
                        ) : m.status === 'generating' ? (
                          <div className={cn(
                            "flex flex-col gap-3 p-4 rounded-3xl border shadow-xl font-sans w-[280px] sm:w-[320px] overflow-hidden select-none",
                            theme === 'dark' 
                              ? "bg-[#1c2128]/80 border-cyan-500/30 text-white" 
                              : "bg-white border-cyan-500/20 text-[#0d1117]"
                          )}>
                            <div className="flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                className="flex items-center justify-center text-cyan-400"
                              >
                                <Sparkles size={15} className="stroke-[2.5px]" />
                              </motion.div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 animate-pulse">
                                Likeway Image Engine
                              </span>
                            </div>
                            
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-xs sm:text-sm font-bold">Creating your masterpiece...</span>
                              <p className="text-[10px] text-gray-500 line-clamp-2 italic">
                                &quot;{messages[messages.indexOf(m) - 1]?.content || "A magical AI generation"}&quot;
                              </p>
                            </div>

                            {/* Animated creation placeholder canvas */}
                            <div className="relative w-full aspect-square rounded-2xl bg-black/15 dark:bg-white/5 border border-cyan-500/10 overflow-hidden flex items-center justify-center mt-2">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-pulse" />
                              <div className="absolute w-24 h-24 rounded-full border-4 border-cyan-500/25 animate-ping" />
                              <div className="absolute w-12 h-12 rounded-full border-4 border-blue-500/30 animate-pulse flex items-center justify-center">
                                <ImageIcon size={22} className="text-cyan-400 animate-bounce" />
                              </div>
                            </div>
                          </div>
                        ) : m.status === 'searching' ? (
          <div className={cn(
            "flex items-center gap-2 py-1.5 px-3 rounded-full border shadow-sm font-sans select-none animate-pulse",
            theme === 'dark' 
              ? "bg-[#1c2128]/80 border-white/10 text-cyan-400" 
              : "bg-white border-black/10 text-cyan-600"
          )}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="flex items-center justify-center mr-1"
            >
              <Globe size={14} className="stroke-[2.5px]" />
            </motion.div>
            <span className="text-[12px] font-bold tracking-wide">
              Searching the web
            </span>
          </div>
        ) : m.status === 'streaming' || m.status === 'typing' || !m.content ? (
                          <div className={cn(
                            "prose max-w-none overflow-hidden break-words prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px] prose-blockquote:border-[#6c757d] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:mb-4 prose-blockquote:not-italic",
                            theme === 'dark' ? "prose-invert prose-blockquote:bg-white/5 prose-blockquote:text-gray-300" : "prose-stone prose-blockquote:bg-black/5 prose-blockquote:text-gray-800 font-medium"
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              allowedElements={["p","h1","h2","h3","h4","h5","h6","strong","em","a","img","ul","ol","li","pre","code","blockquote","hr","table","thead","tbody","tr","th","td","br","span","div","del","sup","sub","details","summary"]}
                              components={(() => { _isGeneratingRef.current = isMsgStreaming; return markdownComponents; })()}
                            >
                              {formatAIResponse(m.content || "Thinking...")}
                            </ReactMarkdown>
                            <span className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle animate-pulse" />
                          </div>
                        ) : (
                          <div className={cn(
                            "prose max-w-none overflow-hidden break-words prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px] prose-blockquote:border-[#6c757d] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:mb-4 prose-blockquote:not-italic",
                            theme === 'dark' ? "prose-invert prose-blockquote:bg-white/5 prose-blockquote:text-gray-300" : "prose-stone prose-blockquote:bg-black/5 prose-blockquote:text-gray-800 font-medium"
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              allowedElements={["p","h1","h2","h3","h4","h5","h6","strong","em","a","img","ul","ol","li","pre","code","blockquote","hr","table","thead","tbody","tr","th","td","br","span","div","del","sup","sub","details","summary"]}
                              components={(() => { _isGeneratingRef.current = isMsgStreaming; return markdownComponents; })()}
                            >
                              {formatAIResponse(m.content)}
                            </ReactMarkdown>
                          </div>
                        )
                      ) : (
                        editingMessageIndex === i ? (
                          <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[320px] max-w-full">
                            <textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className={cn(
                                "w-full bg-black/10 dark:bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:border-cyan-500/50 resize-y min-h-[80px]",
                                theme === 'dark' ? "text-white" : "text-gray-900"
                              )}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingMessageIndex(null)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                  theme === 'dark' ? "border-white/10 hover:bg-white/5 text-gray-400 hover:text-white" : "border-black/10 hover:bg-black/5 text-gray-600 hover:text-gray-900"
                                )}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditSubmit(i, editingMessageText)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md transition-all"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )
                      )}

                      {/* Message Actions (Copy/Edit) */}
                      {(!m.status || (m.status !== 'thinking' && m.status !== 'typing')) && m.role === "assistant" && (
                        <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover/message:opacity-100 mt-1.5 self-start">
                          <div className="flex items-center gap-0.5 flex-wrap">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(m.content);
                                  setCopiedMsgIndex(i);
                                  setTimeout(() => setCopiedMsgIndex(null), 2000);
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Copy response"
                              >
                                {copiedMsgIndex === i ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                              <button
                                onClick={() => {
                                  if (speakingMsgIndex === i) {
                                    speechTokenRef.current++;
                                    window.speechSynthesis.cancel();
                                    try { activeAudioSrcRef.current?.stop(); } catch {}
                                    isSpeakingRef.current = false;
                                    setSpeakingMsgIndex(null);
                                  } else {
                                    setSpeakingMsgIndex(i);
                                    speakText(m.content, () => setSpeakingMsgIndex(null));
                                  }
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all",
                                  speakingMsgIndex === i ? "text-cyan-400 bg-cyan-500/10" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                                title={speakingMsgIndex === i ? "Stop reading aloud" : "Read response aloud"}
                              >
                                <AudioLines size={14} />
                              </button>
                              <button
                                onClick={() => setMsgFeedback(prev => ({ ...prev, [i]: prev[i] === "up" ? undefined as any : "up" }))}
                                className={cn(
                                  "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all",
                                  msgFeedback[i] === "up" ? "text-emerald-500 bg-emerald-500/10" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                                title="Helpful response"
                              >
                                <ThumbsUp size={14} />
                              </button>
                              <button
                                onClick={() => setMsgFeedback(prev => ({ ...prev, [i]: prev[i] === "down" ? undefined as any : "down" }))}
                                className={cn(
                                  "p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all",
                                  msgFeedback[i] === "down" ? "text-rose-500 bg-rose-500/10" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                                title="Needs improvement"
                              >
                                <ThumbsDown size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveArtifact({
                                    title: "Response Canvas View",
                                    content: m.content,
                                    type: "markdown",
                                  });
                                  setIsArtifactOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Open in LikeWay Canvas"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    if (navigator.share) {
                                      await navigator.share({ title: "LikeWay AI Response", text: m.content });
                                    } else {
                                      await navigator.clipboard.writeText(m.content);
                                      setSharedMsgIndex(i);
                                      setTimeout(() => setSharedMsgIndex(null), 2000);
                                    }
                                  } catch {}
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Share response"
                              >
                                {sharedMsgIndex === i ? <Check size={14} className="text-cyan-400" /> : <Share2 size={14} />}
                              </button>
                              <button 
                                onClick={() => {
                                  let userIdx = -1;
                                  let lastUserMsg = "";
                                  for (let j = i - 1; j >= 0; j--) {
                                    if (messages[j]?.role === 'user') {
                                      userIdx = j;
                                      lastUserMsg = messages[j].content;
                                      break;
                                    }
                                  }
                                  if (userIdx >= 0 && lastUserMsg) {
                                    handleEditSubmit(userIdx, lastUserMsg);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Regenerate in-place"
                              >
                                <RefreshCw size={14} />
                              </button>
                              {/* ChatGPT-style quick response replay modifiers */}
                              {[
                                { label: "Shorter", suffix: "\n\n[Rewrite concisely in 3-5 key bullet points.]" },
                                { label: "Deeper", suffix: "\n\n[Provide a deeper technical breakdown with examples and edge cases.]" },
                                { label: "Simpler", suffix: "\n\n[Explain simply step-by-step with an everyday analogy.]" },
                              ].map((mod) => (
                                <button
                                  key={mod.label}
                                  onClick={() => {
                                    let userIdx = -1;
                                    let lastUserMsg = "";
                                    for (let j = i - 1; j >= 0; j--) {
                                      if (messages[j]?.role === 'user') {
                                        userIdx = j;
                                        lastUserMsg = messages[j].content.replace(/\n\n\[.*\]$/, "");
                                        break;
                                      }
                                    }
                                    if (userIdx >= 0 && lastUserMsg) {
                                      handleEditSubmit(userIdx, lastUserMsg + mod.suffix);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-black/10 dark:border-white/10 text-gray-500 hover:text-cyan-500 hover:border-cyan-500/40 transition-all ml-0.5"
                                  title={`Replay as ${mod.label}`}
                                >
                                  {mod.label}
                                </button>
                              ))}
                              <button 
                                onClick={() => {
                                  // Export full conversation as markdown
                                  const convMarkdown = messages
                                    .filter(m => m.content && m.content.trim())
                                    .map(m => {
                                      const role = m.role === 'user' ? '**You**' : '**LikeWay**';
                                      return `### ${role}\n\n${m.content}\n\n---\n`;
                                    })
                                    .join('\n');
                                  const header = `# Chat Conversation\n\n*Exported on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n---\n\n`;
                                  const blob = new Blob([header + convMarkdown], { type: 'text/markdown;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `likeway-chat-${new Date().toISOString().slice(0,10)}.md`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Export chat as Markdown"
                              >
                                <Download size={14} />
                              </button>
                              {/* Dynamic Sources Badge */}
                              {(() => {
                                // Extract source names from the message content
                                const sourceMatches = m.content.match(/\[source:([^\]]+)\]/gi);
                                if (!sourceMatches || sourceMatches.length === 0) return null;
                                
                                const uniqueSources = [...new Set(sourceMatches.map((s: string) => s.replace(/\[source:/i, '').replace(']', '').trim()))];
                                const maxShow = 3;
                                const displayed = uniqueSources.slice(0, maxShow);
                                
                                const getColor = (n: string) => {
                                  const colors = ['#c92228', '#0077B5', '#FF6600', '#1DA1F2', '#4267B2', '#E60023', '#333', '#6B46C1'];
                                  let hash = 0;
                                  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
                                  return colors[Math.abs(hash) % colors.length];
                                };
                                const getInitials = (n: string) => {
                                  const words = n.trim().split(/\s+/);
                                  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
                                  return (words[0][0] + words[1][0]).toUpperCase();
                                };

                                return (
                                  <div className="relative ml-2 group/sources">
                                    <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all border border-transparent dark:hover:border-white/10">
                                      <div className="flex items-center">
                                        {displayed.map((src: string, idx: number) => (
                                          <div 
                                            key={idx}
                                            className="w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#1a1a1a] flex items-center justify-center text-[7px] font-bold text-white"
                                            style={{ backgroundColor: getColor(src), marginLeft: idx > 0 ? '-6px' : '0', zIndex: 30 - idx }}
                                          >
                                            {getInitials(src)}
                                          </div>
                                        ))}
                                      </div>
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Sources</span>
                                    </button>
                                    
                                    {/* Dropdown */}
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-black/10 dark:border-white/10 opacity-0 invisible group-hover/sources:opacity-100 group-hover/sources:visible transition-all duration-200 z-50 p-2">
                                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">Sources ({uniqueSources.length})</div>
                                      {uniqueSources.map((src: string, idx: number) => (
                                        <a
                                          key={idx}
                                          href={`https://www.google.com/search?q=${encodeURIComponent(src)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors no-underline"
                                        >
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                            style={{ backgroundColor: getColor(src) }}
                                          >
                                            {getInitials(src)}
                                          </div>
                                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{src}</span>
                                          <ExternalLink size={12} className="text-gray-400 ml-auto flex-shrink-0" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Metadata moved to top */}
                  </div>
                </motion.div>
              );
              })}
            </AnimatePresence>
            </div>
            {(messages.length > 0 || isStreaming) && <div ref={endRef} className="h-4" />}
          </div>

          </section>
        </div>

        {/* ── Input Area ───────────────────────────────────── */}
        <div className="chat-input-wrapper transition-colors duration-300 shrink-0 safe-area-bottom">
          <div className="chat-container">
            {/* Follow-up suggestion chips from the assistant */}
            <SuggestionChips
              suggestions={suggestions}
              disabled={isStreaming}
              onSelect={(s) => handleSend(undefined, s)}
            />
            <form
              onSubmit={handleSend}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              suppressHydrationWarning
              className="relative group max-w-3xl mx-auto"
            >
              {/* Slash Command Menu */}
              <SlashCommandMenu
                isOpen={isSlashMenuOpen}
                query={slashQuery}
                theme={theme}
                onClose={() => { setIsSlashMenuOpen(false); setSlashQuery(""); }}
                onSelect={(cmd: SlashCommand) => {
                  if (cmd.needsInput) {
                    setInput(cmd.label + " ");
                  } else {
                    setInput(cmd.label);
                    if (cmd.id === "new") {
                      setActiveConversationId(null);
                      setMessages([]);
                    } else if (cmd.id === "help") {
                      setInput("Show me all available slash commands");
                    } else if (cmd.id === "think") {
                      setIsExtendedThinking(true);
                      setInput("Enable extended thinking mode for this conversation");
                    } else if (cmd.id === "code") {
                      setSelectedMode("Architect");
                      setInput("");
                    } else if (cmd.id === "deepresearch" || cmd.id === "research") {
                      setSelectedMode("Researcher");
                      setInput("");
                    } else if (cmd.id === "settings") {
                      setIsSettingsOpen(true);
                      setInput("");
                    } else if (cmd.id === "models") {
                      setIsInputModelMenuOpen(true);
                      setInput("");
                    } else {
                      setInput(cmd.label + " ");
                    }
                  }
                  setIsSlashMenuOpen(false);
                  setSlashQuery("");
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />

              {/* ── Input Area ──────────────────────────────── */}
              <div>
                {/* Smart Suggestion Chips — only on empty chat */}
                {messages.length === 0 && !isLoading && (
                  <EmptyStateChips
                    theme={theme}
                    onPick={(prompt) => { setInput(prompt); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  />
                )}

                {/* ── Premium Input Box ─────────────────────── */}
                <div
                  suppressHydrationWarning
                  className={cn(
                    "premium-input-box",
                    theme === 'light' && "premium-input-box-light"
                  )}
                >
                {/* Drag & Drop Overlay */}
                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 rounded-[22px] border-2 border-dashed border-violet-500/60 bg-violet-500/8 backdrop-blur-sm z-20 flex items-center justify-center"
                    >
                      <div className="flex flex-col items-center gap-2 text-violet-400">
                        <ImageIcon size={28} className="animate-bounce" />
                        <span className="text-sm font-semibold">Drop to attach</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active Mode Pills */}
                <ModePills
                  theme={theme}
                  webSearch={isWebSearchMode}
                  deepThinking={isExtendedThinking}
                  eliteReasoning={settings.experimental}
                  browser={isBrowserMode}
                  automation={isAutomationMode}
                />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  suppressHydrationWarning={true}
                  rows={1}
                  value={input}
                  onChange={e => {
                    const val = e.target.value;
                    setInput(val);
                    if (val.startsWith("/")) {
                      setIsSlashMenuOpen(true);
                      setSlashQuery(val);
                    } else {
                      setIsSlashMenuOpen(false);
                      setSlashQuery("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (isSlashMenuOpen) {
                      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
                      handleSend();
                    }
                  }}
                  onPaste={handlePaste}
                  placeholder={isRecording ? "Listening..." : "Message…"}
                  className={cn(
                    "w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none px-2 pt-1.5 pb-0",
                    theme === 'dark' ? "text-[15px] text-white placeholder-gray-500" : "text-[15px] text-gray-900 placeholder-gray-400"
                  )}
                  style={{ boxShadow: 'none', minHeight: '22px', maxHeight: '140px', lineHeight: '1.4', resize: 'none' }}
                />

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 px-3">
                    {filePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group/preview">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black/10">
                          <img src={preview} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeFile(idx)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Toolbar Row */}
                <div className="flex items-center justify-between px-1.5 pb-1 pt-0">
                  {/* Left: Attach + secondary tools */}
                  <div className="flex items-center gap-0.5">
                    {/* Attach */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                        title="Attach"
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                          theme === 'dark'
                            ? "text-gray-500 hover:text-gray-200"
                            : "text-gray-400 hover:text-gray-700"
                        )}
                      >
                        <Plus size={16} strokeWidth={2} />
                      </button>
                      <AnimatePresence>
                        {isAttachmentMenuOpen && (
                          <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsAttachmentMenuOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.94, y: -6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.94, y: -6 }}
                              transition={{ duration: 0.15 }}
                              className={cn("absolute bottom-full left-0 mb-3 w-60 p-1.5 border rounded-2xl shadow-2xl z-50 flex flex-col gap-0.5 origin-bottom-left", theme === 'dark' ? "bg-[#1e1e20] border-white/10" : "bg-white border-black/8")}
                            >
                              {[
                                { icon: Paperclip, label: "Attach image or file", action: "attach" },
                                { icon: ImageIcon, label: "Generate image", action: "image" },
                                { icon: Globe, label: "Deep research", action: "research" },
                                { icon: Mic, label: "Create podcast", action: "podcast" },
                              ].map(item => (
                                <button key={item.label} type="button" onClick={() => {
                                  if (item.action === "attach") fileInputRef.current?.click();
                                  else if (item.action === "image") { setInput("Generate an image of "); setIsAttachmentMenuOpen(false); }
                                  else if (item.action === "research") { setSelectedMode("Researcher"); setIsAttachmentMenuOpen(false); }
                                  else setIsAttachmentMenuOpen(false);
                                }} className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left group", theme === 'dark' ? "hover:bg-white/6 text-gray-400 hover:text-white" : "hover:bg-black/5 text-gray-500 hover:text-gray-900")}>
                                  <item.icon size={15} />
                                  <span className="text-[13px] font-medium">{item.label}</span>
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,.txt,.doc,.docx" suppressHydrationWarning />
                    </div>

                    {/* Browser Mode */}
                    <button
                      type="button"
                      onClick={toggleBrowserMode}
                      title="Browser mode"
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                        isBrowserMode
                          ? "text-emerald-400 bg-emerald-500/12 border border-emerald-500/25"
                          : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                    >
                      <Monitor size={14} strokeWidth={2} />
                    </button>

                    {/* Automation Mode */}
                    <button
                      type="button"
                      onClick={toggleAutomationMode}
                      title="Automation mode"
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                        isAutomationMode
                          ? "text-purple-400 bg-purple-500/12 border border-purple-500/25"
                          : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                    >
                      <Cpu size={14} strokeWidth={2} />
                    </button>

                    {/* Web Search Mode */}
                    <button
                      type="button"
                      onClick={() => setIsWebSearchMode(!isWebSearchMode)}
                      title="Web Search mode — search live web with fresh sources & citations"
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                        isWebSearchMode
                          ? "text-sky-400 bg-sky-500/15 border border-sky-500/35 shadow-[0_0_10px_rgba(56,189,248,0.25)]"
                          : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                    >
                      <Globe size={14} strokeWidth={2} />
                    </button>

                    {/* Deep Thinking Mode */}
                    <button
                      type="button"
                      onClick={() => setIsExtendedThinking(!isExtendedThinking)}
                      title="Deep Thinking mode — comprehensive multi-step reasoning"
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                        isExtendedThinking
                          ? "text-purple-400 bg-purple-500/15 border border-purple-500/35 shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                          : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                    >
                      <Brain size={14} strokeWidth={2} />
                    </button>

                  </div>

                  {/* Right: Model selector + Mic + Send */}
                  <div className="flex items-center gap-1">
                    {/* Model Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsInputModelMenuOpen(!isInputModelMenuOpen)}
                        title="Select model"
                        className={cn(
                          "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold border transition-all duration-200",
                          theme === 'dark'
                            ? "bg-white/5 border-white/8 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/15"
                            : "bg-black/4 border-black/8 text-gray-700 hover:text-gray-900 hover:bg-black/8"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="max-w-[110px] truncate">{selectedModel.name}</span>
                        <ChevronDown size={10} className="opacity-60" />
                      </button>
                      <AnimatePresence>
                        {isInputModelMenuOpen && (
                          <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsInputModelMenuOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.96, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: 6 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className={cn(
                                "absolute bottom-full right-0 mb-2 w-[340px] max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl z-50 flex flex-col overflow-hidden origin-bottom-right",
                                theme === 'dark'
                                  ? "bg-[#18181b]/98 backdrop-blur-2xl border-white/10 text-white"
                                  : "bg-white/98 backdrop-blur-2xl border-black/10 text-gray-900"
                              )}
                            >
                              {/* Header & Search */}
                              <div className={cn("p-2.5 border-b space-y-2", theme === 'dark' ? "border-white/5 bg-white/[0.02]" : "border-black/5 bg-black/[0.01]")}>
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-xs font-bold tracking-tight">Select Model</span>
                                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400" : "bg-black/5 border-black/10 text-gray-500")}>
                                    {MODELS.length} models
                                  </span>
                                </div>

                                <div className="relative">
                                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
                                  <input
                                    type="text"
                                    value={modelSearchQuery}
                                    onChange={(e) => setModelSearchQuery(e.target.value)}
                                    placeholder="Filter models or providers..."
                                    className={cn(
                                      "w-full pl-7 pr-7 py-1 text-xs rounded-lg border focus:outline-none transition-all",
                                      theme === 'dark'
                                        ? "bg-black/30 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50"
                                        : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400 focus:border-cyan-500/50"
                                    )}
                                  />
                                  {modelSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setModelSearchQuery("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 text-xs"
                                    >
                                      <X size={11} />
                                    </button>
                                  )}
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex items-center gap-1 pt-0.5">
                                  {(["all", "Claude", "GPT", "Other"] as const).map((tab) => (
                                    <button
                                      key={tab}
                                      type="button"
                                      onClick={() => setModelCategoryFilter(tab)}
                                      className={cn(
                                        "flex-1 py-1 text-[10px] font-semibold rounded-md transition-all",
                                        modelCategoryFilter === tab
                                          ? (theme === 'dark' ? "bg-white/15 text-white" : "bg-black/10 text-black")
                                          : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-black hover:bg-black/5")
                                      )}
                                    >
                                      {tab === "all" ? "All" : tab === "Other" ? "Other" : tab}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Models List */}
                              <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-2 custom-scrollbar">
                                {filteredModelsList.length === 0 ? (
                                  <div className="py-6 text-center text-xs opacity-50">
                                    No models match &quot;{modelSearchQuery}&quot;
                                  </div>
                                ) : (
                                  (["Claude", "GPT", "Other"] as const).map((categoryName) => {
                                    const groupModels = filteredModelsList.filter(m => m.category === categoryName);
                                    if (groupModels.length === 0) return null;

                                    return (
                                      <div key={categoryName} className="space-y-0.5">
                                        <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                          <span>{categoryName === "Other" ? "Other Models" : categoryName}</span>
                                          <span className="text-[9px] font-normal opacity-50">{groupModels.length}</span>
                                        </div>

                                        {groupModels.map((model) => {
                                          const planConfig = PLANS[currentPlan];
                                          const isAllowed =
                                            model.plan === "Core" ||
                                            planConfig.limits.modelsAllowed[0] === "*" ||
                                            planConfig.limits.modelsAllowed.includes(model.id);
                                          const isSelected = selectedModel.id === model.id;

                                          const avatarColor =
                                            model.category === "Claude"
                                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                              : model.category === "GPT"
                                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                              : model.avatarLetter === "G"
                                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                              : model.avatarLetter === "K"
                                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                              : model.avatarLetter === "D"
                                              ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                              : "bg-gray-500/15 text-gray-300 border-gray-500/30";

                                          return (
                                            <button
                                              key={model.id}
                                              type="button"
                                              onClick={() => {
                                                if (isAllowed) {
                                                  setSelectedModel(model);
                                                  setIsInputModelMenuOpen(false);
                                                  setModelSearchQuery("");
                                                } else {
                                                  setIsPricingOpen(true);
                                                }
                                              }}
                                              className={cn(
                                                "w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all group border",
                                                isSelected
                                                  ? (theme === 'dark'
                                                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm"
                                                      : "bg-cyan-50 border-cyan-300 text-cyan-900 shadow-sm")
                                                  : (theme === 'dark'
                                                      ? "border-transparent hover:bg-white/5 text-gray-300 hover:text-white"
                                                      : "border-transparent hover:bg-black/5 text-gray-700 hover:text-gray-900"),
                                                !isAllowed && "opacity-60"
                                              )}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                {/* Letter Avatar */}
                                                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] border flex-shrink-0", avatarColor)}>
                                                  {model.avatarLetter}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold tracking-tight truncate">{model.name}</span>
                                                    {model.featured && (
                                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        Free
                                                      </span>
                                                    )}
                                                    {!isAllowed && (
                                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                        {model.plan}
                                                      </span>
                                                    )}
                                                    {model.contextWindow >= 1000000 && (
                                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                        1M
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] opacity-50 truncate leading-tight mt-0.5">
                                                    {model.company}
                                                  </div>
                                                </div>
                                              </div>

                                              {isSelected ? (
                                                <Check size={14} className="text-cyan-400 flex-shrink-0" />
                                              ) : !isAllowed ? (
                                                <Lock size={11} className="opacity-40 flex-shrink-0" />
                                              ) : null}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Footer: Thinking & Deep search */}
                              <div className={cn("p-2 border-t flex items-center gap-1.5", theme === 'dark' ? "border-white/5 bg-white/[0.02]" : "border-black/5 bg-black/[0.01]")}>
                                <button
                                  type="button"
                                  onClick={() => setIsExtendedThinking(!isExtendedThinking)}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border",
                                    isExtendedThinking
                                      ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                                      : (theme === 'dark' ? "border-white/5 text-gray-400 hover:text-white hover:bg-white/5" : "border-black/5 text-gray-600 hover:text-black hover:bg-black/5")
                                  )}
                                >
                                  <Brain size={12} className={isExtendedThinking ? "text-purple-400" : "opacity-60"} />
                                  <span>Thinking</span>
                                  {isExtendedThinking && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setIsWebSearchMode(!isWebSearchMode)}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border",
                                    isWebSearchMode
                                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                                      : (theme === 'dark' ? "border-white/5 text-gray-400 hover:text-white hover:bg-white/5" : "border-black/5 text-gray-600 hover:text-black hover:bg-black/5")
                                  )}
                                >
                                  <Globe size={12} className={isWebSearchMode ? "text-sky-400" : "opacity-60"} />
                                  <span>Deep search</span>
                                  {isWebSearchMode && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Mic */}
                    <button
                      type="button"
                      onClick={() => setShowVoiceInput(true)}
                      title="Voice input"
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                        isRecording
                          ? "text-red-400 bg-red-500/12 border border-red-500/25"
                          : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                    >
                      <Mic size={14} strokeWidth={2} />
                    </button>

                    {/* Send / Stop Button */}
                    <button
                      type="button"
                      disabled={isLoading && !isStreaming}
                      onClick={() => {
                        if (isStreaming) {
                          abortRef.current?.abort();
                          readerRef.current?.cancel();
                          setIsStreaming(false);
                          setIsLoading(false);
                        } else if (input.trim() && !isLoading) {
                          handleSend();
                        } else if (!isLoading) {
                          startVoiceAssistant();
                        }
                      }}
                      title={isStreaming ? "Stop" : input.trim() ? "Send" : "Voice assistant"}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40",
                        isStreaming
                          ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                          : input.trim()
                            ? "text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] hover:shadow-[0_0_18px_rgba(139,92,246,0.55)] hover:scale-105 active:scale-95"
                            : (theme === 'dark' ? "text-gray-500 hover:text-gray-200 hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/6")
                      )}
                      style={input.trim() && !isStreaming ? { background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' } : {}}
                    >
                      {isLoading && !isStreaming ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isStreaming ? (
                        <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                      ) : input.trim() ? (
                        <ArrowUp size={14} strokeWidth={2.5} />
                      ) : (
                        <AudioLines size={14} />
                      )}
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </form>
          </div>
          <p className={cn("text-center text-[10px] mt-3 pb-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
            {selectedModel?.name || "GPT 6 Astra"} (third-party model) can make mistakes. Free to use, subject to availability.
          </p>

          {/* Browser Automation Trial Banner */}
          <AnimatePresence>
            {showBrowserTrialBanner && browserTrialInfo.trialDaysLeft && browserTrialInfo.trialDaysLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "mx-auto max-w-3xl mb-2 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3",
                  theme === 'dark'
                    ? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-500/20"
                    : "bg-gradient-to-r from-violet-50 to-cyan-50 border-violet-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                      Free Browser Automation Trial
                    </p>
                    <p className={cn("text-[10px]", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                      {browserTrialInfo.trialDaysLeft} day{browserTrialInfo.trialDaysLeft > 1 ? 's' : ''} left — Try autonomous browsing, form filling, and web tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedMode("Browser");
                      setShowBrowserTrialBanner(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 transition-opacity"
                  >
                    Try Now
                  </button>
                  <button
                    onClick={() => setShowBrowserTrialBanner(false)}
                    className={cn("p-1 rounded-lg transition-colors", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900")}
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Voice Character Selector Modal */}
      <AnimatePresence>
        {showVoiceCharSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6 overflow-y-auto"
          >
            <VoiceCharacterSelector
              characters={VOICE_CHARACTERS as any}
              selectedId={selectedVoiceChar}
              onSelect={setSelectedVoiceChar}
              onPreview={(id) => {
                window.speechSynthesis.cancel();
                const char = VOICE_CHARACTERS.find(c => c.id === id);
                if (!char) return;
                const sampleTexts: Record<string, string> = {
                  aria: "Hi! I'm Aria, your warm and friendly LikeWay assistant.",
                  nova: "Hello. I'm Nova. Clear, professional, and ready to help.",
                  echo: "Hey there. I'm Echo. Deep, confident, and at your service.",
                  spark: "Hi! I'm Spark! Bright, energetic, and excited to help you!",
                  atlas: "Greetings. I am Atlas. Calm, authoritative, and precise.",
                  luna: "Hello... I'm Luna. Soft, soothing, and here for you.",
                };
                const utt = new SpeechSynthesisUtterance(sampleTexts[id] || `Hi, I am ${char.name}`);
                utt.pitch = id === 'spark' ? 1.2 : id === 'luna' ? 0.9 : 1.0;
                utt.rate = id === 'spark' ? 1.1 : id === 'atlas' ? 0.9 : 1.0;
                const allVoices = window.speechSynthesis.getVoices();
                for (const kw of char.keywords) {
                  const v = allVoices.find(av => av.name.includes(kw));
                  if (v) { utt.voice = v; break; }
                }
                if (!utt.voice && char.gender === 'female') {
                  utt.voice = allVoices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Zira') || v.name.includes('Samantha')) || allVoices[0];
                }
                window.speechSynthesis.speak(utt);
              }}
              onConfirm={() => {
                window.speechSynthesis.cancel();
                localStorage.setItem('likeway_voice_char', selectedVoiceChar);
                setShowVoiceCharSelector(false);
                if (pendingVoiceLaunch) {
                  setPendingVoiceLaunch(false);
                  launchVoiceAssistant();
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Voice Assistant Overlay — 3D Neural Network Avatar UI */}
      <AnimatePresence>
        {isVoiceMode && (
          <VoiceAssistant
            isOpen={isVoiceMode}
            status={voiceStatus as any}
            transcript={liveTranscript}
            responseText={messages.length > 0 ? messages[messages.length - 1].content : ""}
            character={VOICE_CHARACTERS.find(c => c.id === selectedVoiceChar) || VOICE_CHARACTERS[0]}
            availableCharacters={VOICE_CHARACTERS}
            activeAppLaunch={activeAppLaunch}
            onDismissLaunch={() => setActiveAppLaunch(null)}
            onSelectCharacter={(id) => {
              setSelectedVoiceChar(id);
              localStorage.setItem('likeway_voice_char', id);
              window.speechSynthesis.cancel();
              isSpeakingRef.current = false;
              setVoiceStatus('listening');
              setTimeout(() => {
                startVoiceListeningCycle();
              }, 80);
            }}
            onToggleListening={() => {
              if (voiceStatus === "listening") {
                stopVoiceAssistant();
              } else {
                startVoiceListeningCycle();
              }
            }}
            onInterrupt={handleVoiceOverlayTap}
            onClose={stopVoiceAssistant}
          />
        )}
      </AnimatePresence>

      {/* Premium Voice Input Overlay */}
      <AnimatePresence>
        {showVoiceInput && (
          <PremiumVoiceInput
            theme={theme}
            onTranscript={(text) => {
              setInput(text);
            }}
            onCancel={() => {
              setShowVoiceInput(false);
              setIsRecording(false);
            }}
            onSend={(text) => {
              setShowVoiceInput(false);
              setIsRecording(false);
              setInput(text);
              handleSend(undefined, text);
            }}
          />
        )}
      </AnimatePresence>

      <ArtifactPanel 
        isOpen={isArtifactOpen} 
        onClose={() => setIsArtifactOpen(false)} 
        title={activeArtifact?.title || ""} 
        content={activeArtifact?.content || ""} 
        type={activeArtifact?.type || "code"} 
        onRefine={(instruction) => {
          const refinePrompt = `[MODE: ARTIFACT REFINE]\nTarget Artifact: ${activeArtifact?.title}\nInstruction: ${instruction}\n\nPlease update the following content:\n\n${activeArtifact?.content}`;
          setInput(refinePrompt);
          handleSend();
        }} 
        theme={theme}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={[
          ...recentConversations.map(conv => ({
            id: `conv-${conv._id}`,
            name: conv.title,
            description: `Conversation`,
            icon: MessageSquare,
            section: 'Recent Chats',
            perform: () => { setActiveProject(null); setActiveConversationId(conv._id); setMessages([]); setIsSidebarOpen(false); }
          })),
          ...projects.map(proj => ({
            id: `proj-${proj._id}`,
            name: `${proj.emoji || "📁"} ${proj.name}`,
            description: proj.desc || 'Project',
            icon: Briefcase,
            section: 'Projects',
            perform: () => { setActiveProject(proj._id); setActiveConversationId(null); setMessages([]); setIsSidebarOpen(false); }
          })),
          { id: 'settings', name: 'Open Settings', description: 'Configure platform parameters', icon: Settings, section: 'System', perform: () => setIsSettingsOpen(true) },
          { id: 'new-project', name: 'New Project', description: 'Create a fresh workspace', icon: Briefcase, section: 'Workspace', perform: () => setIsNewProjectModalOpen(true) },
          { id: 'clear', name: 'Clear Chat', description: 'Reset the current context', icon: Trash2, section: 'System', perform: () => setMessages([]) },
        ]}
      />

      <PersonaManager 
        isOpen={false} 
        onClose={() => {}} 
        onSelect={() => {}} 
        theme={theme}
      />

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
                theme === 'dark' ? "bg-[#1c1c1e] border border-white/10" : "bg-white border border-black/10"
              )}
            >
              {/* Header */}
              <div className={cn("flex items-center justify-between px-6 py-5 border-b shrink-0", theme === 'dark' ? "border-white/8" : "border-black/5")}>
                <div>
                  <h2 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Settings</h2>
                  <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Manage your account and preferences</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className={cn("p-2 rounded-xl transition-colors", theme === 'dark' ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-black/5 text-gray-500 hover:text-gray-900")}>
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Card */}
              <div className={cn("px-6 py-4 border-b shrink-0", theme === 'dark' ? "border-white/8" : "border-black/5")}>
                <div className={cn("flex items-center gap-4 p-4 rounded-2xl", theme === 'dark' ? "bg-white/5" : "bg-gray-50")}>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", theme === 'dark' ? "text-white" : "text-gray-900")}>{user?.name || "User"}</p>
                    <p className={cn("text-xs truncate mt-0.5", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>{user?.email || "user@email.com"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/20">{currentPlan}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] text-green-500 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                {/* AI Settings */}
                <div>
                  <h3 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                    <Sparkles size={12} />
                    AI Settings
                  </h3>
                  <div className={cn("rounded-2xl divide-y", theme === 'dark' ? "bg-white/5 divide-white/5" : "bg-gray-50 divide-black/5")}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-purple-500/10" : "bg-purple-50")}>
                          <Brain size={14} className="text-purple-400" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Extended Thinking</p>
                          <p className={cn("text-[10px]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Deeper reasoning for complex problems</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsExtendedThinking(!isExtendedThinking)}
                        className={cn(
                          "w-10 h-6 rounded-full transition-all relative shrink-0",
                          isExtendedThinking ? "bg-purple-500" : (theme === 'dark' ? "bg-white/10" : "bg-black/10")
                        )}
                      >
                        <motion.div
                          animate={{ x: isExtendedThinking ? 18 : 3 }}
                          className="absolute top-[3px] left-0 w-5 h-5 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-cyan-500/10" : "bg-cyan-50")}>
                          <Cpu size={14} className="text-cyan-400" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Experimental Models</p>
                          <p className={cn("text-[10px]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Access frontier AI models</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({...prev, experimental: !prev.experimental}))}
                        className={cn(
                          "w-10 h-6 rounded-full transition-all relative shrink-0",
                          settings.experimental ? "bg-cyan-500" : (theme === 'dark' ? "bg-white/10" : "bg-black/10")
                        )}
                      >
                        <motion.div
                          animate={{ x: settings.experimental ? 18 : 3 }}
                          className="absolute top-[3px] left-0 w-5 h-5 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-orange-500/10" : "bg-orange-50")}>
                          <Zap size={14} className="text-orange-400" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Custom Instructions</p>
                          <p className={cn("text-[10px]", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Personalize AI responses</p>
                        </div>
                      </div>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => {
                          setCustomInstructions(e.target.value);
                          localStorage.setItem('gemma_memory', e.target.value);
                        }}
                        placeholder="e.g. Always respond in a professional tone..."
                        rows={2}
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none transition-all",
                          theme === 'dark' ? "bg-black/30 border-white/10 text-gray-300 placeholder-gray-600" : "bg-white border-black/10 text-gray-800 placeholder-gray-400"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <h3 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                    <Bot size={12} />
                    Active Model
                  </h3>
                  <button
                    onClick={() => { setIsSettingsOpen(false); setIsInputModelMenuOpen(true); }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                      theme === 'dark' ? "bg-white/5 hover:bg-white/8" : "bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-cyan-500/10" : "bg-cyan-50")}>
                        <Sparkles size={16} className="text-cyan-400" />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{selectedModel.name}</p>
                        <p className={cn("text-[10px] mt-0.5", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>{selectedModel.description}</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-500" : "text-gray-400")} />
                  </button>
                </div>

                {/* Account */}
                <div>
                  <h3 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                    <User size={12} />
                    Account
                  </h3>
                  <div className={cn("rounded-2xl divide-y", theme === 'dark' ? "bg-white/5 divide-white/5" : "bg-gray-50 divide-black/5")}>
                    <button
                      onClick={() => { setIsSettingsOpen(false); setIsPricingOpen(true); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-amber-500/10" : "bg-amber-50")}>
                          <Star size={14} className="text-amber-400" />
                        </div>
                        <span className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Billing & Plans</span>
                      </div>
                      <ChevronDown size={14} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />
                    </button>
                    <button
                      onClick={() => { setIsSettingsOpen(false); window.location.href = "/account/sessions"; }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-blue-500/10" : "bg-blue-50")}>
                          <Monitor size={14} className="text-blue-400" />
                        </div>
                        <span className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Sessions & Devices</span>
                      </div>
                      <ChevronDown size={14} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />
                    </button>
                    <button
                      onClick={() => { setIsSettingsOpen(false); setShowSupportModal(true); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-green-500/10" : "bg-green-50")}>
                          <MessageSquare size={14} className="text-green-400" />
                        </div>
                        <span className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Help & Support</span>
                      </div>
                      <ChevronDown size={14} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />
                    </button>
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <h3 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                    {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                    Appearance
                  </h3>
                  <div className={cn("rounded-2xl p-4", theme === 'dark' ? "bg-white/5" : "bg-gray-50")}>
                    <div className="flex gap-2">
                      {[
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'light', label: 'Light', icon: Sun },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setTheme(id as any)}
                          className={cn(
                            "flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all border-2",
                            theme === id
                              ? "border-cyan-500 bg-cyan-500/10"
                              : (theme === 'dark' ? "border-transparent bg-white/5 hover:bg-white/8" : "border-transparent bg-white hover:bg-gray-100")
                          )}
                        >
                          <Icon size={18} className={cn(theme === id ? "text-cyan-400" : (theme === 'dark' ? "text-gray-400" : "text-gray-500"))} />
                          <span className={cn("text-[11px] font-bold", theme === id ? "text-cyan-400" : (theme === 'dark' ? "text-gray-400" : "text-gray-500"))}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={cn("px-6 py-4 border-t shrink-0", theme === 'dark' ? "border-white/8" : "border-black/5")}>
                <button
                  onClick={() => { logout(); setIsSettingsOpen(false); }}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
                >
                  Sign Out
                </button>
                <p className="text-center text-[10px] text-gray-600 mt-2">LikeWay AI v2.4.0</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />

      {/* Pricing Modal */}
      <PricingModal
        open={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        currentPlan={currentPlan}
        onSelectPlan={(planId) => {
          if (planId === "Core") {
            setCurrentPlanState(planId);
            localStorage.setItem("likeway_plan", planId);
            setIsPricingOpen(false);
          } else {
            // Redirect to pricing page with full Razorpay payment flow
            setIsPricingOpen(false);
            window.location.href = `/pricing?plan=${planId}`;
          }
        }}
      />

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        theme={theme}
        userId={userId}
      />

      {/* Live Preview Workspace */}
      <LivePreviewWorkspace
        isOpen={showLivePreview || isArtifactOpen}
        onClose={() => {
          setShowLivePreview(false);
          setIsArtifactOpen(false);
          setPreviewCustomCode("");
          setPreviewCustomTitle("");
        }}
        title={previewCustomTitle || activeArtifact?.title || "Live Web Application"}
        initialCode={previewCustomCode || activeArtifact?.content || `// Welcome to Live Preview Studio
// Ask the AI to build any React, Next.js, or HTML/Tailwind app, or paste code below!

import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
          Likeway Live Studio
        </h1>
        <p className="text-sm text-gray-300">
          Real-time interactive preview engine with React 19, Tailwind CSS, multi-device viewports, and AI error diagnosis.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
          >
            Count: {count}
          </button>
          <button
            onClick={() => setCount(0)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
`}
        language="react"
        theme={theme}
      />

      {/* Visible Browser Automation Workspace */}
      <VisibleBrowserWorkspace
        isOpen={showBrowserWorkspace}
        onClose={() => setShowBrowserWorkspace(false)}
        initialUrl="https://duckduckgo.com"
        theme={theme}
      />

      {/* Connected Apps & Plugins Hub */}
      <ConnectedAppsModal
        isOpen={showConnectedApps}
        onClose={() => setShowConnectedApps(false)}
        theme={theme}
      />
    </div>
  );
}

