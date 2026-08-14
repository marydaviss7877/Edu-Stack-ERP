import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';
import { login as apiLogin, logout as apiLogout } from '../services/authService';

export interface ActiveBranch {
  id: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeBranch: ActiveBranch | null;
  orgSlug: string | null;
  login: (email: string, password: string, slug?: string, loginAs?: 'admin' | 'teacher' | 'student') => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setSession: (user: AuthUser, slug?: string) => void;
  setActiveBranch: (branch: ActiveBranch | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      activeBranch: null,
      orgSlug: null,

      login: async (email, password, slug, loginAs) => {
        const { user } = await apiLogin(email, password, slug, loginAs);
        set({ user, isAuthenticated: true, orgSlug: slug ?? null });
      },

      logout: async () => {
        await apiLogout();
        set({ user: null, isAuthenticated: false, activeBranch: null, orgSlug: null });
      },

      setUser: (user) => set({ user }),

      setSession: (user, slug) => {
        set({ user, isAuthenticated: true, orgSlug: slug ?? null });
      },

      setActiveBranch: (branch) => set({ activeBranch: branch }),
    }),
    {
      name: 'edustack_auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        orgSlug: state.orgSlug,
        activeBranch: state.activeBranch,
      }),
    }
  )
);
