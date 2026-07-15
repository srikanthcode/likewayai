"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Monitor, Smartphone, Tablet,
  Globe, MapPin, Clock, LogOut, Shield,
  AlertTriangle, Trash2, RefreshCw
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface Session {
  _id: string;
  userId: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  createdAt: string;
}

function getDeviceIcon(deviceName: string, browser: string) {
  const ua = (deviceName + " " + browser).toLowerCase();
  if (ua.includes("iphone") || ua.includes("android") || ua.includes("mobile")) {
    return <Smartphone size={20} className="text-violet-400" />;
  }
  if (ua.includes("ipad") || ua.includes("tablet")) {
    return <Tablet size={20} className="text-blue-400" />;
  }
  return <Monitor size={20} className="text-emerald-400" />;
}

function getBrowserName(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("edg")) return "Microsoft Edge";
  if (u.includes("chrome")) return "Chrome";
  if (u.includes("firefox")) return "Firefox";
  if (u.includes("safari") && !u.includes("chrome")) return "Safari";
  if (u.includes("opera") || u.includes("opr")) return "Opera";
  return "Browser";
}

function getOSName(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("windows nt 10") || u.includes("windows nt 11")) return "Windows";
  if (u.includes("mac os x")) return "macOS";
  if (u.includes("linux")) return "Linux";
  if (u.includes("android")) return "Android";
  if (u.includes("iphone") || u.includes("ipad")) return "iOS";
  return "Unknown OS";
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function SessionCard({
  session,
  isCurrent,
  onRevoke,
  revoking,
}: {
  session: Session;
  isCurrent: boolean;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const browserName = getBrowserName(session.browser);
  const osName = getOSName(session.browser);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
        isCurrent
          ? "bg-violet-500/[0.07] border-violet-500/20"
          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.05]"
      }`}
    >
      {/* Device icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isCurrent ? "bg-violet-500/20" : "bg-white/5"
      }`}>
        {getDeviceIcon(session.deviceName, session.browser)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-white truncate">{browserName} on {osName}</span>
          {isCurrent && (
            <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 font-medium">
              This device
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Globe size={11} />
            {session.ipAddress !== "unknown" ? session.ipAddress : "IP unknown"}
          </span>
          {session.location && session.location !== "unknown" && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {session.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {timeAgo(session.lastActiveAt)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-gray-600">
          Created {new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Revoke button */}
      {!isCurrent && (
        <button
          onClick={() => onRevoke(session._id)}
          disabled={revoking}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-gray-500 transition-all disabled:opacity-50 group"
          title="Revoke session"
        >
          {revoking ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
          )}
        </button>
      )}
    </motion.div>
  );
}

export default function SessionsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        setError("Failed to load sessions.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchSessions();
  }, [isAuthenticated]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    setError("");
    try {
      const res = await fetch("/api/auth/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        setSuccess("Session revoked successfully.");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to revoke session.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  const logoutAll = async () => {
    setLoggingOutAll(true);
    await logout(true);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  // Identify current session by most recent lastActiveAt
  const currentSession = sessions.reduce<Session | null>((latest, s) => {
    if (!latest) return s;
    return new Date(s.lastActiveAt) > new Date(latest.lastActiveAt) ? s : latest;
  }, null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Settings
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Shield size={20} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Active Sessions</h1>
                <p className="text-gray-500 text-sm">Manage devices that are logged into your account</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              ✓ {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sessions list */}
        <div className="space-y-2 mb-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
            ))
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Monitor size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active sessions found.</p>
            </div>
          ) : (
            <AnimatePresence>
              {sessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  isCurrent={session._id === currentSession?._id}
                  onRevoke={revokeSession}
                  revoking={revoking === session._id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Danger zone */}
        {sessions.length > 0 && (
          <div className="p-5 rounded-xl bg-red-500/[0.05] border border-red-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm text-red-400 mb-1">Log out all devices</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This will immediately sign you out of all sessions across all devices, including this one. You'll need to sign in again.
                </p>
              </div>
              <button
                onClick={logoutAll}
                disabled={loggingOutAll}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-medium transition-all disabled:opacity-50 active:scale-[0.97]"
              >
                {loggingOutAll ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {loggingOutAll ? "Logging out…" : "Log out all"}
              </button>
            </div>
          </div>
        )}

        {/* Security tip */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/8 flex items-start gap-3">
          <Shield size={15} className="text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            If you see a session you don't recognize, revoke it immediately and{" "}
            <a href="/account" className="text-gray-400 hover:text-white transition-colors underline underline-offset-2">
              change your password
            </a>
            . Never share your login credentials with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
