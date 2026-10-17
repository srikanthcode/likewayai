"use client";

import { Globe, Brain, Monitor, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

// Active-mode badges shown above the composer.

interface ModePillsProps {
  theme: "dark" | "light";
  webSearch?: boolean;
  deepThinking?: boolean;
  eliteReasoning?: boolean;
  browser?: boolean;
  automation?: boolean;
}

const pillBase =
  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-md text-[9px] font-black uppercase tracking-widest";

function tone(theme: "dark" | "light", color: "sky" | "purple" | "cyan" | "emerald") {
  const map = {
    sky: {
      dark: "bg-[#0d0d0f] border-sky-500/40 text-sky-400 shadow-sky-500/15",
      light: "bg-white border-sky-500/30 text-sky-600 shadow-sky-500/10",
      dot: "bg-sky-400",
    },
    purple: {
      dark: "bg-[#0d0d0f] border-purple-500/40 text-purple-400 shadow-purple-500/15",
      light: "bg-white border-purple-500/30 text-purple-600 shadow-purple-500/10",
      dot: "bg-purple-400",
    },
    cyan: {
      dark: "bg-[#0d0d0f] border-cyan-500/40 text-cyan-400 shadow-cyan-500/15",
      light: "bg-white border-cyan-500/30 text-cyan-600 shadow-cyan-500/10",
      dot: "bg-cyan-400",
    },
    emerald: {
      dark: "bg-[#0d0d0f] border-emerald-500/40 text-emerald-400 shadow-emerald-500/15",
      light: "bg-white border-emerald-500/30 text-emerald-600 shadow-emerald-500/10",
      dot: "bg-emerald-400",
    },
  } as const;
  return map[color];
}

export default function ModePills({
  theme,
  webSearch,
  deepThinking,
  eliteReasoning,
  browser,
  automation,
}: ModePillsProps) {
  if (!webSearch && !deepThinking && !eliteReasoning && !browser && !automation) return null;

  const items: Array<{ key: string; color: "sky" | "purple" | "cyan" | "emerald"; icon?: React.ReactNode; label: string }> = [];
  if (webSearch) items.push({ key: "web", color: "sky", icon: <Globe size={9} />, label: "Web Search" });
  if (deepThinking) items.push({ key: "think", color: "purple", icon: <Brain size={9} />, label: "Deep Thinking" });
  if (eliteReasoning) items.push({ key: "elite", color: "cyan", label: "Elite Reasoning" });
  if (browser) items.push({ key: "browser", color: "emerald", icon: <Monitor size={9} />, label: "Browser" });
  if (automation) items.push({ key: "automation", color: "purple", icon: <Cpu size={9} />, label: "Automation" });

  return (
    <div className="absolute -top-3 left-4 z-10 flex gap-2 flex-wrap">
      {items.map((item) => {
        const t = tone(theme, item.color);
        return (
          <div key={item.key} className={cn(pillBase, theme === "dark" ? t.dark : t.light)}>
            <div className={cn("w-1 h-1 rounded-full animate-pulse", t.dot)} />
            {item.icon} {item.label}
          </div>
        );
      })}
    </div>
  );
}