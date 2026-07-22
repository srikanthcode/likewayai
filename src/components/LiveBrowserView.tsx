"use client";

import { useEffect, useRef, useState } from "react";

interface StepEvent {
  iteration: number;
  action: string;
  reasoning: string;
  url: string;
  phase: string;
  success: boolean;
}

export default function LiveBrowserView({
  sessionId,
  wsUrl, // e.g. "wss://likewayai.onrender.com/browser-stream"
}: {
  sessionId: string;
  wsUrl: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"launching" | "ready" | "done" | "error">("launching");
  const [lastStep, setLastStep] = useState<StepEvent | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}?sessionId=${encodeURIComponent(sessionId)}`);

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === "frame") {
        if (imgRef.current) imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
        setStatus((s) => (s === "launching" ? "ready" : s));
      } else if (msg.type === "step") {
        setLastStep(msg);
      } else if (msg.type === "status") {
        setStatus(msg.status);
      }
    };

    ws.onerror = () => setStatus("error");

    return () => ws.close();
  }, [sessionId, wsUrl]);

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
      {/* Live frame from the headless browser */}
      <img
        ref={imgRef}
        alt="Live browser view"
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          status === "ready" || status === "done" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Launching animation — shown until the first CDP frame arrives */}
      {status === "launching" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-300">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
          </div>
          <div className="text-sm tracking-wide animate-pulse">Launching browser…</div>
        </div>
      )}

      {/* LIVE badge, Comet-style */}
      {status === "ready" && (
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-xs text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
      )}

      {/* Bottom narration bar — shows what the agent is doing right now */}
      {lastStep && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/70 backdrop-blur text-xs text-neutral-100 flex items-center justify-between">
          <span className="truncate">{lastStep.reasoning || lastStep.action}</span>
          <span className={`ml-3 shrink-0 ${lastStep.success ? "text-emerald-400" : "text-red-400"}`}>
            {lastStep.success ? "✓" : "✗"}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
          Connection lost — retrying…
        </div>
      )}
    </div>
  );
}
