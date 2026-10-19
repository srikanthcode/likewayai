"use client";

import React, { useState } from "react";
import { MoreHorizontal, X, Info, ShieldCheck, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CAMPAIGN_URL = "https://crookedagreement.com/dNmQFzz-d.GSNWvkZ/G/UE/Ie/mW9VufZEUxlckYPOTFcM1pMVjskM0rNxj/U/twNPzkUTyxONTaQz2HOlQo";

export interface SponsoredAd {
  id: string;
  brand: string;
  logoBg: string;
  logoText: string;
  logoTextColor?: string;
  headline: string;
  description: string;
  ctaText: string;
  url: string;
  brandDotColor: string;
}

const SPONSORS: SponsoredAd[] = [
  {
    id: "manageengine",
    brand: "ManageEngine",
    logoBg: "#FFC20E",
    logoText: "ManageEngine\nITSM",
    logoTextColor: "#000000",
    headline: "The best tool for IT Change Management",
    description: "Custom Change Workflows. Minimal Business Impact. Make better decisions",
    ctaText: "Learn more",
    url: CAMPAIGN_URL,
    brandDotColor: "#FFC20E",
  },
  {
    id: "supabase",
    brand: "Supabase",
    logoBg: "#1C1C1C",
    logoText: "⚡\nSupabase",
    logoTextColor: "#3ECF8E",
    headline: "Build in a weekend. Scale to millions.",
    description: "The open source Firebase alternative with Postgres database, Authentication, and instant APIs.",
    ctaText: "Start free",
    url: CAMPAIGN_URL,
    brandDotColor: "#3ECF8E",
  },
  {
    id: "vercel",
    brand: "Vercel",
    logoBg: "#000000",
    logoText: "▲\nVercel",
    logoTextColor: "#FFFFFF",
    headline: "Develop. Preview. Ship. Fast.",
    description: "Frontend cloud platform providing the speed, scalability, and reliability modern engineering teams need.",
    ctaText: "Deploy now",
    url: CAMPAIGN_URL,
    brandDotColor: "#FFFFFF",
  },
  {
    id: "datadog",
    brand: "Datadog",
    logoBg: "#632CA6",
    logoText: "🐶\nDatadog",
    logoTextColor: "#FFFFFF",
    headline: "Modern Cloud Monitoring & APM",
    description: "See metrics, traces, and logs from your entire application and cloud stack in one unified platform.",
    ctaText: "Try free",
    url: CAMPAIGN_URL,
    brandDotColor: "#A768F8",
  },
];

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
  const [adIndex, setAdIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  if (isDismissed) return null;

  const ad = SPONSORS[adIndex % SPONSORS.length];
  const isDark = theme === "dark";

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

        {/* Pixel-Perfect ChatGPT Ad Card */}
        <div
          className={cn(
            "relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 group shadow-sm",
            isDark
              ? "bg-[#161616] border-white/10 hover:border-white/20 text-white"
              : "bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900 shadow-sm"
          )}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Left Thumbnail / Logo Box */}
            <a
              href={ad.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center p-2 text-center select-none shrink-0 transition-transform hover:scale-[1.02] shadow-sm overflow-hidden no-underline"
              style={{
                backgroundColor: ad.logoBg,
                color: ad.logoTextColor || "#000000",
              }}
              title={ad.brand}
            >
              <span className="text-[10px] sm:text-xs font-black tracking-tight leading-tight whitespace-pre-line">
                {ad.logoText}
              </span>
            </a>

            {/* Right Content Details */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Header row: Brand dot + Brand name + Ad badge + Menu button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ad.brandDotColor }}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold truncate",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {ad.brand}
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

              {/* Title / Headline */}
              <a
                href={ad.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={cn(
                  "block mt-1 font-bold text-sm sm:text-base leading-snug no-underline hover:underline",
                  isDark ? "text-white" : "text-gray-900"
                )}
              >
                {ad.headline}
              </a>

              {/* Description */}
              <p
                className={cn(
                  "text-xs sm:text-[13px] leading-relaxed mt-0.5 line-clamp-2",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}
              >
                {ad.description}
              </p>

              {/* Action Link: "Learn more ↗" */}
              <div className="mt-1.5 flex items-center gap-3">
                <a
                  href={ad.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={cn(
                    "text-xs font-medium inline-flex items-center gap-1 underline decoration-dashed underline-offset-4 transition-colors",
                    isDark ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-black"
                  )}
                >
                  <span>{ad.ctaText}</span>
                  <ArrowUpRight size={12} className="inline opacity-80" />
                </a>

                {/* Subtle next ad button */}
                <button
                  onClick={() => setAdIndex((prev) => prev + 1)}
                  className={cn(
                    "text-[10px] opacity-40 hover:opacity-100 transition-opacity ml-auto",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}
                  title="Next sponsor"
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
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
            className="hover:underline text-[11px] font-medium transition-colors text-gray-400 hover:text-gray-300 inline-flex items-center gap-0.5"
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
