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
  Play,
  Key,
  Server,
  Terminal,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Github = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  iconName: string;
  version: string;
  isConnected: boolean;
  connectedAccount?: {
    username?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    details?: string;
  };
  requiredScopes: string[];
  toolsCount: number;
  toolsList: {
    name: string;
    description: string;
    parameters?: Record<string, ToolParameter>;
    requiresApproval?: boolean;
    risk?: string;
  }[];
  riskLevel: "low" | "medium" | "high";
  docsUrl?: string;
  configFields?: {
    key: string;
    label: string;
    type: "text" | "password" | "url";
    placeholder: string;
    helperText?: string;
    required: boolean;
  }[];
}

const CATEGORIES = [
  { id: "all", label: "All Integrations" },
  { id: "developer", label: "Developer Tools" },
  { id: "browser", label: "Browser & Web" },
  { id: "communication", label: "Email & Workspace" },
  { id: "storage", label: "Files & Cloud" },
  { id: "mcp", label: "MCP Protocol" },
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
  const [activeDrawer, setActiveDrawer] = useState<IntegrationItem | null>(null);

  // Connection & credential configuration form state
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live tool playground state
  const [activeTab, setActiveTab] = useState<"config" | "tools">("config");
  const [selectedToolName, setSelectedToolName] = useState<string>("");
  const [toolInputs, setToolInputs] = useState<Record<string, string>>({});
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolResult, setToolResult] = useState<any>(null);

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
      setVerifyMessage(null);
      setToolResult(null);
    }
  }, [isOpen]);

  const openAppConfig = (app: IntegrationItem) => {
    setActiveDrawer(app);
    setActiveTab("config");
    setVerifyMessage(null);
    setToolResult(null);
    setConfigValues({});
    if (app.toolsList.length > 0) {
      setSelectedToolName(app.toolsList[0].name);
      // Prepopulate sample test values
      if (app.id === "github") {
        setToolInputs({ query: "nextjs", sort: "stars", owner: "vercel", repo: "next.js", path: "package.json" });
      } else if (app.id === "browser_automation") {
        setToolInputs({ url: "https://news.ycombinator.com" });
      } else {
        setToolInputs({});
      }
    }
  };

  const handleVerifyAndConnect = async (appId: string) => {
    try {
      setIsVerifying(true);
      setVerifyMessage(null);

      const res = await fetch("/api/integrations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          credentials: configValues,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyMessage({
          type: "success",
          text: data.message || "Connection verified successfully!",
        });
        await fetchIntegrations();
      } else {
        setVerifyMessage({
          type: "error",
          text: data.error || "Verification failed. Please check your credentials.",
        });
      }
    } catch (err: any) {
      setVerifyMessage({
        type: "error",
        text: err.message || "Network error while connecting.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async (appId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, action: "disconnect" }),
      });
      if (res.ok) {
        await fetchIntegrations();
        setVerifyMessage({ type: "success", text: "Successfully disconnected." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunLiveTool = async (toolName: string) => {
    try {
      setIsExecutingTool(true);
      setToolResult(null);

      const res = await fetch("/api/integrations/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          params: toolInputs,
        }),
      });

      const data = await res.json();
      setToolResult(data);
    } catch (err: any) {
      setToolResult({ success: false, error: err.message || "Tool execution failed." });
    } finally {
      setIsExecutingTool(false);
    }
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={cn(
          "relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden",
          isDark
            ? "bg-[#0c1017] border-white/10 text-gray-100 shadow-cyan-950/20"
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Connected Applications & Tools Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Real Connect & Execution
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Grant the AI assistant real-time authorized capabilities with verified OAuth, personal tokens & live web tools.
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-inherit bg-black/10">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, real tools, permissions…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all",
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

        {/* Integrations Catalog Grid */}
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-cyan-400 shrink-0">
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">v{item.version}</span>
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold",
                            item.isConnected ? "text-emerald-400" : "text-gray-500"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.isConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                            )}
                          />
                          {item.isConnected
                            ? item.connectedAccount?.username
                              ? `Connected as @${item.connectedAccount.username}`
                              : "Connected & Active"
                            : "Not Connected"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openAppConfig(item)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 active:scale-95",
                        item.isConnected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 hover:brightness-110"
                      )}
                    >
                      {item.isConnected ? "Manage / Test" : "Connect & Configure"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Connected Details Badge if verified */}
                  {item.connectedAccount?.details && (
                    <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      <span className="truncate">{item.connectedAccount.details}</span>
                    </div>
                  )}

                  {/* Tools List Pills */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {item.toolsList.map((tool) => (
                      <span
                        key={tool.name}
                        className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-300"
                      >
                        <Zap size={9} className="text-cyan-400" />
                        <span>{tool.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Shield size={12} className="text-emerald-400" />
                    <span>Real API Protocol</span>
                  </span>
                  <button
                    onClick={() => openAppConfig(item)}
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Configure & Test</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real Connection & Live Testing Drawer */}
        <AnimatePresence>
          {activeDrawer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 z-30 bg-[#0c1017] p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      <span>{activeDrawer.name}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-semibold border",
                        activeDrawer.isConnected
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}>
                        {activeDrawer.isConnected ? "✓ Live & Active" : "Disconnected"}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Switch between Credentials & Live Tools Playground */}
                    <div className="flex items-center rounded-xl bg-white/[0.06] p-0.5 border border-white/10">
                      <button
                        onClick={() => setActiveTab("config")}
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                          activeTab === "config" ? "bg-cyan-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                      >
                        Configuration
                      </button>
                      <button
                        onClick={() => setActiveTab("tools")}
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                          activeTab === "tools" ? "bg-cyan-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                      >
                        <Play size={10} />
                        <span>Live Tool Tester</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setActiveDrawer(null)}
                      className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Banner Status Alert if any */}
                {verifyMessage && (
                  <div
                    className={cn(
                      "mt-4 p-3 rounded-xl border text-xs flex items-center gap-2",
                      verifyMessage.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    )}
                  >
                    {verifyMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{verifyMessage.text}</span>
                  </div>
                )}

                {/* Tab 1: Real Credentials & Verification */}
                {activeTab === "config" && (
                  <div className="mt-5 space-y-5">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                        Real Connection Settings
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Configure real authentication credentials. Your credentials enable the AI assistant to perform live actions on your behalf.
                      </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3.5">
                      {activeDrawer.configFields?.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                            <span>{field.label}</span>
                            {field.required ? (
                              <span className="text-[10px] text-amber-400 font-normal">Required</span>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-normal">Optional</span>
                            )}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={configValues[field.key] || ""}
                            onChange={(e) =>
                              setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-gray-100 placeholder:text-gray-600 outline-none focus:border-cyan-500"
                          />
                          {field.helperText && (
                            <p className="text-[11px] text-gray-500">{field.helperText}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => handleVerifyAndConnect(activeDrawer.id)}
                        disabled={isVerifying}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Verifying Live Connection...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            <span>Verify & Connect Real Service</span>
                          </>
                        )}
                      </button>

                      {activeDrawer.isConnected && (
                        <button
                          onClick={() => handleDisconnect(activeDrawer.id)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                        >
                          Disconnect
                        </button>
                      )}

                      {activeDrawer.id === "github" && (
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo:read,read:user&description=Likeway+AI+Agent"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1.5"
                        >
                          <span>Generate GitHub Token ↗</span>
                        </a>
                      )}
                    </div>

                    {/* Granted Scopes */}
                    <div className="pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                        Authorized Permissions & Scopes
                      </h4>
                      <ul className="mt-2.5 space-y-1.5">
                        {activeDrawer.requiredScopes.map((scope) => (
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
                  </div>
                )}

                {/* Tab 2: Live Tool Tester & Real Usage Playground */}
                {activeTab === "tools" && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                        Live Tool Execution Playground
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Test and execute real tools live against real APIs right now. Zero simulated mocks.
                      </p>
                    </div>

                    {/* Tool Selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">Select Tool to Test</label>
                      <select
                        value={selectedToolName}
                        onChange={(e) => {
                          setSelectedToolName(e.target.value);
                          setToolResult(null);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-[#161d2b] px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-500"
                      >
                        {activeDrawer.toolsList.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} — {t.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Tool Parameters Inputs */}
                    {(() => {
                      const currentTool = activeDrawer.toolsList.find((t) => t.name === selectedToolName);
                      if (!currentTool || !currentTool.parameters) return null;
                      const paramEntries = Object.entries(currentTool.parameters);

                      return (
                        <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                          <span className="text-xs font-bold text-gray-300">Tool Parameters</span>
                          {paramEntries.map(([paramKey, paramDef]) => (
                            <div key={paramKey} className="space-y-1">
                              <label className="text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                                <span>{paramKey}</span>
                                <span className="text-gray-500 font-sans text-[10px]">{paramDef.description}</span>
                              </label>
                              <input
                                type="text"
                                value={toolInputs[paramKey] || ""}
                                onChange={(e) =>
                                  setToolInputs((prev) => ({ ...prev, [paramKey]: e.target.value }))
                                }
                                placeholder={paramDef.description}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Execute Button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRunLiveTool(selectedToolName)}
                        disabled={isExecutingTool}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isExecutingTool ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Executing Real API Request...</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} />
                            <span>Execute Tool Live</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Real JSON Output Display */}
                    {toolResult && (
                      <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="font-mono text-[11px] text-cyan-400">Live API Execution Result:</span>
                          <span className={toolResult.success ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {toolResult.success ? "✓ 200 OK" : "✗ Error"}
                          </span>
                        </div>
                        <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-gray-300 max-h-56 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(toolResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  LikeWay Connected Ecosystem • Real Protocol Handlers
                </span>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
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
