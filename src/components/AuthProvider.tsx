"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { normalizePlan } from "@/lib/plans";

// ── Types ──────────────────────────────────────────────────────────────────
export type UserInfo = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  plan: string;
  provider?: string;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

type AuthContextType = {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  googleLogin: (name: string, email: string, avatar: string) => Promise<{ error?: string }>;
  guestLogin: () => Promise<{ error?: string }>;
  logout: (all?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserInfo, "name" | "avatar">>) => Promise<{ error?: string }>;
};

// ── Storage key ────────────────────────────────────────────────────────────
const STORAGE_KEY = "lw_user_cache";

function readCache(): UserInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(u: UserInfo | null) {
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage full or SSR */ }
}

// ── Context default ────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({}),
  register: async () => ({}),
  googleLogin: async () => ({}),
  guestLogin: async () => ({}),
  logout: async () => {},
  refreshUser: async () => {},
  updateProfile: async () => ({}),
});

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Internal: set user + update cache + notify plan listeners ───────────
  const persistUser = useCallback((u: UserInfo | null) => {
    const normalizedUser = u ? { ...u, plan: normalizePlan(u.plan) } : null;
    setUser(normalizedUser);
    writeCache(normalizedUser);
    if (typeof window !== "undefined") {
      if (normalizedUser?.plan) {
        localStorage.setItem("likeway_plan", normalizedUser.plan);
      } else if (!normalizedUser) {
        localStorage.removeItem("likeway_plan");
      }
      window.dispatchEvent(new Event("plan_updated"));
    }
  }, []);

  // ── Internal: call /api/auth/refresh and return the new user ─────────────
  const silentRefresh = useCallback(async (): Promise<UserInfo | null> => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch { return null; }
  }, []);

  // ── Primary: fetch current user from server ──────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          persistUser(data.user);
          return;
        }
      }

      if (res.status === 401) {
        const refreshed = await silentRefresh();
        if (refreshed) {
          persistUser(refreshed);
          return;
        }
        persistUser(null);
        return;
      }
    } catch {
      // Network error — keep cached user
    } finally {
      setIsLoading(false);
    }
  }, [persistUser, silentRefresh]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const SIX_POINT_FIVE_DAYS = 6.5 * 24 * 60 * 60 * 1000;
    refreshTimerRef.current = setTimeout(async () => {
      const refreshed = await silentRefresh();
      if (refreshed) {
        persistUser(refreshed);
        scheduleRefresh();
      }
    }, SIX_POINT_FIVE_DAYS);
  }, [silentRefresh, persistUser]);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setUser({ ...cached, plan: normalizePlan(cached.plan) });
      setIsLoading(false);
    }

    refreshUser().then(() => {
      scheduleRefresh();
    });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error || "Login failed" };
      persistUser(data.user);
      scheduleRefresh();
      router.push(data.redirect || "/");
      return {};
    } catch {
      return { error: "Connection failed. Please try again." };
    }
  }, [persistUser, scheduleRefresh, router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error || "Registration failed" };
      persistUser(data.user);
      scheduleRefresh();
      router.push(data.redirect || "/onboarding");
      return {};
    } catch {
      return { error: "Connection failed. Please try again." };
    }
  }, [persistUser, scheduleRefresh, router]);

  const googleLogin = useCallback(async () => {
    window.location.href = "/api/auth/google/redirect";
    return {};
  }, []);

  const guestLogin = useCallback(async () => {
    return { error: "Guest access is not available. Please sign in with email or Google." };
  }, []);

  const logout = useCallback(async (all = false) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all }),
        credentials: "include",
      });
    } catch { /* always clear local state */ }
    persistUser(null);
    router.push("/login");
  }, [persistUser, router]);

  const updateProfile = useCallback(async (data: Partial<Pick<UserInfo, "name" | "avatar">>) => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (res.ok) {
        await refreshUser();
        return {};
      }
      const err = await res.json();
      return { error: err.error || "Failed to update profile" };
    } catch {
      return { error: "Connection failed" };
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        guestLogin,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
