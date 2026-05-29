"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  PanelLeft,
  Settings,
  Trash2,
  User,
  Mic,
  Monitor,
  Save,
  Wand2,
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
  Terminal,
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
  Package,
  Folder,
  FolderPlus,
  GraduationCap,
  Brain,
  ExternalLink
} from "lucide-react";


import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { MODELS } from "@/lib/models";
import { PLANS, getCurrentPlan, PlanType, isFeatureUnlocked } from "@/lib/plans";
import { AgentMode } from "@/lib/agents";
import ArtifactPanel, { ArtifactType } from "@/components/ArtifactPanel";
import PersonaManager from "@/components/PersonaManager";
import CommandPalette from "@/components/CommandPalette";
import CodeBlock from "@/components/CodeBlock";
import VoiceOverlay from "@/components/VoiceOverlay";
import VoiceCharacterSelector from "@/components/VoiceCharacterSelector";
import { cn } from "@/lib/utils";


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
function buildMarkdownComponents(theme: 'dark' | 'light') {
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
        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
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
    img: ({ src, alt, ...props }: any) => (
      <span className="block my-4 w-full max-w-xl group/img">
        <span className="block relative w-full rounded-2xl overflow-hidden shadow-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          <img 
            src={src} 
            alt={alt || "Generated Visual"} 
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover/img:scale-[1.02]"
            {...props}
          />
        </span>
      </span>
    ),
  };
}

