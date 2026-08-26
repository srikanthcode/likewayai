"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, ArrowUp } from "lucide-react";

interface PremiumVoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
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
  const [amplitude, setAmplitude] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [partialText, setPartialText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");
  const mountedRef = useRef(true);

  const isDark = theme === "dark";

  // Cleanup function
  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Amplitude analyzer loop
  const startAmplitudeAnalysis = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!isListeningRef.current || !mountedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAmplitude(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {}
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mountedRef.current) return;
    setError(null);
    setElapsed(0);
    setState("listening");
    isListeningRef.current = true;

    // 1. Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || !isListeningRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      startAmplitudeAnalysis(stream);
    } catch (err: any) {
      console.warn("[Voice Input] Mic permission error:", err);
      setError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone blocked. Please allow mic access in your browser bar."
          : "Could not access microphone."
      );
      setState("idle");
      isListeningRef.current = false;
      return;
    }

    // 2. Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((p) => p + 1);
    }, 1000);

    // 3. Initialize SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      cleanup();
      setState("idle");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

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
        finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + newFinal.trim();
        setFinalText(finalTranscriptRef.current);
        setPartialText(interim);
        setState("transcribing");
        onTranscript(finalTranscriptRef.current + (interim ? " " + interim : ""), false);
      } else if (interim) {
        setPartialText(interim);
        setState("transcribing");
        const fullCurrent = finalTranscriptRef.current ? `${finalTranscriptRef.current} ${interim}` : interim;
        onTranscript(fullCurrent, false);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        // Natural pause — maintain listening state
        return;
      }
      if (e.error === "not-allowed") {
        setError("Microphone blocked. Click lock icon in URL bar to enable.");
        cleanup();
        setState("idle");
        return;
      }
      if (e.error === "network") {
        console.warn("[Voice Input] Speech recognition network warning");
        return;
      }
    };

    recognition.onend = () => {
      // Auto-reconnect if user is still in listening mode (handles browser timeout)
      if (mountedRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (mountedRef.current && isListeningRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 200);
        }
      } else {
        const finalCombined = (finalTranscriptRef.current + (partialText ? " " + partialText : "")).trim();
        if (finalCombined) {
          setState("ready");
          onTranscript(finalCombined, true);
        } else {
          setState("idle");
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (startErr) {
      console.warn("[Voice Input] Recognition start warning:", startErr);
    }
  }, [cleanup, onTranscript, partialText, startAmplitudeAnalysis]);

  // Stop recording
  const stopRecording = useCallback(() => {
    isListeningRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const currentCombined = (finalTranscriptRef.current + (partialText ? " " + partialText : "")).trim();
    if (currentCombined) {
      setFinalText(currentCombined);
      setPartialText("");
      setState("ready");
      onTranscript(currentCombined, true);
    } else {
      setState("idle");
    }
  }, [onTranscript, partialText]);

  // Cancel
  const handleCancel = useCallback(() => {
    cleanup();
    setPartialText("");
    setFinalText("");
    finalTranscriptRef.current = "";
    setAmplitude(0);
    setElapsed(0);
    setError(null);
    setState("idle");
    onCancel();
  }, [cleanup, onCancel]);

  // Send
  const handleSend = useCallback(() => {
    const text = (finalTranscriptRef.current + (partialText ? " " + partialText : "")).trim();
    if (text) {
      onSend(text);
    }
    cleanup();
    setPartialText("");
    setFinalText("");
    finalTranscriptRef.current = "";
    setAmplitude(0);
    setElapsed(0);
    setState("idle");
  }, [cleanup, onSend, partialText]);

  // Auto-start recording on mount
  useEffect(() => {
    mountedRef.current = true;
    startRecording();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup, startRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Waveform bars
  const bars = 20;
  const displayText = finalText + (partialText ? " " + partialText : "");

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
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2.5 h-2.5 rounded-full bg-red-500"
              />
            )}
            <span className={cn(
              "text-xs font-semibold",
              isDark ? "text-gray-400" : "text-gray-600"
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
                "text-xs font-mono font-medium",
                isDark ? "text-gray-400" : "text-gray-600"
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
                    ? "bg-white/10 text-white hover:bg-white/15 active:scale-95"
                    : "bg-black/5 text-gray-900 hover:bg-black/10 active:scale-95"
                )}
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Waveform */}
        {(state === "listening" || state === "transcribing") && (
          <div className="flex items-center justify-center gap-[3px] h-12 px-6 w-full max-w-lg">
            {Array.from({ length: bars }).map((_, i) => {
              const distance = Math.abs(i - bars / 2) / (bars / 2);
              const height = Math.max(4, (amplitude > 0.05 ? amplitude : 0.15) * 40 * (1 - distance * 0.6));
              return (
                <motion.div
                  key={i}
                  animate={{ height }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  className="w-[3px] rounded-full"
                  style={{
                    background: `linear-gradient(180deg, #7c3aed, #06b6d4)`,
                    opacity: 0.6 + amplitude * 0.4,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Transcript preview */}
        {displayText && (
          <div className="w-full max-w-lg px-6 pb-3 min-h-[24px]">
            <p className={cn(
              "text-sm leading-relaxed",
              isDark ? "text-gray-200" : "text-gray-800"
            )}>
              {finalText && <span>{finalText}</span>}
              {partialText && (
                <span className={isDark ? "text-cyan-400 italic" : "text-cyan-600 italic"}>
                  {finalText ? " " : ""}{partialText}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full max-w-lg px-6 pb-3">
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex items-center gap-4 py-4 px-6 w-full max-w-lg justify-center">
          {/* Cancel */}
          <button
            type="button"
            onClick={handleCancel}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer",
              isDark
                ? "bg-white/10 text-gray-400 hover:text-white hover:bg-white/15"
                : "bg-black/5 text-gray-500 hover:text-gray-900 hover:bg-black/10"
            )}
            title="Cancel"
          >
            <X size={20} />
          </button>

          {/* Main mic / send button */}
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
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] animate-pulse hover:scale-105 cursor-pointer"
              title="Stop Recording"
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
              title="Send Message"
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
