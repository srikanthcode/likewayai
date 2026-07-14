"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
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
  MessageSquarePlus,
  Plus,
  Globe,
  Code,
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
  Lock
} from "lucide-react";


import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ReactMarkdown from "react-markdown";
import { MODELS } from "@/lib/models";
import { PLANS, getCurrentPlan, PlanType, isFeatureUnlocked } from "@/lib/plans";
import { AgentMode } from "@/lib/agents";
import ArtifactPanel, { ArtifactType } from "@/components/ArtifactPanel";
import PersonaManager from "@/components/PersonaManager";
import CommandPalette from "@/components/CommandPalette";
import CodeBlock from "@/components/CodeBlock";
import VoiceOverlay from "@/components/VoiceOverlay";
import ConfirmDialog from "@/components/ConfirmDialog";
import AgentSelector from "@/components/AgentSelector";
import PricingModal from "@/components/PricingModal";
import VoiceCharacterSelector from "@/components/VoiceCharacterSelector";
import AccountMenu from "@/components/AccountMenu";
import SlashCommandMenu from "@/components/SlashCommandMenu";
import { cn } from "@/lib/utils";
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

  // Self-close unclosed tags dynamically during progressive streaming
  if (formatted.includes("<thought>") && !formatted.includes("</thought>")) {
    formatted += "</thought>";
  }
  if (formatted.includes("<artifact") && !formatted.includes("</artifact>")) {
    formatted += "</artifact>";
  }
  
  // Format <thought> blocks into clean blockquotes
  formatted = formatted.replace(/<thought>([\s\S]*?)<\/thought>/gi, (match, thought) => {
    return `\n> **🤔 Thought Process:**\n> \n> *${thought.trim().split('\n').join('\n> ')}*\n\n`;
  });

  // Extract artifact content to avoid breaking the markdown renderer with nested code blocks
  formatted = formatted.replace(/<artifact(?:[^>]*)>([\s\S]*?)<\/artifact>/gi, (match, artifactContent) => {
    return `\n\n---\n\n${artifactContent.trim()}\n\n`;
  });

  // Convert [source:Name] or [source:Name](url) into special links for SourceBadge rendering
  formatted = formatted.replace(/\[source:([^\]]+)\]\(([^)]+)\)/gi, (match, name, url) => {
    return `[${name.trim()}](source://${encodeURIComponent(name.trim())}?url=${encodeURIComponent(url)})`;
  });
  formatted = formatted.replace(/\[source:([^\]]+)\]/gi, (match, name) => {
    return `[${name.trim()}](source://${encodeURIComponent(name.trim())})`;
  });

  return formatted;
}

// ── Settings Helper Components ─────────────────────────────────────────
function SettingsSection({ title, icon, children, theme }: { title: string; icon: React.ReactNode; children: React.ReactNode; theme: string }) {
  return (
    <div className={cn("py-3 border-t", theme === 'dark' ? "border-white/5" : "border-black/5")}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-cyan-400">{icon}</span>
        <p className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsItem({ label, onClick, theme }: { label: string; onClick?: () => void; theme: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between py-2 text-left transition-colors",
        onClick ? "hover:opacity-70" : "cursor-default"
      )}
    >
      <span className={cn("text-xs", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>{label}</span>
      {onClick && <ChevronDown size={14} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />}
    </button>
  );
}

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
let _isGeneratingRef = { current: false };
export function getIsGenerating() { return _isGeneratingRef.current; }

function buildMarkdownComponents() {
  let stepCounter = 0;
  
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
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} isGenerating={_isGeneratingRef.current} />
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
    img: ({ src, alt, ...props }: any) => {
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
    },
  };
}

