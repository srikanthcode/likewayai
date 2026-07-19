"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronDown, Lock, Sparkles } from "lucide-react";
import { AGENT_REGISTRY, getAgentById } from "@/lib/agent-registry";
import { AGENT_CATEGORIES, AgentCategory, AgentDefinition, PlanTier, canAccessAgent } from "@/lib/agent-types";

interface AgentSelectorProps {
  selectedAgentId: string;
  onSelect: (agent: AgentDefinition) => void;
  currentPlan: PlanTier;
}

export default function AgentSelector({ selectedAgentId, onSelect, currentPlan }: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<AgentCategory | "all">("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAgent = getAgentById(selectedAgentId) || AGENT_REGISTRY[0];

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter agents
  const filteredAgents = useMemo(() => {
    let agents = AGENT_REGISTRY;

    if (search) {
      const q = search.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== "all") {
      agents = agents.filter(a => a.category === activeCategory);
    }

    return agents;
  }, [search, activeCategory]);

  // Group by category
  const groupedAgents = useMemo(() => {
    const groups: Record<string, AgentDefinition[]> = {};
    for (const agent of filteredAgents) {
      const cat = agent.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(agent);
    }
    return groups;
  }, [filteredAgents]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2 rounded-full flex items-center gap-1.5 text-[10px] font-semibold border border-white/10 hover:border-white/20 transition-all duration-200"
        style={{ borderColor: `${selectedAgent.color}30` }}
      >
        <span className="text-xs">{selectedAgent.icon}</span>
        <span className="hidden sm:inline max-w-[80px] truncate">{selectedAgent.name}</span>
        <ChevronDown size={10} className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] max-w-[360px] max-h-[480px] bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/5 scrollbar-none">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === "all"
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                All ({AGENT_REGISTRY.length})
              </button>
              {Object.entries(AGENT_CATEGORIES).map(([key, cat]) => {
                const count = AGENT_REGISTRY.filter(a => a.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key as AgentCategory)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeCategory === key
                        ? "bg-white/10 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="text-gray-600 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Agent List */}
            <div className="overflow-y-auto max-h-[340px] p-2">
              {Object.entries(groupedAgents).map(([category, agents]) => (
                <div key={category} className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {AGENT_CATEGORIES[category as AgentCategory]?.icon}{" "}
                    {AGENT_CATEGORIES[category as AgentCategory]?.name}
                  </div>
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        if (!canAccessAgent(currentPlan, agent.minPlan)) return;
                        onSelect(agent);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      disabled={!canAccessAgent(currentPlan, agent.minPlan)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                        selectedAgentId === agent.id
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      } ${!canAccessAgent(currentPlan, agent.minPlan) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="text-xl mt-0.5 shrink-0">{agent.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{agent.name}</span>
                          {!canAccessAgent(currentPlan, agent.minPlan) && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              <Lock size={8} />
                              {agent.minPlan}
                            </span>
                          )}
                          {canAccessAgent(currentPlan, agent.minPlan) && agent.minPlan !== "Core" && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                              <Sparkles size={8} />
                              {agent.minPlan}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{agent.description}</p>
                        <div className="flex gap-1 mt-1.5">
                          {agent.capabilities.slice(0, 4).map(cap => (
                            <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-gray-400">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedAgentId === agent.id && (
                        <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: agent.color }} />
                      )}
                    </button>
                  ))}
                </div>
              ))}

              {filteredAgents.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No agents found for "{search}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
