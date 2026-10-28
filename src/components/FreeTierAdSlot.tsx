"use client";

// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — FREE TIER AD SLOT
//
// Ads are shown to signed-out / free (Core) users only. Paying users never see
// an ad slot, and the ad script is never even requested for them.
//
// The ad network is loaded from environment configuration rather than being
// inlined in the bundle, so the same code works with the HilltopAds snippets
// you supply and can be disabled on any deployment by clearing the variable.
//
//   NEXT_PUBLIC_ADS_ENABLED           "true" | "false"
//   NEXT_PUBLIC_ADS_CLIENT_SCRIPT_URL  e.g. https://<publisher-host>/<path>
//
// Placement follows the pattern used by free chat tiers: a single labelled
// card after the assistant's reply and above the composer. Ads are never
// inserted inside an answer, never disguised as content, and never shown to a
// paying user.
// ══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import type { PlanType } from "@/lib/plans";

interface FreeTierAdSlotProps {
  plan: PlanType;
  /** Only render once there is at least one assistant message. */
  hasConversation: boolean;
  className?: string;
}

const SCRIPT_URL = process.env.NEXT_PUBLIC_ADS_CLIENT_SCRIPT_URL || "";
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

export default function FreeTierAdSlot({ plan, hasConversation, className }: FreeTierAdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const shouldShow = ADS_ENABLED && plan === "Core" && hasConversation && Boolean(SCRIPT_URL);

  useEffect(() => {
    if (!shouldShow) return;
    if (!containerRef.current) return;

    // One script instance per mount; the publisher snippet injects its own
    // iframe into the container.
    const existing = document.querySelector<HTMLScriptElement>("script[data-likeway-ad]");
    if (existing) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.dataset.likewayAd = "1";
    script.onload = () => setLoaded(true);
    script.onerror = () => setLoaded(false);
    document.body.appendChild(script);

    return () => {
      // Leave the network script in place (re-adding it on every render would
      // duplicate impressions), but drop our container's contents.
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div className={className}>
      <div
        className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden"
        aria-label="Advertisement"
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Sponsored
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Ads keep the free plan running
          </span>
        </div>
        <div ref={containerRef} className="min-h-[90px] w-full flex items-center justify-center p-2">
          {!loaded && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Advertisement
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
