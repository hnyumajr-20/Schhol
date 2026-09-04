import { create } from "zustand";
import type { UserRole } from "@school-mis/shared";

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string | null;
  idNumber: string | null;
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string, user: SessionUser) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "school-mis-auth";

function loadInitial(): { accessToken: string | null; user: SessionUser | null } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { accessToken: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setSession: (accessToken, user) => {
    set({ accessToken, user });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, user }));
  },
  setAccessToken: (accessToken) => {
    set({ accessToken });
    const { user } = get();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, user }));
  },
  clear: () => {
    set({ accessToken: null, user: null });
    sessionStorage.removeItem(STORAGE_KEY);
  },
}));
