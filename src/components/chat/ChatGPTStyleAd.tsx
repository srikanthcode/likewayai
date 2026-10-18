"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, MoreHorizontal, X, Info, ShieldCheck, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CAMPAIGN_URL = "https://cautiousfloor.com/drmNF.z-dNGBNIvdZOGVUg/deBmb9xuoZ/U/lSkoPjTMc/1UMXjkkF0yN/jKURt-NGz/Ugy/OETWQc2/OzQh";
const SCRIPT_URL_1 = "//simplistic-walk.com/baXkV.sydfGMlB0iYjW/cC/GemmD9MuvZEUFl/kjPGTmcp1dMfjTkh0KNnDGkttCNezrUsy/OETEQY1ZM-wo";
const SCRIPT_URL_2 = "https://cautiousfloor.com/drmNF.z-dNGBNIvdZOGVUg/deBmb9xuoZ/U/lSkoPjTMc/1UMXjkkF0yN/jKURt-NGz/Ugy/OETWQc2/OzQh";

interface ChatGPTStyleAdProps {
  theme?: "dark" | "light";
  onUpgradeClick?: () => void;
  className?: string;
}

export default function ChatGPTStyleAd({
  theme = "dark",
  onUpgradeClick,
  className,
}: ChatGPTStyleAdProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const adSlotRef = useRef<HTMLDivElement | null>(null);

  // In-page dynamic script injection for real ad network delivery
  useEffect(() => {
    if (isDismissed || !adSlotRef.current) return;

    try {
      // 1. Inject simplistic-walk loader
      const s1 = document.createElement("script");
      s1.src = SCRIPT_URL_1;
      s1.async = true;
      s1.referrerPolicy = "no-referrer-when-downgrade";
      adSlotRef.current.appendChild(s1);

      // 2. Inject cautiousfloor campaign script
      const s2 = document.createElement("script");
      s2.src = SCRIPT_URL_2;
      s2.async = true;
      s2.referrerPolicy = "no-referrer-when-downgrade";
      adSlotRef.current.appendChild(s2);
    } catch (e) {
      console.error("[AdNetwork loader error]", e);
    }
  }, [isDismissed]);

  if (isDismissed) return null;

  const isDark = theme === "dark";

  return (
    <>
      <div className={cn("w-full max-w-3xl mx-auto my-3 transition-all duration-300", className)}>
        {/* Label */}
        <div className="flex items-center justify-between mb-1.5 px-1">
          <p
            className={cn(
              "text-xs sm:text-[13px] font-medium tracking-tight",
              isDark ? "text-gray-400" : "text-gray-600"
            )}
          >
            Sponsored recommendation
          </p>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
              isDark
                ? "border-white/10 text-gray-400 bg-white/5"
                : "border-gray-200 text-gray-500 bg-gray-100"
            )}
          >
            Ad
          </span>
        </div>

        {/* Real Ad Card & Network Container */}
        <div
          className={cn(
            "relative rounded-2xl border p-3 sm:p-4 transition-all duration-200 group shadow-sm overflow-hidden",
            isDark
              ? "bg-[#141820] border-cyan-500/20 hover:border-cyan-500/40 text-white"
              : "bg-gradient-to-r from-gray-50 to-blue-50/30 border-blue-200 hover:border-blue-300 text-gray-900 shadow-sm"
          )}
        >
          {/* Real Network Ad Injection Container */}
          <div ref={adSlotRef} id="real-ad-slot-network" className="w-full min-h-[1px]" />

          {/* Interactive Live Ad Unit Banner */}
          <a
            href={CAMPAIGN_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block group/adcard no-underline"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Live Ad Icon / Badge */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20 group-hover/adcard:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Featured Offer
                    </span>
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-gray-400">Live Ad</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold truncate group-hover/adcard:text-cyan-400 transition-colors mt-0.5">
                    Click to view sponsored special deal & promotion
                  </h4>
                  <p className="text-xs text-gray-400 truncate">
                    Verified partner campaign • High-speed instant access
                  </p>
                </div>
              </div>

              {/* CTA button */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1 group-hover/adcard:brightness-110">
                  <span>Visit Sponsor</span>
                  <ArrowUpRight size={14} />
                </span>

                {/* More options button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu((prev) => !prev);
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors border",
                    isDark
                      ? "border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                      : "border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  )}
                  title="Ad options"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
          </a>

          {/* Options Dropdown Menu */}
          {showMenu && (
            <div
              className={cn(
                "absolute right-4 top-14 w-48 rounded-xl border shadow-xl z-50 py-1 text-xs",
                isDark
                  ? "bg-[#1f2430] border-white/10 text-gray-200"
                  : "bg-white border-gray-200 text-gray-800"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowInfoModal(true);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors",
                  isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
              >
                <Info size={13} className="text-gray-400" />
                <span>Why this ad?</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setIsDismissed(true);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-rose-400",
                  isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
              >
                <X size={13} />
                <span>Hide this ad</span>
              </button>
              {onUpgradeClick && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onUpgradeClick();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors border-t font-medium text-cyan-400",
                    isDark ? "border-white/10 hover:bg-white/10" : "border-gray-100 hover:bg-gray-100"
                  )}
                >
                  <Sparkles size={13} />
                  <span>Remove ads with ₹299 Go</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer Line Below Card */}
        <p
          className={cn(
            "text-[11px] leading-normal mt-2 px-1 text-center sm:text-left flex flex-wrap items-center justify-between gap-1",
            isDark ? "text-gray-500" : "text-gray-500"
          )}
        >
          <span>
            Ads help keep LikeWay AI models free. Upgrade to any paid plan (₹299+) for an ad-free experience.
          </span>
          <button
            onClick={() => setShowInfoModal(true)}
            className="hover:underline text-[11px] font-medium transition-colors text-gray-400 hover:text-gray-300 inline-flex items-center gap-0.5"
          >
            <span>Learn about ads</span>
            <span>›</span>
          </button>
        </p>
      </div>

      {/* Transparency Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 shadow-2xl relative",
              isDark ? "bg-[#181d28] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfoModal(false)}
              className={cn(
                "absolute top-4 right-4 p-1.5 rounded-lg transition-colors",
                isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-black"
              )}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-base font-bold">About Ads on LikeWay</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-gray-300">
              <p>
                LikeWay displays verified partner advertising to provide free unlimited AI chat for everyone.
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-gray-400">
                <li>
                  <strong className={isDark ? "text-white" : "text-gray-900"}>Your chats stay private:</strong> Advertisers never have access to your conversations or queries.
                </li>
                <li>
                  <strong className={isDark ? "text-white" : "text-gray-900"}>Paid plans are 100% ad-free:</strong> Subscribing to LikeWay Go (₹299), Plus, or Pro instantly removes all advertisements across the platform.
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              {onUpgradeClick ? (
                <button
                  onClick={() => {
                    setShowInfoModal(false);
                    onUpgradeClick();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:opacity-95 transition-opacity flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Go Ad-Free (₹299)</span>
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => setShowInfoModal(false)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                  isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
