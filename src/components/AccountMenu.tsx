"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  User, Settings, LogOut, Folder, CreditCard, HelpCircle,
  Monitor, Sun, Moon, ChevronRight, Palette, Cpu, Briefcase, BarChart3,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useAuth, UserInfo } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCurrentPlan, PlanType } from "@/lib/plans";



type ThemeMode = "dark" | "light" | "system";

interface QuickAction {
  id: string;
  icon: typeof User;
  title: string;
  desc: string;
  href: string;
}

interface MenuItem {
  id: string;
  icon: typeof User;
  label: string;
  href: string;
  badge?: string;
}

const quickActions: QuickAction[] = [
  { id: "workspace", icon: Briefcase, title: "Workspace", desc: "Projects & dashboards", href: "/account?tab=workspace" },
  { id: "personalization", icon: Palette, title: "Personalization", desc: "Memory, style & instructions", href: "/account?tab=personalization" },
  { id: "usage", icon: BarChart3, title: "Usage", desc: "Tokens, requests & storage", href: "/account?tab=usage" },
];

const menuItems: MenuItem[] = [
  { id: "profile", icon: User, label: "Profile", href: "/account" },
  { id: "settings", icon: Settings, label: "Settings", href: "/account?tab=settings" },
  { id: "models", icon: Cpu, label: "Models", href: "/account?tab=models" },
  { id: "projects", icon: Folder, label: "Projects", href: "/account?tab=projects" },
  { id: "billing", icon: CreditCard, label: "Billing", href: "/account?tab=billing" },
  { id: "sessions", icon: Shield, label: "Manage Sessions", href: "/account/sessions" },
  { id: "support", icon: HelpCircle, label: "Support", href: "/account?tab=support" },
];


const themes: { id: ThemeMode; icon: typeof Sun; label: string }[] = [
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "light", icon: Sun, label: "Light" },
  { id: "system", icon: Monitor, label: "System" },
];

function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("likeway_theme") as ThemeMode | null;
    if (saved) setThemeState(saved);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem("likeway_theme", t);
    const root = document.documentElement;
    if (t === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.classList.toggle("dark", t === "dark");
      root.classList.toggle("light", t === "light");
      root.setAttribute("data-theme", t);
    }
  }, []);

  return { theme, setTheme };
}

function getAvatarFallback(user: UserInfo | null): string {
  if (!user) return "?";
  if (user.name) return user.name.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return "L";
}

function getPlanDisplay(plan: string): { label: string; color: string } {
  const p = plan.toLowerCase();
  if (p === "pro") return { label: "LikeWay Pro", color: "from-amber-400 to-orange-500" };
  if (p === "plus") return { label: "LikeWay Plus", color: "from-cyan-400 to-blue-500" };
  if (p === "go") return { label: "LikeWay Go", color: "from-violet-400 to-purple-500" };
  return { label: "LikeWay Core", color: "from-gray-400 to-gray-500" };
}

