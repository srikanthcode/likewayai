"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Lock,
  Mail,
  Globe,
  Folder,
  Cpu,
  RefreshCw,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Github = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  iconName: string;
  version: string;
  isConnected: boolean;
  requiredScopes: string[];
  toolsCount: number;
  toolsList: { name: string; description: string; requiresApproval?: boolean }[];
  riskLevel: "low" | "medium" | "high";
}

const CATEGORIES = [
  { id: "all", label: "All Integrations" },
  { id: "communication", label: "Email & Chat" },
  { id: "developer", label: "Developer Tools" },
  { id: "browser", label: "Browser Automation" },
  { id: "storage", label: "Files & Cloud" },
  { id: "mcp", label: "MCP Plugins" },
];

const ICONS: Record<string, any> = {
  Mail,
  Github,
  Globe,
  Folder,
  Cpu,
};

export default function ConnectedAppsModal({
  isOpen,
  onClose,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
}) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<IntegrationItem | null>(null);

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);

  const toggleConnection = async (appId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          action: currentStatus ? "disconnect" : "connect",
        }),
      });
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === appId ? { ...item, isConnected: !currentStatus } : item
          )
        );
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp((prev) => prev ? { ...prev, isConnected: !currentStatus } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn(
          "relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-3xl border shadow-2xl overflow-hidden",
          isDark
            ? "bg-[#0b0f19] border-white/10 text-gray-100 shadow-cyan-950/20"
            : "bg-white border-gray-200 text-gray-900 shadow-xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Connected Applications & Tools Hub</h2>
              <p className="text-xs text-gray-400">
                Grant the AI assistant real-time authorized capabilities across your services.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-b border-inherit bg-black/10">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, tools, permissions…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                  selectedCategory === cat.id
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIntegrations.map((item) => {
            const Icon = ICONS[item.iconName] || Globe;
            return (
              <div
                key={item.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all",
                  isDark
                    ? "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                )}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-cyan-400">
                        <Icon size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">v{item.version}</span>
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold",
                            item.isConnected ? "text-emerald-400" : "text-gray-500"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.isConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                            )}
                          />
                          {item.isConnected ? "Connected & Active" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleConnection(item.id, item.isConnected)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
                        item.isConnected
                          ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 hover:brightness-110"
                      )}
                    >
                      {item.isConnected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  <p className="mt-3.5 text-xs text-gray-400 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.toolsList.map((tool) => (
                      <span
                        key={tool.name}
                        className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-300"
                      >
                        <Zap size={9} className="text-cyan-400" />
                        <span>{tool.name}</span>
                        {tool.requiresApproval && (
                          <span className="text-amber-400" title="Requires human approval">
                            🔒
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Shield size={12} className="text-emerald-400" />
                    <span>OAuth 2.0 PKCE Enforced</span>
                  </span>
                  <button
                    onClick={() => setSelectedApp(item)}
                    className="text-cyan-400 hover:underline"
                  >
                    View permissions & tools →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected App Detail Drawer / Overlay */}
        <AnimatePresence>
          {selectedApp && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute inset-0 z-20 bg-[#0b0f19] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-white">{selectedApp.name} Permissions</h3>
                    <span className="rounded bg-cyan-500/10 text-cyan-400 text-xs px-2 py-0.5 font-semibold">
                      {selectedApp.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                      Granted OAuth Scopes
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {selectedApp.requiredScopes.map((scope) => (
                        <li
                          key={scope}
                          className="flex items-center gap-2 text-xs font-mono text-gray-300 bg-white/[0.03] p-2 rounded-lg border border-white/10"
                        >
                          <Check size={13} className="text-emerald-400 shrink-0" />
                          <span>{scope}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                      Registered Agent Tools ({selectedApp.toolsList.length})
                    </h4>
                    <div className="mt-2 space-y-2">
                      {selectedApp.toolsList.map((tool) => (
                        <div
                          key={tool.name}
                          className="p-3 rounded-xl border border-white/10 bg-white/[0.02]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-cyan-300">
                              {tool.name}
                            </span>
                            {tool.requiresApproval && (
                              <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded">
                                Human Approval Gate
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{tool.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="rounded-xl px-5 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
                >
                  Back to Hub
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
