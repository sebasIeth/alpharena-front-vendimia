"use client";

import { create } from "zustand";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: (token: string, user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("arena_token", token);
      localStorage.setItem("arena_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("arena_token");
      localStorage.removeItem("arena_user");
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
    const token = localStorage.getItem("arena_token");
    const userStr = localStorage.getItem("arena_user");
    if (token && userStr) {
      try {
        // Validate the token against the backend
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const user = data.user as User;
          localStorage.setItem("arena_user", JSON.stringify(user));
          set({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          // Token is invalid/expired — clear session
          localStorage.removeItem("arena_token");
          localStorage.removeItem("arena_user");
          set({ isLoading: false });
        }
      } catch {
        // Network error — use cached data as fallback
        try {
          const user = JSON.parse(userStr) as User;
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem("arena_token");
          localStorage.removeItem("arena_user");
          set({ isLoading: false });
        }
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
