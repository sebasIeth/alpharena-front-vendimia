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
  initialize: () => void;
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

  initialize: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("arena_token");
    const userStr = localStorage.getItem("arena_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem("arena_token");
        localStorage.removeItem("arena_user");
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
