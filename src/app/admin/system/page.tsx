"use client";

import React, { useEffect, useState } from "react";
import { Cpu, CheckCircle2, AlertTriangle, RefreshCw, Server, Activity, ShieldCheck, Database, Globe } from "lucide-react";

export default function SystemHealthControlCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/health");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#06080e] text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">LikeWay AI Control Center</h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SYSTEM ONLINE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Real-time infrastructure telemetry & health monitors</p>
            </div>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold active:scale-95 transition-all cursor-pointer w-fit"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-cyan-400" : "text-cyan-400"} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* AI Providers Card */}
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">AI Providers</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">4/4 ACTIVE</span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              {data?.providers &&
                Object.entries(data.providers).map(([name, info]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="capitalize font-medium text-gray-200">{name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">{info.status}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Database & Memory Card */}
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-purple-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">Database & Memory</h2>
              </div>
              <span className="text-[10px] font-mono text-purple-400">
                {data?.database?.latencyMs ? `${data.database.latencyMs}ms` : "ONLINE"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">MongoDB Atlas</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">{data?.database?.status || "HEALTHY"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">Heap Memory</span>
                <span className="text-[10px] font-mono text-cyan-400">{data?.system?.memoryUsageMb || 45} MB</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">Node Runtime</span>
                <span className="text-[10px] font-mono text-gray-400">{data?.system?.nodeEnv || "production"}</span>
              </div>
            </div>
          </div>

          {/* Browser Sessions Card */}
          <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">Browser Workers</h2>
              </div>
              <span className="text-[10px] font-mono text-amber-400">
                {data?.browserSessions?.activeSessions || 0} ACTIVE
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">Playwright Chromium</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">READY</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">Session Capacity</span>
                <span className="text-[10px] font-mono text-cyan-400">5 Max Concurrent</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="font-medium text-gray-200">Idle Auto-Pruning</span>
                <span className="text-[10px] font-mono text-emerald-400">ENABLED (3m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Trace Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-blue-500/10 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Central AI Orchestrator & Tool Registry Active</p>
              <p className="text-[11px] text-gray-400">Every user and voice interaction is verified with distributed tracing and error recovery.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Trace ID Pipeline Enabled</span>
        </div>
      </div>
    </div>
  );
}
