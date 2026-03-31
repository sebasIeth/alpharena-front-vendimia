"use client";

import { create } from "zustand";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: (user: User) => {
    // Token is now in httpOnly cookie — only store user data in memory
    if (typeof window !== "undefined") {
      localStorage.setItem("arena_user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("arena_user");
      // Clear httpOnly cookie via API route
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("arena_user", JSON.stringify(user));
    }
    set({ user });
  },

  initialize: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    try {
      // Validate session via httpOnly cookie (sent automatically)
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        const user = data.user as User;
        localStorage.setItem("arena_user", JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        // Cookie invalid/expired — clear local data
        localStorage.removeItem("arena_user");
        set({ isLoading: false });
      }
    } catch {
      // Network error — use cached user as temporary fallback
      const userStr = localStorage.getItem("arena_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem("arena_user");
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