export default function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [plan, setPlan] = useState<PlanType>("Core");
  const planDisplay = getPlanDisplay(plan);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setPlan(getCurrentPlan());
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const menuHeight = 600;
        const menuWidth = 300;
        
        let top: number;

        if (rect.top > menuHeight) {
          top = rect.top - menuHeight - 8;
        } else {
          top = rect.bottom + 8;
        }

        const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
        
        if (top + menuHeight > window.innerHeight) {
          top = window.innerHeight - menuHeight - 8;
        }
        if (top < 8) {
          top = 8;
        }
        
        setMenuPosition({ top, left });
      };
      
      updatePosition();
      
      const handleResize = () => updatePosition();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const totalItems = 1 + quickActions.length + menuItems.length + themes.length + 1;

  const closeMenu = () => {
    setIsOpen(false);
    setShowLogoutConfirm(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
      case "Tab":
        if (!e.shiftKey && focusedIndex >= totalItems - 1) {
          e.preventDefault();
          closeMenu();
        }
        break;
    }
  }, [isOpen, totalItems, focusedIndex]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) setFocusedIndex(0);
    else setFocusedIndex(-1);
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    closeMenu();
    router.push("/login");
  };

  const navigateTo = (href: string) => {
    closeMenu();
    const base = href.split("?")[0];
    if (base === "/account") {
      router.push(href);
    } else {
      window.location.href = href;
    }
  };

  const sectionLabel = (id: string) => {
    switch (id) {
      case "header": return "Account information";
      case "quick": return "Quick actions";
      case "menu": return "Main menu";
      case "footer": return "Theme and sign out";
      default: return "Menu item";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
    <button
      ref={triggerRef}
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(!isOpen); } }}
      aria-haspopup="true"
      aria-expanded={isOpen}
      aria-label="Account menu"
      className={cn(
        "flex items-center gap-3 w-full p-2 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--likeway-accent)]",
        "hover:bg-[var(--likeway-surface-hover)]",
        isOpen && "bg-[var(--likeway-surface-hover)]"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className={
          `w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shadow-lg ${planDisplay.color}`
        }>
          {getAvatarFallback(user)}
        </div>
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--likeway-bg)]",
          isAuthenticated ? "bg-emerald-500" : "bg-gray-400"
        )} />
        </div>
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <span className="text-sm font-bold truncate text-[var(--likeway-text-primary)]">
            {isAuthenticated ? (user?.name || user?.email) : user ? (user.name || "Guest User") : "Sign in"}
          </span>
          <span className="text-[10px] font-semibold text-[var(--likeway-text-secondary)] truncate">
            {isAuthenticated ? planDisplay.label : user ? "Guest Mode • Sign in" : "to continue"}
          </span>
        </div>
        <ChevronRight size={14} className={cn(
          "text-[var(--likeway-text-secondary)] transition-transform duration-200",
          isOpen && "rotate-90"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              onClick={closeMenu}
              aria-hidden="true"
            />
            {typeof document !== 'undefined' && createPortal(
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                role="menu"
                aria-label="Account menu"
                className={cn(
                  "fixed w-[300px] max-sm:w-[280px] max-[480px]:w-[calc(100vw-32px)]",
                  "rounded-xl border shadow-2xl z-[210]",
                  "bg-[var(--likeway-surface)] border-[var(--likeway-border)]",
                  "backdrop-blur-xl"
                )}
                style={{
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)",
                  top: menuPosition.top,
                  left: menuPosition.left,
                }}
              >
              <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* ── Header Section ── */}
                <div
                  role="group"
                  aria-label={sectionLabel("header")}
                  className="p-4 pb-3 border-b border-[var(--likeway-border)]"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href="/account"
                      onClick={closeMenu}
                      className="relative group/avatar flex-shrink-0"
                      aria-label="Open account page"
                    >
                  <div className={
                    `w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shadow-md transition-transform duration-200 ${planDisplay.color} group-hover/avatar:scale-105`
                  }>
                    {getAvatarFallback(user)}
                  </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--likeway-surface)]",
                        isAuthenticated ? "bg-emerald-500" : "bg-gray-400"
                      )} />
                    </Link>
                    <div className="flex flex-col min-w-0 flex-1">
                      {!isAuthenticated ? (
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="text-sm font-bold text-[var(--likeway-text-primary)] truncate hover:underline underline-offset-2"
                        >
                          Sign in
                        </Link>
                      ) : (
                        <Link
                          href="/account"
                          onClick={closeMenu}
                          className="text-sm font-bold text-[var(--likeway-text-primary)] truncate hover:underline underline-offset-2"
                        >
                          {user?.name || user?.email}
                        </Link>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Link
                          href="/account?tab=billing"
                          onClick={closeMenu}
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border transition-all duration-200",
                            "bg-gradient-to-r text-white border-transparent",
                            planDisplay.color,
                            "hover:opacity-90"
                          )}
                        >
                          {planDisplay.label}
                        </Link>
                        {isAuthenticated && (
                          <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Quick Actions Section ── */}
                <div
                  role="group"
                  aria-label={sectionLabel("quick")}
                  className="p-2 pb-1.5 space-y-0.5 border-b border-[var(--likeway-border)]"
                >
                  {quickActions.map((action, i) => (
                    <button
                      key={action.id}
                      onClick={() => navigateTo(action.href)}
                      onMouseEnter={() => setFocusedIndex(1 + i)}
                      role="menuitem"
                      tabIndex={focusedIndex === 1 + i ? 0 : -1}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                        "hover:bg-[var(--likeway-surface-hover)] active:scale-[0.98]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--likeway-accent)]",
                        focusedIndex === 1 + i && "bg-[var(--likeway-surface-hover)]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        "bg-[var(--likeway-accent)]/10 text-[var(--likeway-accent)]"
                      )}>
                        <action.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-[var(--likeway-text-primary)]">{action.title}</div>
                        <div className="text-[10px] text-[var(--likeway-text-secondary)] truncate">{action.desc}</div>
                      </div>
                      <ChevronRight size={12} className="text-[var(--likeway-text-secondary)] flex-shrink-0 opacity-50" />
                    </button>
                  ))}
                </div>

                {/* ── Main Menu Section ── */}
                <div
                  role="group"
                  aria-label={sectionLabel("menu")}
                  className="p-1.5 border-b border-[var(--likeway-border)]"
                >
                  {menuItems.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.href)}
                      onMouseEnter={() => setFocusedIndex(1 + quickActions.length + i)}
                      role="menuitem"
                      tabIndex={focusedIndex === 1 + quickActions.length + i ? 0 : -1}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                        "hover:bg-[var(--likeway-surface-hover)] active:scale-[0.98]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--likeway-accent)]",
                        focusedIndex === 1 + quickActions.length + i && "bg-[var(--likeway-surface-hover)]"
                      )}
                    >
                      <item.icon size={14} className="text-[var(--likeway-text-secondary)] flex-shrink-0" />
                      <span className="flex-1 text-[13px] font-semibold text-[var(--likeway-text-primary)]">{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--likeway-accent)]/10 text-[var(--likeway-accent)] font-bold">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={11} className="text-[var(--likeway-text-secondary)] flex-shrink-0 opacity-40" />
                    </button>
                  ))}
                </div>

                {/* ── Footer Section ── */}
                <div
                  role="group"
                  aria-label={sectionLabel("footer")}
                  className="p-2 space-y-1.5"
                >
                  {/* Theme Switcher */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--likeway-bg)] border border-[var(--likeway-border)]">
                    {themes.map((t, i) => {
                      const idx = 1 + quickActions.length + menuItems.length + i;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          onMouseEnter={() => setFocusedIndex(idx)}
                          role="menuitem"
                          tabIndex={focusedIndex === idx ? 0 : -1}
                          aria-checked={theme === t.id}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150",
                            theme === t.id
                              ? "bg-[var(--likeway-accent)] text-white shadow-sm"
                              : "text-[var(--likeway-text-secondary)] hover:text-[var(--likeway-text-primary)] hover:bg-[var(--likeway-surface-hover)]",
                            "active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--likeway-accent)]",
                            focusedIndex === idx && theme !== t.id && "bg-[var(--likeway-surface-hover)]"
                          )}
                        >
                          <t.icon size={12} />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sign Out */}
                  {isAuthenticated ? (
                    showLogoutConfirm ? (
                      <div className="p-2.5 rounded-lg bg-[var(--likeway-bg)] border border-[var(--likeway-border)] space-y-2">
                        <p className="text-[11px] font-semibold text-[var(--likeway-text-primary)]">Sign Out of LikeWay?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-1.5 rounded-md text-[11px] font-bold text-[var(--likeway-text-secondary)] bg-[var(--likeway-surface-hover)] hover:opacity-80 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleLogout}
                            className="flex-1 py-1.5 rounded-md text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        onMouseEnter={() => setFocusedIndex(1 + quickActions.length + menuItems.length + themes.length)}
                        role="menuitem"
                        tabIndex={focusedIndex === 1 + quickActions.length + menuItems.length + themes.length ? 0 : -1}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                          "hover:bg-red-500/10 text-red-500 active:scale-[0.98]",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
                          focusedIndex === 1 + quickActions.length + menuItems.length + themes.length && "bg-red-500/10"
                        )}
                      >
                        <LogOut size={14} />
                        <span className="text-[13px] font-bold">Sign Out</span>
                      </button>
                    )
                  ) : (
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                        "hover:bg-[var(--likeway-accent)]/10 text-[var(--likeway-accent)] active:scale-[0.98]"
                      )}
                    >
                      <LogOut size={14} />
                      <span className="text-[13px] font-bold">Sign In</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>,
            document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