export default function ChatPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [messages, setMessages] = useState<{ role: string; content: string; status?: 'thinking' | 'typing' | 'streaming' | 'done' | 'searching' }[]>([]);
  const [input, setInput] = useState("");
  
  // High-performance streaming & scroll state
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bufferRef = useRef("");
  const [userScrolling, setUserScrolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isProgrammaticScroll = useRef(false);
  const isInitialLoad = useRef(true); // Prevent auto-scroll on history load
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<{ title: string; content: string; type: ArtifactType } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AgentMode>("General");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isInputModelMenuOpen, setIsInputModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isExtendedThinking, setIsExtendedThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
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
    const id = localStorage.getItem('gemma_userId') || 'anonymous-user';
    setUserId(id);
  }, []);

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

  const VOICE_CHARACTERS = [
    { id: 'aria',   name: 'Aria',   gender: 'female', desc: 'Warm & Friendly',    emoji: '👩', keywords: ['Zira','Aria','Samantha','Google UK English Female','Microsoft Zira'] },
    { id: 'nova',   name: 'Nova',   gender: 'female', desc: 'Clear & Professional', emoji: '👩‍💼', keywords: ['Google US English Female','Ava','Victoria','Karen','Moira','Tessa'] },
    { id: 'echo',   name: 'Echo',   gender: 'male',   desc: 'Deep & Confident',   emoji: '🧑', keywords: ['Google UK English Male','Daniel','Microsoft David','Fred'] },
    { id: 'spark',  name: 'Spark',  gender: 'female', desc: 'Bright & Energetic',  emoji: '👧', keywords: ['Google IN English Female','Rishi','Alex','Fiona'] },
    { id: 'atlas',  name: 'Atlas',  gender: 'male',   desc: 'Calm & Authoritative', emoji: '🧑‍💻', keywords: ['Microsoft Mark','Google US English Male','Tom','Ralph'] },
    { id: 'luna',   name: 'Luna',   gender: 'female', desc: 'Soft & Soothing',    emoji: '🌙', keywords: ['Nicky','Amelie','Monica','Kyoko','Mei-Jia'] },
  ];

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

  
  useEffect(() => {
    fetchProjects();
  }, []);

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
      const localUserId = localStorage.getItem('gemma_userId') || 'anonymous-user';
      const res = await fetch("/api/chat/history/list", {
        headers: { "x-user-id": localUserId }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch recent conversations", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchRecentConversations();
  }, []);

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

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
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
    setMessages(prev => [...prev, { role: 'user', content: text }]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent, status: 'done' }]);
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
        
        const localUserId = localStorage.getItem('gemma_userId') || 'anonymous-user';
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
  }, [messages, isStreaming, userScrolling]);

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
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    let conversationIdToUse = activeConversationId;
    if (!conversationIdToUse && !activeProject) {
      const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
      const randomChars = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      conversationIdToUse = timestamp + randomChars;
      setActiveConversationId(conversationIdToUse);
    }

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);
    setUserScrolling(false);
    setShowScrollButton(false);
    const searchKeywords = ["latest news", "flash news", "today's news", "current news", "headlines",
      "box office", "stock price", "share price", "weather", "score", "live score", "match result",
      "election result", "breaking news"];
    const timeKeywords = ["latest", "2026", "today", "current", "recent", "release date", "released",
      "new movie", "new film", "upcoming", "just announced", "this week", "this month"];
    const isCodingQ = /\b(code|coding|program|function|class|method|variable|syntax|debug|error|fix|how to|explain|what is|what are|define|difference between|compare|tutorial|example|implement|build|create|make a|write a)\b/i.test(userMessage);
    const needsSearch = searchKeywords.some(w => userMessage.toLowerCase().includes(w)) || 
      (timeKeywords.some(w => userMessage.toLowerCase().includes(w)) && !isCodingQ);
    setMessages(prev => [...prev, { role: "assistant", content: "", status: needsSearch ? 'searching' : 'typing' }]);

    // Helper: make a single chat API call and stream it
    const attemptChat = async (modelId: string, trimHistory: boolean) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          prompt: userMessage,
          modelId,
          history: trimHistory ? history.slice(-4) : history,
          files,
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

    // Fallback model order: try primary → Gemini Flash → last resort empty-history
    const FALLBACK_MODELS = [
      { id: selectedModel.id, trim: false },
      { id: "google/gemini-2.5-flash", trim: true },
      { id: "meta-llama/llama-3.2-3b-instruct:free", trim: true },
    ];

    try {
      let res: Response | null = null;

      for (const attempt of FALLBACK_MODELS) {
        const r = await attemptChat(attempt.id, attempt.trim);
        if (r.ok && r.body) {
          res = r;
          break;
        }
        // Silently log the failure and try next model
        console.warn(`[Client Failover] Model ${attempt.id} failed (${r.status}). Trying next...`);
      }

      if (!res || !res.ok || !res.body) {
        // All models failed — show a clean, minimal message
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "I'm temporarily overloaded. Please start a new chat and try again.",
            status: 'done'
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
      setStreamingMessage("");
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
                    copy[lastIdx] = { role: "assistant", content: fullContent, status: 'done' };
                  } else {
                    copy.push({ role: "assistant", content: fullContent, status: 'done' });
                  }
                  return copy;
                });
                setIsStreaming(false);
                setStreamingMessage("");
                bufferRef.current = "";
                setFiles([]);
                setFilePreviews([]);
                fetchRecentConversations();
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
            copy[lastIdx] = { role: "assistant", content: fullContent, status: 'done' };
          } else {
            copy.push({ role: "assistant", content: fullContent, status: 'done' });
          }
          return copy;
        });
        setIsStreaming(false);
        setStreamingMessage("");
        bufferRef.current = "";
        fetchRecentConversations();
      }
    } catch (err: any) {
      console.error("Frontend Send Error:", err);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Please try again.", status: 'done' };
        return copy;
      });
    } finally {
      setIsLoading(false);
      readerRef.current = null;
    }
  }

  return (
    <div className={cn("flex h-screen w-full overflow-hidden font-sans transition-colors duration-300", 
      theme === 'dark' ? "bg-[#495057] text-white" : "bg-[#e7e2ee] text-gray-900"
    )}>
      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-[70] flex flex-col transition-all duration-300 ease-in-out flex-shrink-0",
        isSidebarOpen 
          ? "w-64 translate-x-0 opacity-100 p-4" 
          : "w-0 -translate-x-full opacity-0 p-0 overflow-hidden md:w-0 md:opacity-0 md:p-0",
        theme === 'dark' ? "bg-[#171717] text-gray-300" : "bg-[#f9f9f9] border-r border-gray-200 text-gray-700"
      )}>
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

            <button 
              onClick={() => setSelectedMode("Architect")}

              className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
            )}>
              <Bot size={16} />
              Architect
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              theme === 'dark' ? "hover:bg-white/5 text-gray-200" : "hover:bg-black/5 text-gray-800"
            )}>
              <MoreHorizontal size={16} />
              More
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Delete this project?")) return;
                      try {
                        const res = await fetch(`/api/projects/${project._id}`, { method: "DELETE" });
                        if (res.ok) {
                          setProjects(prev => prev.filter(p => p._id !== project._id));
                          if (activeProject === project._id) setActiveProject(null);
                        }
                      } catch (err) {
                        console.error("Failed to delete project", err);
                      }
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
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("Delete this conversation?")) return;
                        try {
                          const res = await fetch(`/api/chat/history/${conv._id}`, { 
                            method: "DELETE",
                            headers: { "x-user-id": userId }
                          });
                          if (res.ok) {
                            fetchRecentConversations(); // refresh the list
                            if (activeConversationId === conv._id) {
                              setActiveConversationId(null);
                              setMessages([]);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to delete conversation", err);
                        }
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

        <div className={cn("mt-2 pt-2 border-t", theme === 'dark' ? "border-white/10" : "border-black/10")}>
          <div 
            onClick={() => {
              setSwitchUserIdInput(userId);
              setIsProfileModalOpen(true);
            }}
            className={cn(
              "flex items-center justify-between px-2 p-2 rounded-xl cursor-pointer transition-colors group",
              theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/5"
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg shadow-cyan-500/20">
                {userId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn("text-sm font-bold truncate", theme === 'dark' ? "text-white" : "text-gray-900")}>{userId}</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-black border border-cyan-500/20 uppercase tracking-tighter">Pro Elite</span>
                    <span className="text-[10px] text-gray-500 truncate">Unlimited</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col relative min-w-0 transition-colors duration-300",
        theme === 'dark' ? "bg-[#495057] text-white" : "bg-[#e7e2ee] text-[#0d1117]"
      )}>
        <header className={cn(
          "w-full h-14 flex items-center justify-between px-4 z-50 border-b backdrop-blur-md transition-all duration-300 shrink-0",
          theme === 'dark' 
            ? "bg-[#495057]/95 border-white/5 text-white" 
            : "bg-[#e7e2ee]/95 border-black/5 text-[#0d1117]"
        )}>
          <div className="flex items-center gap-2 md:gap-3">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className={cn("p-1.5 rounded-lg transition-all", theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")} title="Open Sidebar">
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
            
            <div className={cn(
              "px-2.5 py-1 rounded-lg border flex items-center gap-2 cursor-pointer transition-all backdrop-blur-md",
              theme === 'dark' ? "bg-[#212121]/50 border-white/10 text-gray-300 hover:bg-[#212121]/80" : "bg-white/50 border-black/10 text-gray-700 hover:bg-white/80"
            )} onClick={() => setIsCommandPaletteOpen(true)}>
              <span className={cn("text-[11px] font-bold")}>
                {selectedMode} <span className="hidden sm:inline opacity-60">Mode</span>
              </span>
              <ChevronDown size={12} className="text-gray-500" />
            </div>
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
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          <section 
            ref={chatContainerRef}
            onScroll={handleScroll}
            onWheel={() => { isProgrammaticScroll.current = false; setUserScrolling(true); setShowScrollButton(true); }}
            onTouchMove={() => { isProgrammaticScroll.current = false; setUserScrolling(true); setShowScrollButton(true); }}
            className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-32 px-6 sm:pt-6 sm:pb-40 sm:px-10 scrollbar-hide flex flex-col custom-scrollbar"
          >
          <div className="max-w-3xl mx-auto space-y-4 flex-1 flex flex-col w-full">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Icon removed per user request */}

                <h3 className={cn("text-2xl font-bold mb-2 tracking-tight", theme === 'dark' ? "text-white" : "text-[#0d1117]")}>How can I assist you today?</h3>
                <p className={cn("text-sm max-w-sm mb-6", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Select a specialized mode or just start typing to experience Elite reasoning.</p>
              </div>
            )}
            
            <AnimatePresence mode="popLayout">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  key={i} 
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
                            <ReactMarkdown components={buildMarkdownComponents(theme)}>
                              {formatAIResponse(m.content || "Thinking...")}
                            </ReactMarkdown>
                            <span className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle animate-pulse" />
                          </div>
                        ) : (
                          <div className={cn(
                            "prose max-w-none prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px] prose-blockquote:border-[#6c757d] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:mb-4 prose-blockquote:not-italic",
                            theme === 'dark' ? "prose-invert prose-blockquote:bg-white/5 prose-blockquote:text-gray-300" : "prose-stone prose-blockquote:bg-black/5 prose-blockquote:text-gray-800 font-medium"
                          )}>
                            <ReactMarkdown components={buildMarkdownComponents(theme)}>
                              {formatAIResponse(m.content)}
                            </ReactMarkdown>
                          </div>
                        )
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}

                      {/* Message Actions (Copy/Edit) */}
                      {(!m.status || (m.status !== 'thinking' && m.status !== 'typing')) && (
                        <div className={cn(
                          "absolute -bottom-10 flex items-center gap-1 transition-opacity opacity-0 group-hover/message:opacity-100 z-10",
                          m.role === "user" ? "right-0" : "left-0"
                        )}>
                          {m.role === "user" ? (
                            <button 
                              onClick={() => setInput(m.content)}
                              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                              title="Edit message"
                            >
                              <Settings size={14} />
                            </button>
                          ) : (
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
                          )}
                        </div>
                      )}
                    </div>
                    {/* Metadata moved to top */}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>





            {(messages.length > 0 || isStreaming) && <div ref={endRef} className="h-32" />}
          </div>

          </section>

          {/* Floating Scroll to Bottom Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
                onClick={() => {
                  setUserScrolling(false);
                  scrollToBottom();
                }}
                className="group absolute bottom-8 left-1/2 flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-[#141414]/35 backdrop-blur-md border border-white/10 font-semibold text-white/95 shadow-[0px_0px_0px_2px_rgba(180,160,255,0.15)] hover:w-[130px] hover:rounded-[15px] hover:bg-[#b5a0ff]/80 cursor-pointer transition-all duration-300 z-[60]"
              >
                <svg className="w-[10px] h-[12px] transition-all duration-300 text-white fill-current group-hover:-translate-y-[20px] group-hover:opacity-0" viewBox="0 0 384 512">
                  <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
                </svg>
                <span className="absolute translate-y-[12px] text-[9px] font-bold text-white/90 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 whitespace-nowrap uppercase tracking-wider">
                  New messages below
                </span>
                {isStreaming && <span className="absolute right-1.5 top-1.5 w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input Form */}
        <div className={cn("px-4 py-4 sm:px-8 sm:py-6 transition-colors duration-300", theme === 'dark' ? "bg-[#495057]" : "bg-[#e7e2ee]")}>
          <div className="max-w-4xl mx-auto">
            {/* compact hints chips */}
            {false && (
              <div className="relative group/hints">
                <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 scroll-smooth">
                  {[
                    { icon: Code, text: "Write production code" },
                    { icon: ImageIcon, text: "Generate Image" },
                    { icon: Globe, text: "Analyze the web" },
                    { icon: Search, text: "Deep Research" },

                    { icon: Zap, text: "Turbo Mode" },
                    { icon: MessageSquare, text: "Summarize text" },
                    { icon: Wand2, text: "Creative writing" }
                  ].map((hint, i) => (
                    <button 
                      key={i}
                      onClick={() => setInput(hint.text)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all group shrink-0",
                        theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-cyan-500/30" : "bg-black/5 border-black/5 hover:bg-black/10 hover:border-cyan-500/30"
                      )}
                    >
                      <hint.icon size={12} className={theme === 'dark' ? "text-gray-500 group-hover:text-cyan-400" : "text-gray-600 group-hover:text-cyan-600"} />
                      <span className={cn(
                        "text-[11px] font-bold whitespace-nowrap",
                        theme === 'dark' ? "text-gray-400 group-hover:text-white" : "text-gray-700 group-hover:text-black"
                      )}>{hint.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form 
              onSubmit={handleSend} 
              suppressHydrationWarning
              className="relative group max-w-3xl mx-auto"
            >
                {/* Focus Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl rounded-[32px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                
                <div 
                  suppressHydrationWarning 
                  className={cn(
                  "relative flex flex-col gap-2 rounded-3xl transition-all shadow-2xl px-3 py-3",
                  theme === 'dark' ? "bg-[#212121]" : "bg-gray-100"
                )}>
                  {settings.experimental && (
                    <div className="absolute -top-3 left-6 z-10">
                       <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Elite Reasoning Active</span>
                       </div>
                    </div>
                  )}
                  
                  {/* Input Field (Top) */}
                <textarea 
                  ref={textareaRef}
                  suppressHydrationWarning={true}
                  rows={1}
                  value={input} 
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isRecording) {
                         recognitionRef.current?.stop();
                         setIsRecording(false);
                      }
                      handleSend();
                    }
                  }}
                  placeholder={isRecording ? "Listening..." : "Message AI Assistant..."} 
                  className={cn(
                    "w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-1 py-1 min-h-[28px] max-h-[200px] resize-none placeholder-gray-500 text-sm sm:text-base",
                    theme === 'dark' ? "text-white" : "text-gray-900"
                  )}
                  style={{ boxShadow: 'none' }}
                />

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-1">
                    {filePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img src={preview} alt="upload preview" className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                        <button 
                          onClick={() => removeFile(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Icons Row */}
                <div className="flex items-center justify-between mt-1">
                  
                  {/* Left + Icon & Menu */}
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={cn(
                        "p-1.5 rounded-full transition-all",
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
                                 key={i} 
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

                  {/* Right Icons Container */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setIsInputModelMenuOpen(!isInputModelMenuOpen)}
                        className={cn(
                          "p-2 rounded-full transition-all",
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
                               {MODELS.map((model) => (
                                 <button
                                   key={model.id}
                                   onClick={() => { setSelectedModel(model); setIsInputModelMenuOpen(false); }}
                                   className={cn(
                                     "flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                                     selectedModel.id === model.id 
                                       ? (theme === 'dark' ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600")
                                       : (theme === 'dark' ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")
                                   )}
                                 >
                                   <div className="flex-1 min-w-0">
                                      <div className={cn("text-sm font-semibold truncate", selectedModel.id === model.id ? "" : (theme === 'dark' ? "group-hover:text-white" : "group-hover:text-black"))}>{model.name}</div>
                                      <div className="text-[10px] opacity-70 truncate mt-0.5">{model.provider} • {model.description}</div>
                                   </div>
                                   {selectedModel.id === model.id && <Check size={16} />}
                                 </button>
                               ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Voice to Text Converter (Bare Icon) */}
                    <button 
                      type="button"
                      onClick={toggleRecording}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        isRecording 
                          ? "text-red-500 bg-red-500/10" 
                          : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5")
                      )}
                      title="Voice to text"
                    >
                      <Mic size={20} />
                    </button>

                    {/* Send / Voice Assistant Button (Solid Circled Icon) */}
                    <button 
                      type={(isStreaming || !input.trim()) ? "button" : "submit"}
                      disabled={isLoading && !isStreaming}
                      onClick={() => {
                        if (isStreaming) {
                          readerRef.current?.cancel();
                          setIsStreaming(false);
                          setIsLoading(false);
                        } else if (!input.trim() && !isLoading) {
                          startVoiceAssistant();
                        }
                      }}
                      className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ml-1",
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
          { id: 'general', name: 'General Mode', description: 'Switch to standard reasoning', icon: Monitor, section: 'Modes', perform: () => setSelectedMode('General') },
          { id: 'architect', name: 'Architect Mode', description: 'Expert software engineering', icon: Code, section: 'Modes', perform: () => setSelectedMode('Architect') },
          { id: 'research', name: 'Researcher Mode', description: 'Deep autonomous research', icon: Search, section: 'Modes', perform: () => setSelectedMode('Researcher') },
          { id: 'vision', name: 'Visionary Mode', description: 'AI Design & Image Generation', icon: ImageIcon, section: 'Modes', perform: () => setSelectedMode('Visionary') },
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
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className={cn(
                "w-full max-w-lg border rounded-3xl p-6 shadow-2xl transition-colors",
                theme === 'dark' ? "bg-[#161b22] border-white/10" : "bg-white border-black/10"
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-gray-900")}>Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/5 text-gray-400 hover:text-white" : "hover:bg-black/5 text-gray-600 hover:text-gray-900")}>
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'experimental', name: 'Experimental Frontier Models', desc: 'Access 01-preview and experimental agents.', badge: 'ELITE' },
                  { id: 'highVelocity', name: 'High-Velocity Reasoning', desc: 'Minimize latencies for ultra-fast Pro responses.', badge: 'PRO' },
                  { id: 'voiceV2', name: 'Advanced Voice UI (v2)', desc: 'Enhanced visualizer and feedback systems.' }
                ].map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{s.name}</p>
                        {s.badge && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black">{s.badge}</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{s.desc}</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({...prev, [s.id]: !prev[s.id as keyof typeof settings]}))} 
                      className={cn(
                        "w-10 h-6 rounded-full transition-all relative", 
                        settings[s.id as keyof typeof settings] ? "bg-cyan-500" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings[s.id as keyof typeof settings] ? 18 : 3 }} 
                        className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md" 
                      />
                    </button>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-cyan-400" />
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Memory</p>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">These instructions will be applied to every new chat.</p>
                  <textarea 
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      localStorage.setItem('gemma_memory', e.target.value);
                    }}
                    placeholder="e.g. 'I am a software engineer...'"
                    className="w-full h-20 bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 resize-none placeholder-gray-600 transition-all"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className={cn(
                    "w-full py-3 rounded-2xl font-bold transition-all shadow-xl",
                    theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  Done
                </button>
                <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-center">
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">v2.4.0</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

