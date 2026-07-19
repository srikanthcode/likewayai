"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <Check size={15} className="text-emerald-400" />,
  error: <AlertCircle size={15} className="text-red-400" />,
  info: <Info size={15} className="text-blue-400" />,
  warning: <AlertCircle size={15} className="text-amber-400" />,
};

const borders: Record<ToastType, string> = {
  success: "border-emerald-500/25",
  error: "border-red-500/25",
  info: "border-blue-500/25",
  warning: "border-amber-500/25",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 3500) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 360, width: "calc(100vw - 32px)" }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${borders[t.type]}`}
              style={{ background: "rgba(18,18,20,0.94)" }}
            >
              <span className="flex-shrink-0 mt-px">{icons[t.type]}</span>
              <p className="flex-1 text-[13px] text-gray-200 font-medium leading-snug">{t.message}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="flex-shrink-0 p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