const VOICE_CHARACTERS = [
  { id: 'aria',   name: 'Aria',   gender: 'female', desc: 'Warm & Friendly',    emoji: '👩', keywords: ['Zira','Aria','Samantha','Google UK English Female','Microsoft Zira'] },
  { id: 'nova',   name: 'Nova',   gender: 'female', desc: 'Clear & Professional', emoji: '👩‍💼', keywords: ['Google US English Female','Ava','Victoria','Karen','Moira','Tessa'] },
  { id: 'echo',   name: 'Echo',   gender: 'male',   desc: 'Deep & Confident',   emoji: '🧑', keywords: ['Google UK English Male','Daniel','Microsoft David','Fred'] },
  { id: 'spark',  name: 'Spark',  gender: 'female', desc: 'Bright & Energetic',  emoji: '👧', keywords: ['Google IN English Female','Rishi','Alex','Fiona'] },
  { id: 'atlas',  name: 'Atlas',  gender: 'male',   desc: 'Calm & Authoritative', emoji: '🧑‍💻', keywords: ['Microsoft Mark','Google US English Male','Tom','Ralph'] },
  { id: 'luna',   name: 'Luna',   gender: 'female', desc: 'Soft & Soothing',    emoji: '🌙', keywords: ['Nicky','Amelie','Monica','Kyoko','Mei-Jia'] },
];

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [messages, setMessages] = useState<{ id?: string; role: string; content: string; status?: 'thinking' | 'typing' | 'streaming' | 'done' | 'searching' | 'generating'; animationPlayed?: boolean }[]>([]);
  const [input, setInput] = useState("");
  
  // High-performance streaming & scroll state
  const [isStreaming, setIsStreaming] = useState(false);
  const bufferRef = useRef("");
  const [userScrolling, setUserScrolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isProgrammaticScroll = useRef(false);
  const isInitialLoad = useRef(true); // Prevent auto-scroll on history load
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<{ title: string; content: string; type: ArtifactType } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<AgentMode>("General");
  const [selectedAgentId, setSelectedAgentId] = useState("general");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isInputModelMenuOpen, setIsInputModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isExtendedThinking, setIsExtendedThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const voiceRecognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const currentSpeakingTextRef = useRef('');
  const utteranceRef = useRef<any>(null);
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

  // Listen to new assistant messages and auto-open generated artifacts in side panel
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.status === "done") {
      const match = lastMsg.content.match(/<artifact\s+type="([^"]+)"\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/artifact>/i);
      if (match) {
        const [_, type, title, content] = match;
        const rawType = type.trim().toLowerCase();
        const mappedType: ArtifactType = rawType === "doc" ? "markdown" : (rawType as any);
        setActiveArtifact({
          title: title.trim(),
          content: content.trim(),
          type: mappedType
        });
        setIsArtifactOpen(true);
      }
    }
  }, [messages]);

  const markdownComponents = useMemo(() => buildMarkdownComponents(), []);

  const findVoiceForChar = (charId: string) => {
    const voices = window.speechSynthesis.getVoices();
    const char = VOICE_CHARACTERS.find(c => c.id === charId);
    if (!char || voices.length === 0) return voices[0] || null;
    for (const kw of char.keywords) {
      const v = voices.find(v => v.name.includes(kw));
      if (v) return v;
    }
    // Fallback: pick by gender
    const genderFallback = voices.find(v => {
      const n = v.name.toLowerCase();
      return char.gender === 'female' ? (n.includes('female') || n.includes('zira') || n.includes('aria') || n.includes('samantha')) : (n.includes('male') || n.includes('david') || n.includes('mark'));
    });
    return genderFallback || voices[0];
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

  const speakText = (text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    
    // 1. Strip Artifacts and Tags for Speech
    // We want to skip reading code blocks entirely, but maybe mention they exist.
    let cleaned = text;
    
    // Remove all <artifact> tags and their contents if they are code
    cleaned = cleaned.replace(/<artifact\s+type="code"[\s\S]*?<\/artifact>/gi, '[Code block shared]');
    // Remove just the tags for docs/other artifacts but keep the content
    cleaned = cleaned.replace(/<artifact[\s\S]*?>/gi, '').replace(/<\/artifact>/gi, '');
    
    // Remove Markdown formatting
    cleaned = cleaned.replace(/[#*`_~>\[\]()!]/g, '')
                     .replace(/https?:\/\/\S+/g, 'link') // Don't read long URLs
                     .replace(/\n+/g, ' ')
                     .trim();

    currentSpeakingTextRef.current = cleaned;
    
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utteranceRef.current = utterance; 
    
    utterance.rate = 1.05; // Slightly faster for modern feel
    utterance.pitch = selectedVoiceChar === 'spark' ? 1.15 : selectedVoiceChar === 'luna' ? 0.9 : 1.0;
    
    const assignVoiceAndSpeak = () => {
      const voice = findVoiceForChar(selectedVoiceChar);
      if (voice) utterance.voice = voice;
      isSpeakingRef.current = true;
      utterance.onend = () => { 
        isSpeakingRef.current = false; 
        currentSpeakingTextRef.current = '';
        onEnd?.(); 
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        onEnd?.();
      };
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        assignVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      assignVoiceAndSpeak();
    }
  };

  const processVoiceQuery = async (text: string) => {
    // Cut off any ongoing speech immediately if user asks a new question
    window.speechSynthesis.cancel();
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
      if (!res.ok || !res.body) throw new Error('API Error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try { fullContent += JSON.parse(data).choices?.[0]?.delta?.content || ''; } catch {}
        }
      }
      setMessages(prev => [...prev, { id: `msg_${Date.now()}_voice`, role: 'assistant', content: fullContent, status: 'done', animationPlayed: true }]);
      setInput('');
      setVoiceStatus('speaking');
      setLiveTranscript('');
      speakText(fullContent, () => {
        if (isVoiceMode) startVoiceListeningCycle();
        else setVoiceStatus('idle');
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
      isSpeakingRef.current = false;
      startVoiceListeningCycle();
    } else if (voiceStatus === 'idle') {
      startVoiceListeningCycle();
    }
  };

  const startVoiceListeningCycle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      stopVoiceAssistant();
      return;
    }
    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch(e) {}
    }
    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalResultProcessed = false;

    recognition.onstart = () => {
      if (!isSpeakingRef.current) {
        setVoiceStatus('listening');
      }
      setLiveTranscript('');
      finalResultProcessed = false;
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      const currentText = (final || interim).trim();
      
      // 2. Enhanced Barge-in Logic
      // If AI is speaking and user says something meaningful (not just a filler word)
      if (isSpeakingRef.current && currentText.length > 5) {
        const fillers = ["the", "and", "but", "yes", "no", "okay"];
        const isFiller = fillers.includes(currentText.toLowerCase());
        
        if (!isFiller) {
          window.speechSynthesis.cancel();
          isSpeakingRef.current = false;
          setVoiceStatus('listening');
          setLiveTranscript(currentText);
        }
      }

      if (!isSpeakingRef.current) {
        setLiveTranscript(currentText);
      }

      // Automatically process if user stops talking for a moment (handled by recognition.stop in onresult for final)
      if (final && !finalResultProcessed && !isSpeakingRef.current) {
        finalResultProcessed = true;
        recognition.stop();
        processVoiceQuery(final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e.error);
      if (isVoiceMode && e.error !== 'aborted') {
        setTimeout(startVoiceListeningCycle, 500);
      }
    };

    recognition.onend = () => {
      // 3. Robust Lifecycle Management
      // Only restart if we are not currently processing a query or speaking
      if (isVoiceMode && voiceStatus !== 'thinking' && voiceStatus !== 'speaking') {
        if (voiceStatus === 'listening' && !finalResultProcessed) {
          setLiveTranscript(prev => {
            if (prev.trim().length > 1) {
              finalResultProcessed = true;
              processVoiceQuery(prev.trim());
            }
            return prev;
          });
        }
        if (!finalResultProcessed) {
           setTimeout(startVoiceListeningCycle, 100);
        }
      }
    };

    try {
      recognition.start();
    } catch(e) {}
  };

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
    setTimeout(() => startVoiceListeningCycle(), 300);
  };

  const stopVoiceAssistant = () => {
    window.speechSynthesis.cancel();
    voiceRecognitionRef.current?.stop();
    isSpeakingRef.current = false;
    setIsVoiceMode(false);
    setVoiceStatus('idle');
    setInput('');
    setLiveTranscript('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsRecording(true);
      setInput(""); // Clear input on new recording
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  const [settings, setSettings] = useState({
    experimental: false,
    highVelocity: true,
    voiceV2: false
  });
  const [currentPlan, setCurrentPlanState] = useState<PlanType>("Core");

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentPlanState(getCurrentPlan());
    const handlePlanUpdate = () => setCurrentPlanState(getCurrentPlan());
    window.addEventListener("plan_updated", handlePlanUpdate);
    return () => window.removeEventListener("plan_updated", handlePlanUpdate);
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
          setMessages(loadedHistory || []);
          // Jump instantly to the bottom
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            isInitialLoad.current = false;
          }, 80);
        } else {
          setMessages([]);
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

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Cut off any ongoing speech if user types a new message
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    if (voiceStatus === 'speaking') {
      setVoiceStatus('idle');
    }

    const userMessage = input.trim();
    // Exclude system message placeholding states (thinking, typing, searching) and messages with empty content from history payload
    const history = messages
      .filter(m => m.content && m.content.trim() !== "" && m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    let conversationIdToUse = activeConversationId;
    if (!conversationIdToUse && !activeProject) {
      const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
      const randomChars = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      conversationIdToUse = timestamp + randomChars;
      setActiveConversationId(conversationIdToUse);
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    const isImageRequest = /\b(generate|create|make|draw|design|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|art|poster|wallpaper|logo|banner)\b/i.test(userMessage);

    const needsSearch =
      !isImageRequest && (
        hasRealTimeTerm ||
        SEARCH_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) ||
        (TIME_KEYWORDS.some((w) => userMessage.toLowerCase().includes(w)) && !isCodingQ)
      );
    const assistantMsgId = `msg_${Date.now()}_assistant`;
    setMessages(prev => [...prev, { 
      id: assistantMsgId,
      role: "assistant", 
      content: "", 
      status: isImageRequest ? 'generating' : needsSearch ? 'searching' : 'typing',
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
      const timeoutId = setTimeout(() => abortController.abort(), 60000);

      let res: Response | null = null;

      for (const attempt of FALLBACK_MODELS) {
        if (abortController.signal.aborted) break;
        try {
          const r = await attemptChat(attempt.id, attempt.trim, abortController.signal);
          if (r.ok && r.body) {
            res = r;
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
            content: "All models are currently unavailable. Try again in a moment.",
            status: 'done',
            animationPlayed: true
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let fullContent = "";
      let didFinalize = false;
      let streamingStarted = false;

      // Transition the placeholder message to streaming mode smoothly
      setIsStreaming(true);
      bufferRef.current = "";

      let responseBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = responseBuffer.indexOf("\n")) !== -1) {
          const line = responseBuffer.slice(0, newlineIndex).trim();
          responseBuffer = responseBuffer.slice(newlineIndex + 1);
          
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              if (!didFinalize) {
                didFinalize = true;
                // Replace streaming message with final done message
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
                // Cache conversation in localStorage for offline/history fallback
                try {
                  const cached = JSON.parse(localStorage.getItem("likeway_recent_chats") || "[]");
                  const idx = cached.findIndex((c: any) => c._id === conversationIdToUse);
                  const entry = { _id: conversationIdToUse, title: userMessage.substring(0, 40), updatedAt: new Date() };
                  if (idx >= 0) cached[idx] = entry; else cached.unshift(entry);
                  localStorage.setItem("likeway_recent_chats", JSON.stringify(cached.slice(0, 50)));
                } catch {}
              }
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                bufferRef.current += delta;
                if (!streamingStarted) {
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
              }
            } catch {}
          }
        }
      }

      if (!didFinalize) {
        didFinalize = true;
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
        fetchRecentConversations();
      }
    } catch (err: any) {
      console.error("Frontend Send Error:", err);
      setIsStreaming(false);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: "All models are currently unavailable. Try again in a moment.", status: 'done', animationPlayed: true };
        return copy;
      });
    } finally {
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
      const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
      const randomChars = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      conversationIdToUse = timestamp + randomChars;
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

    const assistantMsgId = `msg_${Date.now()}_assistant`;
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
      const timeoutId = setTimeout(() => abortController.abort(), 60000);

      let res: Response | null = null;
      for (const attempt of FALLBACK_MODELS) {
        if (abortController.signal.aborted) break;
        try {
          const r = await attemptChat(attempt.id, attempt.trim, abortController.signal);
          if (r.ok && r.body) {
            res = r;
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
            content: "All models are currently unavailable. Try again in a moment.",
            status: 'done',
            animationPlayed: true
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let fullContent = "";
      let didFinalize = false;
      let streamingStarted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              didFinalize = true;
              setMessages(prev => {
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                  copy[lastIdx] = { role: "assistant", content: fullContent, status: 'done' };
                } else {
                  copy.push({ role: "assistant", content: fullContent, status: 'done' });
                }
                return copy;
              });
              setIsStreaming(false);
              fetchRecentConversations();
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content || "";
              fullContent += content;

              if (content) {
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
              }
            } catch {}
          }
        }
      }

      if (!didFinalize) {
        didFinalize = true;
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
      }
    } catch (err: any) {
      console.error("Frontend Edit Submit Error:", err);
      setIsStreaming(false);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], role: "assistant", content: "All models are currently unavailable. Try again in a moment.", status: 'done', animationPlayed: true };
        return copy;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      readerRef.current = null;
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }

  return (
    <div className={cn("flex h-screen w-full overflow-hidden font-sans",
      theme === 'dark' ? "bg-[#212121] text-white" : "bg-[#FFFFFF] text-gray-900"
    )}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed width, collapse via w-0, overlay on mobile */}
      <aside className={cn(
        "relative z-[70] flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isSidebarOpen ? "w-64" : "w-0",
        "fixed md:relative inset-y-0 left-0",
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
            <h3 className="px-3 text-xs font-semibold text-gray-500 mb-1">Projects</h3>
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
        <header className="chat-header h-14 sm:h-12 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 z-50 transition-colors duration-300 safe-area-top">
          <div className="flex items-center gap-2 md:gap-3">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className={cn("chat-menu-btn rounded-lg transition-all", theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")} title="Open Sidebar">
                <PanelLeft size={20} />
              </button>
            )}
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

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={cn("p-1.5 rounded-lg transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

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
                  <p className={cn("text-sm max-w-md", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
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
                                "{messages[messages.indexOf(m) - 1]?.content || "A magical AI generation"}"
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
                            "prose max-w-none prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px] prose-blockquote:border-[#6c757d] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:mb-4 prose-blockquote:not-italic",
                            theme === 'dark' ? "prose-invert prose-blockquote:bg-white/5 prose-blockquote:text-gray-300" : "prose-stone prose-blockquote:bg-black/5 prose-blockquote:text-gray-800 font-medium"
                          )}>
                            <ReactMarkdown components={(() => { _isGeneratingRef.current = isMsgStreaming; return markdownComponents; })()}>
                              {formatAIResponse(m.content || "Thinking...")}
                            </ReactMarkdown>
                            <span className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle animate-pulse" />
                          </div>
                        ) : (
                          <div className={cn(
                            "prose max-w-none prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px] prose-blockquote:border-[#6c757d] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:mb-4 prose-blockquote:not-italic",
                            theme === 'dark' ? "prose-invert prose-blockquote:bg-white/5 prose-blockquote:text-gray-300" : "prose-stone prose-blockquote:bg-black/5 prose-blockquote:text-gray-800 font-medium"
                          )}>
                            <ReactMarkdown components={(() => { _isGeneratingRef.current = isMsgStreaming; return markdownComponents; })()}>
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
                          <div className="flex items-center gap-0.5">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(m.content);
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Copy"
                              >
                                <Copy size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all" title="Good response">
                                <ThumbsUp size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all" title="Bad response">
                                <ThumbsDown size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all" title="Share">
                                <Share2 size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  let lastUserMsg = "";
                                  for(let j = i-1; j >= 0; j--) {
                                      if(messages[j]?.role === 'user') {
                                          lastUserMsg = messages[j].content;
                                          break;
                                      }
                                  }
                                  setInput(lastUserMsg);
                                  handleSend();
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                title="Regenerate"
                              >
                                <RefreshCw size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all" title="More">
                                <MoreHorizontal size={14} />
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

        {/* Input Form — ChatGPT-style responsive layout */}
        <div className={cn("chat-input-wrapper transition-colors duration-300 shrink-0 safe-area-bottom", theme === 'dark' ? "bg-[#212121] border-t border-white/5" : "bg-[#FFFFFF] border-t border-black/5")}>
          <div className="chat-container">

            <form
              onSubmit={handleSend}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              suppressHydrationWarning
              className="relative group max-w-3xl mx-auto"
            >
                {/* Focus Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl rounded-[32px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                {/* Slash Command Menu */}
                <SlashCommandMenu
                  isOpen={isSlashMenuOpen}
                  query={slashQuery}
                  theme={theme}
                  onClose={() => { setIsSlashMenuOpen(false); setSlashQuery(""); }}
                  onSelect={(cmd: SlashCommand) => {
                    if (cmd.needsInput) {
                      // Keep the /command text, user types after it
                      setInput(cmd.label + " ");
                    } else {
                      // Execute immediately - set input and send
                      setInput(cmd.label);
                      // For commands that need no input, trigger the action
                      if (cmd.id === "new") {
                        setActiveConversationId(null);
                        setMessages([]);
                      } else if (cmd.id === "help") {
                        // Show help - just keep the text
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
                        // For action commands, set the text and let user add context
                        setInput(cmd.label + " ");
                      }
                    }
                    setIsSlashMenuOpen(false);
                    setSlashQuery("");
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                />

                <div
                  suppressHydrationWarning
                  className={cn(
                  "chat-input-box relative flex flex-col gap-2 shadow-2xl",
                  theme === 'dark' ? "bg-[#2f2f2f]" : "bg-[#F4F4F4]"
                )}>
                  {/* Drag & Drop Overlay */}
                  <AnimatePresence>
                    {isDragging && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 rounded-3xl border-2 border-dashed border-cyan-500/60 bg-cyan-500/10 backdrop-blur-sm z-20 flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-cyan-400">
                          <ImageIcon size={32} className="animate-bounce" />
                          <span className="text-sm font-bold">Drop images here</span>
                          <span className="text-[10px] text-gray-400">PNG, JPG, WEBP</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {settings.experimental && (
                    <div className="absolute -top-3 left-6 z-10">
                       <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Elite Reasoning Active</span>
                       </div>
                    </div>
                  )}
                  
                  {/* Input Field — 16px font prevents iOS zoom */}
                <textarea
                  ref={textareaRef}
                  suppressHydrationWarning={true}
                  rows={1}
                  value={input}
                  onChange={e => {
                    const val = e.target.value;
                    setInput(val);

                    // Slash command detection
                    if (val.startsWith("/")) {
                      setIsSlashMenuOpen(true);
                      setSlashQuery(val);
                    } else {
                      setIsSlashMenuOpen(false);
                      setSlashQuery("");
                    }
                  }}
                  onKeyDown={(e) => {
                    // Let SlashCommandMenu handle its own keyboard when open
                    if (isSlashMenuOpen) {
                      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                        // Don't prevent default for Enter if slash menu needs input
                        return;
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isRecording) {
                         recognitionRef.current?.stop();
                         setIsRecording(false);
                      }
                      handleSend();
                    }
                  }}
                  onPaste={handlePaste}
                  placeholder={isRecording ? "Listening..." : "Message AI Assistant..."}
                  className={cn(
                    "chat-input w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-1 py-1 resize-none placeholder-gray-500",
                    theme === 'dark' ? "text-white" : "text-gray-900"
                  )}
                  style={{ boxShadow: 'none', fontSize: '16px', minHeight: '24px', maxHeight: '180px' }}
                />

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-1">
                    {filePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group/preview">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/10">
                          <img src={preview} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => removeFile(idx)}
                              className="bg-red-500/90 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 block truncate max-w-20">Image {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Icons Row — 44x44px touch targets */}
                <div className="flex items-center justify-between mt-1">

                  {/* Left + Icon & Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={cn(
                        "chat-attach-btn rounded-full",
                        theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5"
                      )}
                    >
                      <Plus size={22} />
                    </button>

                    {/* Attachment Menu */}
                    <AnimatePresence>
                      {isAttachmentMenuOpen && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsAttachmentMenuOpen(false)} 
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute bottom-full left-0 mb-4 w-64 p-2 bg-[#2A2A2A] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 origin-bottom-left"
                          >
                             {[
                               { icon: Paperclip, label: "Add images or files", locked: false, onClick: () => fileInputRef.current?.click() },
                               { icon: ImageIcon, label: "Generate image", locked: false, onClick: () => { setInput("Generate an image of "); setIsAttachmentMenuOpen(false); } },
                               { icon: Globe, label: "Start deep research", badge: "Unlimited", locked: false, onClick: () => { setSelectedMode("Researcher"); setIsAttachmentMenuOpen(false); } },
                               { icon: Mic, label: "Create a podcast", badge: "Unlimited", locked: false, onClick: () => { setIsAttachmentMenuOpen(false); } },
                             ].map((item, i) => (
                               <button 
                                 key={item.label} 
                                 disabled={item.locked} 
                                 onClick={item.onClick}
                                 className={cn("flex items-center justify-between w-full p-2.5 rounded-xl transition-all text-left", item.locked ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5 group")}
                               >
                                 <div className="flex items-center gap-2.5">
                                   <item.icon size={16} className={cn(item.locked ? "text-gray-600" : "text-gray-500 group-hover:text-cyan-400")} />
                                   <span className={cn("text-xs font-bold", item.locked ? "text-gray-500" : "text-gray-300 group-hover:text-white")}>{item.label}</span>
                                 </div>
                                  {item.badge && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500">{item.badge}</span>}
                               </button>
                             ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                    <input 
                      type="file" 
                      multiple 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf,.txt,.doc,.docx"
                    />
                  </div>

                  {/* Right Icons Container — 44x44px touch targets */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsInputModelMenuOpen(!isInputModelMenuOpen)}
                        className={cn(
                          "chat-menu-btn rounded-full",
                          theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5"
                        )}
                        title="Select AI Model"
                      >
                        <MessageSquarePlus size={20} />
                      </button>

                      {/* Models Popup Menu */}
                      <AnimatePresence>
                        {isInputModelMenuOpen && (
                          <>
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsInputModelMenuOpen(false)} 
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className={cn(
                                "absolute bottom-full right-0 mb-4 w-72 max-h-[60vh] overflow-y-auto p-2 border rounded-2xl shadow-2xl z-50 flex flex-col gap-1 origin-bottom-right scrollbar-hide",
                                theme === 'dark' ? "bg-[#2A2A2A] border-white/10" : "bg-white border-black/10"
                              )}
                            >
                              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-white/5 mb-1">
                                Available Models
                              </div>
                                {MODELS.map((model, modelIdx) => {
                                  const planConfig = PLANS[currentPlan];
                                  const isAllowed = planConfig.limits.modelsAllowed[0] === "*" || planConfig.limits.modelsAllowed.includes(model.id);
                                  return (
                                  <button
                                    key={`${model.id}-${model.provider}-${model.name}`}
                                    onClick={() => { if (isAllowed) { setSelectedModel(model); setIsInputModelMenuOpen(false); } }}
                                    disabled={!isAllowed}
                                    className={cn(
                                      "flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                                      !isAllowed ? "opacity-40 cursor-not-allowed" : "",
                                      selectedModel.id === model.id && selectedModel.provider === model.provider
                                        ? (theme === 'dark' ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600")
                                        : (theme === 'dark' ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("text-sm font-semibold truncate", selectedModel.id === model.id ? "" : (theme === 'dark' ? "group-hover:text-white" : "group-hover:text-black"))}>{model.name}</div>
                                        {!isAllowed && (
                                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                            <Lock size={8} />
                                            {model.plan}
                                          </span>
                                        )}
                                        {isAllowed && model.plan !== "Core" && model.plan !== currentPlan && (
                                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                                            <Sparkles size={8} />
                                            {model.plan}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] opacity-70 truncate mt-0.5">{model.description}</div>
                                    </div>
                                    {selectedModel.id === model.id && <Check size={16} />}
                                  </button>
                                  );
                                })}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Voice to Text Converter — 44x44px touch target */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={cn(
                        "chat-menu-btn rounded-full",
                        isRecording
                          ? "text-red-500 bg-red-500/10"
                          : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")
                      )}
                      title="Voice to text"
                    >
                      <Mic size={20} />
                    </button>

                    {/* Send / Voice Assistant Button — 44x44px touch target */}
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
                      className={cn(
                        "chat-send-btn flex-shrink-0 w-10 h-10 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all ml-1",
                        theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                      )}
                      title={isStreaming ? "Stop generation" : input.trim() ? "Send message" : "Start Voice Assistant"}
                    >
                      {isLoading && !isStreaming ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isStreaming ? (
                        <div className="w-3 h-3 bg-current rounded-[2px]" />
                      ) : input.trim() ? (
                        <ArrowUp size={18} strokeWidth={3} />
                      ) : (
                        <AudioLines size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-4">
            AI can make mistakes. Check important info. v2.4.0
          </p>
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


      {/* Voice Assistant Overlay */}
      <AnimatePresence>
        {isVoiceMode && (
          <VoiceOverlay
            status={voiceStatus as any}
            transcript={liveTranscript}
            characterName={VOICE_CHARACTERS.find(c => c.id === selectedVoiceChar)?.name || ""}
            characterEmoji={VOICE_CHARACTERS.find(c => c.id === selectedVoiceChar)?.emoji || ""}
            onInterrupt={handleVoiceOverlayTap}
            onClose={stopVoiceAssistant}
            onChangeVoice={() => setShowVoiceCharSelector(true)}
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
          { id: 'settings', name: 'Open Settings', description: 'Configure platform parameters', icon: Settings, section: 'System', perform: () => setIsSettingsOpen(true) },
          { id: 'projects', name: 'New Project', description: 'Create a fresh workspace', icon: Briefcase, section: 'Workspace', perform: () => console.log('New Project') },
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
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", theme === 'dark' ? "bg-blue-500/10" : "bg-blue-50")}>
                          <Monitor size={14} className="text-blue-400" />
                        </div>
                        <span className={cn("text-xs font-semibold", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>Sessions & Devices</span>
                      </div>
                      <ChevronDown size={14} className={cn("rotate-[-90deg]", theme === 'dark' ? "text-gray-600" : "text-gray-400")} />
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-3 text-left">
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
    </div>
  );
}

