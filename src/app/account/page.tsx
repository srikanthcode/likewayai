"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Shield, LogOut, Smartphone, Clock, Monitor, Globe, Trash2, Check, Loader2, AlertTriangle, Copy, ChevronRight, Sparkles, Key, Fingerprint, History, RefreshCw, Mail, Plus, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

type Tab = "profile" | "sessions" | "security" | "apikeys";

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    let anim: number;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${p.alpha})`;
        ctx.fill();
      });
      anim = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function AccountPage() {
  const { user, isLoading, isAuthenticated, logout, updateProfile, refreshUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (tab === "sessions") {
      fetchSessions();
    }
    if (tab === "apikeys") {
      fetchApiKeys();
    }
  }, [tab]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/user/api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || {});
      }
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async (all = false) => {
    await logout(all);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    fetchSessions();
  };

  const handleSaveApiKey = async () => {
    if (!newKeyProvider || !newKeyValue) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: newKeyProvider, key: newKeyValue }),
      });
      if (res.ok) {
        setApiKeys({ ...apiKeys, [newKeyProvider]: newKeyValue });
        setNewKeyProvider("");
        setNewKeyValue("");
        setShowAddKey(false);
      }
    } catch {}
    setSavingKey(false);
  };

  const handleDeleteApiKey = async (provider: string) => {
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        const newKeys = { ...apiKeys };
        delete newKeys[provider];
        setApiKeys(newKeys);
      }
    } catch {}
  };

  const tabs = [
    { id: "profile" as Tab, label: "Profile", icon: User },
    { id: "sessions" as Tab, label: "Devices", icon: Monitor },
    { id: "security" as Tab, label: "Security", icon: Shield },
    { id: "apikeys" as Tab, label: "API Keys", icon: Key },
  ];

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full blur-xl animate-pulse" />
          <Loader2 size={28} className="relative animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080f] text-white overflow-hidden">
      <Particles />

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[150px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-violet-500/5 blur-[150px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-amber-500/3 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link
            href="/"
            className="group relative flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeft size={16} className="relative text-gray-400 group-hover:text-white transition-colors group-hover:-translate-x-0.5 transition-transform" />
            <span className="relative text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase hidden sm:block">Powered by</span>
            <span className="font-black tracking-widest bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent text-sm">LIKEWAY</span>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative flex gap-1 mb-8 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl overflow-x-auto scrollbar-none"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 sm:flex-1 justify-center group"
              >
                {active && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-white/[0.08]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={15} className={`relative z-10 transition-colors ${active ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300"}`} />
                <span className={`relative z-10 transition-colors ${active ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}>{t.label}</span>
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Avatar & Identity Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-400 to-violet-400 rounded-2xl blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-cyan-500/20">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#05080f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{user.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                        <Sparkles size={10} />
                        {user.plan} plan
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Profile Information */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-5"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                  <User size={14} className="text-cyan-400" />
                  <h4 className="text-sm font-bold">Profile Information</h4>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all placeholder:text-gray-600"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">User ID</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={user.id}
                        disabled
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-gray-500 text-xs font-mono cursor-not-allowed"
                      />
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(user.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="relative w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : saved ? (
                      <><Check size={16} /> Saved!</>
                    ) : (
                      <><RefreshCw size={16} /> Save Changes</>
                    )}
                  </span>
                </button>
              </motion.div>

              {/* Current Plan */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <h4 className="text-sm font-bold">Current Plan</h4>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wider">
                    {user.plan}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  {user.plan === "free"
                    ? "Explore AI capabilities with basic models. Upgrade to unlock premium features."
                    : "You have access to all premium features. Enjoy the full power of Likeway AI."}
                </p>
                <Link
                  href="/pricing"
                  className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 text-xs font-bold hover:from-amber-500/25 hover:to-orange-500/25 transition-all border border-amber-500/20 group/plan"
                >
                  <span>{user.plan === "free" ? "Upgrade Plan" : "Manage Plan"}</span>
                  <ChevronRight size={14} className="group-hover/plan:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>

              {/* Danger Zone */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-6 rounded-2xl bg-red-500/[0.03] border border-red-500/10"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-red-400" />
                  <h4 className="text-sm font-bold text-red-400">Danger Zone</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4">Sign out of your account on this device.</p>
                <button
                  onClick={() => handleLogout()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/10"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </motion.div>
            </motion.div>
          )}

          {tab === "sessions" && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <Monitor size={16} className="text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold">Active Sessions</h3>
                    <p className="text-[11px] text-gray-500">{sessions.length} device{sessions.length !== 1 ? "s" : ""} connected</p>
                  </div>
                </div>
                {sessions.length > 0 && (
                  <button
                    onClick={() => setShowLogoutAll(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={12} />
                    Log Out All
                  </button>
                )}
              </motion.div>

              {sessions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <Smartphone size={32} className="text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No active sessions</p>
                  <p className="text-xs text-gray-600 mt-1">Your devices will appear here when connected.</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.06]">
                          <Smartphone size={16} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.deviceName?.slice(0, 50) || "Unknown device"}</p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={9} />
                              {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleDateString() : "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe size={9} />
                              {session.ipAddress || "Unknown IP"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session._id)}
                        className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {showLogoutAll && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 rounded-2xl bg-red-500/[0.04] border border-red-500/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      <p className="text-sm font-bold text-red-400">Log out all other devices?</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">This will sign out all sessions except this one.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowLogoutAll(false)}
                        className="px-5 py-2 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-bold hover:bg-white/[0.08] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleLogout(true); setShowLogoutAll(false); }}
                        className="px-5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-400 transition-all"
                      >
                        Log Out All
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {tab === "apikeys" && (
            <motion.div
              key="apikeys"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-cyan-400" />
                    <h4 className="text-sm font-bold">API Keys</h4>
                  </div>
                  <button
                    onClick={() => setShowAddKey(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
                  >
                    <Plus size={12} />
                    Add Key
                  </button>
                </div>
                <p className="text-xs text-gray-500">Manage your third-party API keys for various providers.</p>

                {Object.keys(apiKeys).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <Key size={32} className="text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No API keys configured</p>
                    <p className="text-xs text-gray-600 mt-1">Add your API keys to use third-party providers.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(apiKeys).map(([provider, key], i) => (
                      <motion.div
                        key={provider}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.06]">
                            <Key size={16} className="text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium capitalize">{provider}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 font-mono text-[10px] text-gray-500 truncate">
                                {showKeys[provider] ? key : "•".repeat(Math.min(key.length, 32))}
                              </div>
                              <button
                                onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.1] transition-all"
                              >
                                {showKeys[provider] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteApiKey(provider)}
                          className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              <AnimatePresence>
                {showAddKey && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">Add API Key</h4>
                      <button
                        onClick={() => setShowAddKey(false)}
                        className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.1] transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Provider</label>
                      <select
                        value={newKeyProvider}
                        onChange={(e) => setNewKeyProvider(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all"
                      >
                        <option value="">Select provider</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq</option>
                        <option value="mistral">Mistral</option>
                        <option value="openai">OpenAI</option>
                        <option value="tavily">Tavily</option>
                        <option value="stability">Stability AI</option>
                        <option value="huggingface">Hugging Face</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">API Key</label>
                      <input
                        type="password"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all placeholder:text-gray-600"
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAddKey(false)}
                        className="px-5 py-2 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-bold hover:bg-white/[0.08] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveApiKey}
                        disabled={savingKey || !newKeyProvider || !newKeyValue}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-xs font-bold hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50"
                      >
                        {savingKey ? <Loader2 size={14} className="animate-spin" /> : "Save Key"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {tab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Security Settings */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                  <Shield size={14} className="text-cyan-400" />
                  <h4 className="text-sm font-bold">Security Settings</h4>
                </div>
                {[
                  {
                    icon: Fingerprint,
                    label: "Two-Factor Authentication",
                    desc: "Add an extra layer of security to your account.",
                    status: "Coming soon",
                    color: "cyan",
                  },
                  {
                    icon: Check,
                    label: "Email Verification",
                    desc: user?.emailVerified ? "Your email is verified." : "Verify your email to secure your account.",
                    status: user?.emailVerified ? "Verified" : "Not verified",
                    color: user?.emailVerified ? "emerald" : "yellow",
                  },
                  {
                    icon: Key,
                    label: "Password",
                    desc: user?.provider === "email" ? "Change your account password." : "Managed via Google OAuth.",
                    status: user?.provider === "email" ? "Configured" : "OAuth",
                    color: user?.provider === "email" ? "emerald" : "cyan",
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          item.color === "cyan" ? "bg-cyan-500/10 text-cyan-400" :
                          item.color === "emerald" ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        item.color === "cyan" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        item.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </motion.div>

              {/* Login History */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                  <History size={14} className="text-cyan-400" />
                  <h4 className="text-sm font-bold">Login History</h4>
                </div>
                <p className="text-xs text-gray-500">Your recent account activity across devices.</p>
                {[
                  { provider: "Google OAuth", device: "Chrome on Windows", ip: "192.168.1.1", time: "Today at 10:45 PM", location: "Chennai, India" },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/10">
                      <Globe size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entry.device}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span>{entry.location}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                        <span>{entry.ip}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                        <span>{entry.provider}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{entry.time}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
