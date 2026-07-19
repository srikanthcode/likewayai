"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare, Bug, CreditCard, Shield, HelpCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "dark" | "light";
  userId?: string;
}

const CATEGORIES = [
  { id: "bug", label: "Bug Report", icon: Bug, color: "text-red-400" },
  { id: "billing", label: "Billing Issue", icon: CreditCard, color: "text-amber-400" },
  { id: "account", label: "Account Problem", icon: Shield, color: "text-blue-400" },
  { id: "feature", label: "Feature Request", icon: MessageSquare, color: "text-green-400" },
  { id: "other", label: "Other", icon: HelpCircle, color: "text-gray-400" },
];

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function SupportModal({ isOpen, onClose, theme = "dark", userId }: SupportModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("bug");
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [ticketId, setTicketId] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const isDark = theme === "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitState("submitting");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category,
          userId,
          userEmail: email.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTicketId(data.ticket.id);
        setAiResponse(data.ticket.aiResponse);
        setSubmitState("success");
      } else {
        setSubmitState("error");
      }
    } catch (err) {
      setSubmitState("error");
    }
  };

  const handleClose = () => {
    setSubject("");
    setMessage("");
    setCategory("bug");
    setEmail("");
    setSubmitState("idle");
    setTicketId("");
    setAiResponse("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
              isDark ? "bg-[#1a1d27] border border-white/10" : "bg-white border border-black/10"
            )}
          >
            {/* Header */}
            <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", isDark ? "border-white/5" : "border-black/5")}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", isDark ? "bg-cyan-500/10" : "bg-cyan-50")}>
                  <MessageSquare size={18} className="text-cyan-500" />
                </div>
                <div>
                  <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-gray-900")}>Contact Support</h2>
                  <p className={cn("text-[10px]", isDark ? "text-gray-500" : "text-gray-400")}>We typically respond within 24 hours</p>
                </div>
              </div>
              <button onClick={handleClose} className={cn("p-2 rounded-xl transition-colors", isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-black/5 text-gray-500")}>
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {submitState === "success" ? (
                /* Success State */
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
                    >
                      <CheckCircle2 size={32} className="text-green-500" />
                    </motion.div>
                    <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>Ticket Submitted!</h3>
                    <p className={cn("text-sm mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Your request has been received</p>
                    <div className={cn("px-3 py-1.5 rounded-lg text-xs font-mono font-bold", isDark ? "bg-white/5 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>
                      {ticketId}
                    </div>
                  </div>

                  {/* AI Response */}
                  {aiResponse && (
                    <div className={cn("rounded-xl p-4 border", isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-black/5")}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                          Auto-Response
                        </span>
                      </div>
                      <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", isDark ? "text-gray-300" : "text-gray-700")}>
                        {aiResponse}
                      </div>
                    </div>
                  )}

                  <div className={cn("flex items-center gap-2 p-3 rounded-xl text-xs", isDark ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500")}>
                    <Mail size={14} className="text-cyan-500 shrink-0" />
                    <span>For urgent issues, email us at <strong className="text-cyan-500">aixphonic.help@gmail.com</strong></span>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className={cn("block text-xs font-bold mb-2 uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                              category === cat.id
                                ? isDark
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                  : "bg-cyan-50 border-cyan-300 text-cyan-600"
                                : isDark
                                  ? "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                                  : "bg-gray-50 border-black/5 text-gray-500 hover:bg-gray-100"
                            )}
                          >
                            <Icon size={16} />
                            <span className="text-[10px] font-semibold">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className={cn("block text-xs font-bold mb-2 uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                      Email <span className="normal-case font-normal opacity-60">(for reply)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                        isDark
                          ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                          : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400"
                      )}
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className={cn("block text-xs font-bold mb-2 uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      required
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                        isDark
                          ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                          : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400"
                      )}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className={cn("block text-xs font-bold mb-2 uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      required
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none",
                        isDark
                          ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                          : "bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400"
                      )}
                    />
                  </div>

                  {/* Error message */}
                  {submitState === "error" && (
                    <p className="text-xs text-red-400">Failed to submit. Please try again or email us directly.</p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!subject.trim() || !message.trim() || submitState === "submitting"}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      subject.trim() && message.trim() && submitState !== "submitting"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                        : isDark
                          ? "bg-white/10 text-gray-500 cursor-not-allowed"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {submitState === "submitting" ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
