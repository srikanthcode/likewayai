import {
  Search, Image, Code, Languages, FileText, Lightbulb,
  Globe, Newspaper, BarChart3, Shield, Zap, Palette,
  Pen, Mail, BookOpen, GraduationCap, Calculator,
  Settings, Plug, Brain, Rocket, Terminal,
  GitBranch, Database, Layout, Cpu, HelpCircle,
  MessageSquare, RefreshCw, Pencil, Minimize2,
  Maximize2, ArrowRightLeft, Type, Volume2,
  Workflow, Binary, TestTube, Bug, Wrench, Gauge,
  FileCode, ClipboardList, CalendarDays, Target, Clock, StickyNote,
  CheckCircle, Map, Heart, Sparkles, Stars,
  Video, Music, Mic, Hash, Link, Share2, Download,
  TrendingUp, Award, Star
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SlashCommandCategory =
  | "chat"
  | "coding"
  | "web"
  | "creative"
  | "writing"
  | "language"
  | "learning"
  | "productivity"
  | "ai"
  | "developer"
  | "data"
  | "utility";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: SlashCommandCategory;
  /** If true, the command replaces input text. If false, it triggers an action. */
  replacesInput?: boolean;
  /** If true, command needs additional text after it */
  needsInput?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ── Chat & AI ──────────────────────────────────────────────────────
  { id: "new",        label: "/new",        description: "Start a new chat",            icon: MessageSquare,   category: "chat" },
  { id: "continue",   label: "/continue",   description: "Continue previous response",  icon: ArrowRightLeft,  category: "chat" },
  { id: "retry",      label: "/retry",      description: "Regenerate last response",    icon: RefreshCw,       category: "chat" },
  { id: "think",      label: "/think",      description: "Enable extended thinking",    icon: Brain,           category: "chat" },
  { id: "explain",    label: "/explain",    description: "Explain in simple terms",      icon: Lightbulb,       category: "chat", needsInput: true },
  { id: "simplify",   label: "/simplify",   description: "Simplify the text",            icon: Minimize2,       category: "chat", needsInput: true },
  { id: "expand",     label: "/expand",     description: "Expand with more detail",      icon: Maximize2,       category: "chat", needsInput: true },
  { id: "summarize",  label: "/summarize",  description: "Summarize the content",        icon: FileText,        category: "chat", needsInput: true },
  { id: "improve",    label: "/improve",    description: "Improve the writing",          icon: Sparkles,        category: "chat", needsInput: true },
  { id: "rewrite",    label: "/rewrite",    description: "Rewrite differently",          icon: Pencil,          category: "chat", needsInput: true },

  // ── Coding ─────────────────────────────────────────────────────────
  { id: "code",           label: "/code",           description: "Coding assistant mode",       icon: Code,            category: "coding" },
  { id: "debug",          label: "/debug",          description: "Debug code errors",            icon: Bug,             category: "coding", needsInput: true },
  { id: "fix",            label: "/fix",            description: "Fix code issues",              icon: Wrench,          category: "coding", needsInput: true },
  { id: "refactor",       label: "/refactor",       description: "Refactor code",                icon: GitBranch,       category: "coding", needsInput: true },
  { id: "review",         label: "/review",         description: "Code review",                  icon: Shield,          category: "coding", needsInput: true },
  { id: "optimize",       label: "/optimize",       description: "Optimize performance",         icon: Gauge,           category: "coding", needsInput: true },
  { id: "document",       label: "/document",       description: "Add documentation",            icon: FileText,        category: "coding", needsInput: true },
  { id: "test",           label: "/test",           description: "Generate tests",               icon: TestTube,        category: "coding", needsInput: true },
  { id: "api",            label: "/api",            description: "Design REST/GraphQL API",      icon: Plug,            category: "coding", needsInput: true },
  { id: "sql",            label: "/sql",            description: "Write SQL queries",            icon: Database,        category: "coding", needsInput: true },
  { id: "regex",          label: "/regex",          description: "Build regular expressions",    icon: Binary,          category: "coding", needsInput: true },
  { id: "terminal",       label: "/terminal",       description: "Terminal/shell commands",       icon: Terminal,        category: "coding", needsInput: true },

  // ── Web & Research ─────────────────────────────────────────────────
  { id: "search",    label: "/search",    description: "Search the web",              icon: Search,          category: "web", needsInput: true },
  { id: "news",      label: "/news",      description: "Latest news",                 icon: Newspaper,       category: "web", needsInput: true },
  { id: "research",  label: "/research",  description: "Deep web research",           icon: Globe,           category: "web", needsInput: true },
  { id: "compare",   label: "/compare",   description: "Compare options",             icon: ArrowRightLeft,  category: "web", needsInput: true },
  { id: "facts",     label: "/facts",     description: "Verify facts",                icon: CheckCircle,     category: "web", needsInput: true },
  { id: "trending",  label: "/trending",  description: "What's trending now",         icon: Zap,             category: "web" },

  // ── Creative ───────────────────────────────────────────────────────
  { id: "image",     label: "/image",     description: "Generate an image",           icon: Image,           category: "creative", needsInput: true },
  { id: "logo",      label: "/logo",      description: "Design a logo",               icon: Palette,         category: "creative", needsInput: true },
  { id: "banner",    label: "/banner",    description: "Create a banner",             icon: Layout,          category: "creative", needsInput: true },
  { id: "ui",        label: "/ui",        description: "Design UI components",        icon: Layout,          category: "creative", needsInput: true },
  { id: "color",     label: "/color",     description: "Generate color palette",       icon: Palette,         category: "creative", needsInput: true },

  // ── Writing ────────────────────────────────────────────────────────
  { id: "write",     label: "/write",     description: "Creative writing",            icon: Pen,             category: "writing", needsInput: true },
  { id: "email",     label: "/email",     description: "Draft an email",              icon: Mail,            category: "writing", needsInput: true },
  { id: "blog",      label: "/blog",      description: "Write a blog post",           icon: BookOpen,        category: "writing", needsInput: true },
  { id: "caption",   label: "/caption",   description: "Write captions",              icon: Type,            category: "writing", needsInput: true },
  { id: "script",    label: "/script",    description: "Write a script",              icon: FileCode,        category: "writing", needsInput: true },

  // ── Language ───────────────────────────────────────────────────────
  { id: "translate", label: "/translate", description: "Translate text",               icon: Languages,       category: "language", needsInput: true },
  { id: "grammar",   label: "/grammar",   description: "Check grammar",               icon: CheckCircle,     category: "language", needsInput: true },
  { id: "formal",    label: "/formal",    description: "Make formal",                 icon: Type,            category: "language", needsInput: true },
  { id: "informal",  label: "/informal",  description: "Make casual",                 icon: MessageSquare,   category: "language", needsInput: true },
  { id: "speak",     label: "/speak",     description: "Text to speech",              icon: Volume2,         category: "language", needsInput: true },

  // ── Learning ───────────────────────────────────────────────────────
  { id: "learn",      label: "/learn",      description: "Start a lesson",             icon: GraduationCap,   category: "learning", needsInput: true },
  { id: "quiz",       label: "/quiz",       description: "Generate a quiz",            icon: ClipboardList,   category: "learning", needsInput: true },
  { id: "flashcards", label: "/flashcards", description: "Create flashcards",          icon: StickyNote,      category: "learning", needsInput: true },
  { id: "interview",  label: "/interview",  description: "Practice interview",         icon: MessageSquare,   category: "learning", needsInput: true },

  // ── Productivity ───────────────────────────────────────────────────
  { id: "todo",      label: "/todo",      description: "Create a todo list",          icon: CheckCircle,     category: "productivity", needsInput: true },
  { id: "plan",      label: "/plan",      description: "Create a plan",               icon: Map,             category: "productivity", needsInput: true },
  { id: "schedule",  label: "/schedule",  description: "Plan a schedule",             icon: CalendarDays,    category: "productivity", needsInput: true },
  { id: "reminder",  label: "/reminder",  description: "Set a reminder",              icon: Clock,           category: "productivity", needsInput: true },
  { id: "notes",     label: "/notes",     description: "Take notes",                  icon: StickyNote,      category: "productivity", needsInput: true },
  { id: "checklist", label: "/checklist", description: "Make a checklist",            icon: ClipboardList,   category: "productivity", needsInput: true },
  { id: "roadmap",   label: "/roadmap",   description: "Create a roadmap",            icon: Map,             category: "productivity", needsInput: true },
  { id: "goal",      label: "/goal",      description: "Set a goal",                  icon: Target,          category: "productivity", needsInput: true },

  // ── AI Features ────────────────────────────────────────────────────
  { id: "deepresearch", label: "/deepresearch", description: "Deep web research mode", icon: Globe,           category: "ai" },
  { id: "agent",        label: "/agent",        description: "Switch AI agent mode",   icon: Cpu,             category: "ai" },
  { id: "analyze",      label: "/analyze",      description: "Analyze content",        icon: BarChart3,       category: "ai", needsInput: true },
  { id: "brainstorm",   label: "/brainstorm",   description: "Brainstorm ideas",       icon: Sparkles,        category: "ai", needsInput: true },
  { id: "design",       label: "/design",       description: "Design mode",            icon: Palette,         category: "ai", needsInput: true },
  { id: "workflow",     label: "/workflow",     description: "Create a workflow",       icon: Workflow,        category: "ai", needsInput: true },

  // ── Developer ──────────────────────────────────────────────────────
  { id: "git",         label: "/git",         description: "Git operations",           icon: GitBranch,       category: "developer", needsInput: true },
  { id: "docker",      label: "/docker",      description: "Docker configuration",    icon: Terminal,        category: "developer", needsInput: true },
  { id: "deploy",      label: "/deploy",      description: "Deployment guide",         icon: Rocket,          category: "developer", needsInput: true },
  { id: "database",    label: "/database",    description: "Design database schema",   icon: Database,        category: "developer", needsInput: true },
  { id: "security",    label: "/security",    description: "Security audit",           icon: Shield,          category: "developer", needsInput: true },
  { id: "performance", label: "/performance", description: "Performance analysis",     icon: Gauge,           category: "developer", needsInput: true },

  // ── Data Analysis ──────────────────────────────────────────────────
  { id: "chart",       label: "/chart",       description: "Generate a chart",         icon: BarChart3,       category: "data", needsInput: true },
  { id: "analyze-data",label: "/analyze-data",description: "Analyze dataset",          icon: BarChart3,       category: "data", needsInput: true },
  { id: "statistics",  label: "/statistics",  description: "Statistical analysis",     icon: BarChart3,       category: "data", needsInput: true },
  { id: "report",      label: "/report",      description: "Generate report",          icon: FileText,        category: "data", needsInput: true },

  // ── Utility ────────────────────────────────────────────────────────
  { id: "help",       label: "/help",       description: "Show all commands",          icon: HelpCircle,      category: "utility" },
  { id: "settings",   label: "/settings",   description: "Open settings",             icon: Settings,        category: "utility" },
  { id: "models",     label: "/models",     description: "Switch AI model",            icon: Cpu,             category: "utility" },
  { id: "joke",       label: "/joke",       description: "Tell a joke",               icon: Stars,           category: "utility" },
  { id: "quote",      label: "/quote",      description: "Inspirational quote",       icon: Heart,           category: "utility" },
  { id: "fact",       label: "/fact",       description: "Interesting fact",           icon: Lightbulb,       category: "utility" },
  { id: "weather",    label: "/weather",    description: "Check weather",              icon: Globe,           category: "utility", needsInput: true },
  { id: "calculate",  label: "/calculate",  description: "Math calculator",            icon: Calculator,      category: "utility", needsInput: true },
  { id: "convert",    label: "/convert",    description: "Unit / currency converter",  icon: ArrowRightLeft,  category: "utility", needsInput: true },
  { id: "hash",       label: "/hash",       description: "Generate hash / checksum",   icon: Hash,            category: "utility", needsInput: true },
  { id: "url",        label: "/url",        description: "Encode / decode URL",        icon: Link,            category: "utility", needsInput: true },

  // ── Media & Content ────────────────────────────────────────────────
  { id: "video-script",  label: "/video-script",  description: "Write a video script",       icon: Video,      category: "creative", needsInput: true },
  { id: "podcast",       label: "/podcast",       description: "Podcast outline / script",   icon: Mic,        category: "creative", needsInput: true },
  { id: "music",         label: "/music",         description: "Music lyrics or description", icon: Music,     category: "creative", needsInput: true },
  { id: "social",        label: "/social",        description: "Social media post",          icon: Share2,     category: "writing", needsInput: true },
  { id: "thread",        label: "/thread",        description: "Twitter / X thread",         icon: Hash,       category: "writing", needsInput: true },
  { id: "press",         label: "/press",         description: "Press release",              icon: Newspaper,  category: "writing", needsInput: true },

  // ── Business & Strategy ────────────────────────────────────────────
  { id: "pitch",         label: "/pitch",         description: "Startup pitch deck",         icon: Rocket,     category: "productivity", needsInput: true },
  { id: "competitive",   label: "/competitive",   description: "Competitive analysis",       icon: TrendingUp, category: "data", needsInput: true },
  { id: "swot",          label: "/swot",          description: "SWOT analysis",              icon: Award,      category: "data", needsInput: true },
  { id: "cover-letter",  label: "/cover-letter",  description: "Write a cover letter",       icon: Star,       category: "writing", needsInput: true },
  { id: "download",      label: "/download",      description: "Save / export conversation", icon: Download,   category: "utility" },
  { id: "resume",        label: "/resume",        description: "Build / improve a resume",   icon: FileText,   category: "writing", needsInput: true },
];

export const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  chat: "Chat & AI",
  coding: "Coding",
  web: "Web & Research",
  creative: "Creative",
  writing: "Writing",
  language: "Language",
  learning: "Learning",
  productivity: "Productivity",
  ai: "AI Features",
  developer: "Developer",
  data: "Data Analysis",
  utility: "Utility",
};

export const CATEGORY_ORDER: SlashCommandCategory[] = [
  "chat", "coding", "web", "creative", "writing", "language",
  "learning", "productivity", "ai", "developer", "data", "utility"
];

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase().replace(/^\//, "");
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.id.includes(q) ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.category.includes(q)
  );
}
