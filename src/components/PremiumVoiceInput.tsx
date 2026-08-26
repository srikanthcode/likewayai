"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, ArrowUp } from "lucide-react";

interface PremiumVoiceInputProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onCancel: () => void;
  onSend: (text: string) => void;
  theme?: "dark" | "light";
}

type VoiceState = "idle" | "listening" | "transcribing" | "ready";

export default function PremiumVoiceInput({
  onTranscript,
  onCancel,
  onSend,
  theme = "dark",
}: PremiumVoiceInputProps) {
  const [state, setState] = useState<VoiceState>("listening");
  const [elapsed, setElapsed] = useState(0);
  const [partialText, setPartialText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");
  const partialTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onSendRef = useRef(onSend);
  const onCancelRef = useRef(onCancel);
  const mountedRef = useRef(true);

  // Keep callback refs fresh without causing re-renders/re-initializations
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const isDark = theme === "dark";

  // Stop everything
  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    cleanup();
    if (!mountedRef.current) return;

    setError(null);
    setPartialText("");
    partialTextRef.current = "";
    setState("listening");
    isListeningRef.current = true;

    // Check browser SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setState("idle");
      isListeningRef.current = false;
      return;
    }

    // Start timer
    timerRef.current = setInterval(() => {
      if (mountedRef.current && isListeningRef.current) {
        setElapsed((p) => p + 1);
      }
    }, 1000);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      if (mountedRef.current && isListeningRef.current) {
        setState("listening");
      }
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let newFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript;
        } else {
          interim += transcript;
        }
      }

      if (newFinal) {
        const trimmed = newFinal.trim();
        if (trimmed) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + trimmed;
          setFinalText(finalTranscriptRef.current);
        }
        partialTextRef.current = interim;
        setPartialText(interim);
        setState("transcribing");

        const full = finalTranscriptRef.current + (interim ? " " + interim : "");
        onTranscriptRef.current?.(full, false);
      } else if (interim) {
        partialTextRef.current = interim;
        setPartialText(interim);
        setState("transcribing");

        const full = finalTranscriptRef.current ? `${finalTranscriptRef.current} ${interim}` : interim;
        onTranscriptRef.current?.(full, false);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("[Voice Input] SpeechRecognition error:", e.error);

      if (e.error === "no-speech") {
        // Natural pause — maintain listening state
        return;
      }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access blocked. Click the lock/tune icon in the address bar to allow microphone.");
        cleanup();
        setState("idle");
        return;
      }
      if (e.error === "audio-capture") {
        setError("No microphone detected. Please connect a microphone.");
        cleanup();
        setState("idle");
        return;
      }
      if (e.error === "network") {
        // Network blip, continue
        return;
      }
    };

    recognition.onend = () => {
      // Auto-reconnect if user is still actively recording
      if (mountedRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (mountedRef.current && isListeningRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 150);
        }
      } else {
        const full = (finalTranscriptRef.current + (partialTextRef.current ? " " + partialTextRef.current : "")).trim();
        if (full) {
          setState("ready");
          onTranscriptRef.current?.(full, true);
        } else {
          setState("idle");
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e: any) {
      console.warn("[Voice Input] Error starting recognition:", e.message);
    }
  }, [cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    isListeningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const full = (finalTranscriptRef.current + (partialTextRef.current ? " " + partialTextRef.current : "")).trim();
    if (full) {
      setFinalText(full);
      setPartialText("");
      setState("ready");
      onTranscriptRef.current?.(full, true);
    } else {
      setState("idle");
    }
  }, []);

  // Cancel
  const handleCancel = useCallback(() => {
    cleanup();
    setPartialText("");
    setFinalText("");
    finalTranscriptRef.current = "";
    partialTextRef.current = "";
    setElapsed(0);
    setError(null);
    setState("idle");
    onCancelRef.current?.();
  }, [cleanup]);

  // Send
  const handleSend = useCallback(() => {
    const full = (finalTranscriptRef.current + (partialTextRef.current ? " " + partialTextRef.current : "")).trim();
    if (full) {
      onSendRef.current?.(full);
    }
    cleanup();
    setPartialText("");
    setFinalText("");
    finalTranscriptRef.current = "";
    partialTextRef.current = "";
    setState("idle");
  }, [cleanup]);

  // Auto-start recording on initial mount ONLY
  useEffect(() => {
    mountedRef.current = true;
    startRecording();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayText = finalText + (partialText ? (finalText ? " " : "") + partialText : "");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center",
          isDark ? "bg-[#1a1d27]/95" : "bg-white/95",
          "backdrop-blur-xl border-t shadow-2xl",
          isDark ? "border-white/10" : "border-black/10"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Status bar */}
        <div className="flex items-center gap-3 py-3 px-6 w-full max-w-lg justify-between">
          <div className="flex items-center gap-2">
            {/* Pulsing mic indicator */}
            {(state === "listening" || state === "transcribing") && (
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              />
            )}
            <span className={cn(
              "text-xs font-semibold",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              {state === "idle" && "Tap mic to start"}
              {state === "listening" && "Listening... speak now"}
              {state === "transcribing" && "Listening..."}
              {state === "ready" && "Ready to send"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {state !== "idle" && (
              <span className={cn(
                "text-xs font-mono font-bold tracking-wider",
                isDark ? "text-cyan-400" : "text-cyan-600"
              )}>
                {formatTime(elapsed)}
              </span>
            )}

            {(state === "listening" || state === "transcribing") && (
              <button
                type="button"
                onClick={stopRecording}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  isDark
                    ? "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                    : "bg-black/5 text-gray-900 hover:bg-black/10 active:scale-95"
                )}
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        {(state === "listening" || state === "transcribing") && (
          <div className="flex items-center justify-center gap-[4px] h-12 px-6 w-full max-w-lg">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [6, 14 + (i % 6) * 4, 8 + (i % 3) * 6, 26, 6],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i * 0.05) % 0.8,
                }}
                className="w-[3px] rounded-full bg-gradient-to-t from-cyan-500 to-violet-500"
              />
            ))}
          </div>
        )}

        {/* Live Transcript Preview Box */}
        {displayText ? (
          <div className="w-full max-w-lg px-6 pb-3 min-h-[32px] max-h-32 overflow-y-auto">
            <p className={cn(
              "text-sm leading-relaxed",
              isDark ? "text-gray-100" : "text-gray-900"
            )}>
              {finalText && <span>{finalText}</span>}
              {partialText && (
                <span className={isDark ? "text-cyan-400 italic" : "text-cyan-600 italic"}>
                  {finalText ? " " : ""}{partialText}
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg px-6 pb-2 text-center">
            <p className="text-xs text-gray-500 italic">
              Say something... your speech will appear here in real time.
            </p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="w-full max-w-lg px-6 pb-3">
            <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex items-center gap-4 py-4 px-6 w-full max-w-lg justify-center">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer",
              isDark
                ? "bg-white/10 text-gray-400 hover:text-white hover:bg-white/20"
                : "bg-black/5 text-gray-500 hover:text-gray-900 hover:bg-black/10"
            )}
            title="Cancel"
          >
            <X size={20} />
          </button>

          {/* Main Mic / Stop / Send Button */}
          {state === "idle" ? (
            <button
              type="button"
              onClick={startRecording}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg",
                isDark
                  ? "bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105"
                  : "bg-black/5 text-gray-700 hover:bg-black/15 hover:scale-105"
              )}
              title="Start Recording"
            >
              <Mic size={24} />
            </button>
          ) : state === "listening" || state === "transcribing" ? (
            <button
              type="button"
              onClick={stopRecording}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 cursor-pointer"
              title="Stop and Review"
            >
              <MicOff size={24} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!displayText.trim()}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer",
                displayText.trim()
                  ? "bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95"
                  : isDark
                    ? "bg-white/10 text-gray-500 cursor-not-allowed"
                    : "bg-black/5 text-gray-400 cursor-not-allowed"
              )}
              title="Send to Chat"
            >
              <ArrowUp size={24} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
