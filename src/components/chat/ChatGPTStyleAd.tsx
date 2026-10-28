"use client";

import React, { useState, useEffect, useRef } from "react";
import { MoreHorizontal, X, Info, ShieldCheck, Sparkles, ArrowUpRight, Zap, Globe, Server, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const ZONE_SCRIPT_URL = "//juvenilechoice.com/bSX.VLsvdwGalw0xYOWGck/Pehmz9duiZkU/lvkCPkTuc/1WNGT/knztN/jfU-tTN/zfUw1TOTT/MS2COxQE";
const CAMPAIGN_URL = "https://crookedagreement.com/dNmQFzz-d.GSNWvkZ/G/UE/Ie/mW9VufZEUxlckYPOTFcM1pMVjskM0rNxj/U/twNPzkUTyxONTaQz2HOlQo";

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
  const adSlotRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  // Mount HilltopAds background tracking script
  useEffect(() => {
    if (isDismissed || !adSlotRef.current) return;

    try {
      const script = document.createElement("script");
      script.src = ZONE_SCRIPT_URL;
      script.async = true;
      script.referrerPolicy = "no-referrer-when-downgrade";
      adSlotRef.current.appendChild(script);
    } catch {}

    return () => {
      if (adSlotRef.current) {
        adSlotRef.current.innerHTML = "";
      }
    };
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <>
      <div className={cn("w-full max-w-3xl mx-auto my-3 transition-all duration-300", className)}>
        {/* ChatGPT Style Header: "This might also interest you." */}
        <div className="flex items-center justify-between mb-2 px-1">
          <p
            className={cn(
              "text-xs sm:text-[13px] font-medium tracking-tight",
              isDark ? "text-gray-400" : "text-gray-600"
            )}
          >
            This might also interest you.
          </p>
        </div>

        {/* Pixel-Perfect ChatGPT Ad Card Frame */}
        <div
          className={cn(
            "relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 group shadow-sm overflow-hidden",
            isDark
              ? "bg-[#161616] border-white/10 hover:border-white/20 text-white"
              : "bg-white border-gray-200 hover:border-gray-300 text-gray-900 shadow-sm"
          )}
        >
          <div className="flex items-start gap-3.5 sm:gap-4">
            {/* Left Thumbnail / Logo Box */}
            <a
              href={CAMPAIGN_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center p-2 text-center select-none shrink-0 transition-transform hover:scale-[1.03] shadow-sm overflow-hidden no-underline",
                isDark
                  ? "bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 text-indigo-600 border border-indigo-200"
              )}
              title="Verified Sponsor"
            >
              <Zap size={22} className="mb-0.5 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight leading-tight">
                PRO SPONSOR
              </span>
            </a>

            {/* Right Content Details */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Header row: Brand indicator + Name + Ad badge + Options Menu */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                  <span
                    className={cn(
                      "text-xs font-semibold truncate",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    Cloud & Developer Tools
                  </span>
                </div>

                <div className="flex items-center gap-1.5 relative">
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

                  {/* Menu button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu((prev) => !prev);
                    }}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      isDark
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                    )}
                    title="Ad options"
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div
                      className={cn(
                        "absolute right-0 top-7 w-48 rounded-xl border shadow-xl z-50 py-1 text-xs",
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
              </div>

              {/* Title / Headline (Links to live campaign) */}
              <a
                href={CAMPAIGN_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={cn(
                  "block mt-1 font-bold text-sm sm:text-base leading-snug no-underline hover:underline",
                  isDark ? "text-white" : "text-gray-900"
                )}
              >
                High-Performance Cloud & Software Solutions
              </a>

              {/* Description */}
              <p
                className={cn(
                  "text-xs sm:text-[13px] leading-relaxed mt-0.5 line-clamp-2",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}
              >
                Discover curated cloud hosting, developer platforms, and enterprise software solutions designed for scale.
              </p>

              {/* Action Link: "Learn more ↗" */}
              <div className="mt-1.5 flex items-center gap-3">
                <a
                  href={CAMPAIGN_URL}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={cn(
                    "text-xs font-semibold inline-flex items-center gap-1 transition-colors",
                    isDark ? "text-cyan-400 hover:text-cyan-300" : "text-indigo-600 hover:text-indigo-700"
                  )}
                >
                  <span>Learn more</span>
                  <ArrowUpRight size={13} className="inline opacity-90" />
                </a>
              </div>
            </div>
          </div>

          {/* Hidden ad container to run HilltopAds background tracking */}
          <div ref={adSlotRef} className="hidden" aria-hidden="true" />
        </div>

        {/* ChatGPT Style Disclaimer Line Below Card */}
        <p
          className={cn(
            "text-[11px] leading-normal mt-2 px-1 text-center sm:text-left flex flex-wrap items-center justify-between gap-1",
            isDark ? "text-gray-500" : "text-gray-500"
          )}
        >
          <span>
            Ads do not influence the answers you get from LikeWay. Your chats stay private.
          </span>
          <button
            onClick={() => setShowInfoModal(true)}
            className="hover:underline text-[11px] font-medium transition-colors text-gray-400 hover:text-gray-600 inline-flex items-center gap-0.5"
          >
            <span>Learn about ads and personalization</span>
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
                LikeWay displays contextually relevant, non-intrusive sponsored recommendations to provide free unlimited AI chat for everyone.
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-gray-400">
                <li>
                  <strong className={isDark ? "text-white" : "text-gray-900"}>Your chats stay private:</strong> Advertisers never have access to your conversations or queries.
                </li>
                <li>
                  <strong className={isDark ? "text-white" : "text-gray-900"}>Independent AI answers:</strong> Advertisers cannot influence or alter the answers produced by LikeWay AI models.
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
