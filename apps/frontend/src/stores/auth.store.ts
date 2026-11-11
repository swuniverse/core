import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { UserProfile } from '@swuniverse/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setAuth: (
    accessToken: string,
    refreshToken: string,
    user: UserProfile,
    rememberLogin?: boolean,
  ) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

let rememberAuth = sessionStorage.getItem('swu-auth') === null;

const authStorage: StateStorage = {
  getItem: (name) =>
    sessionStorage.getItem(name) ?? localStorage.getItem(name),
  setItem: (name, value) => {
    const storage = rememberAuth ? localStorage : sessionStorage;
    storage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user, rememberLogin) => {
        rememberAuth =
          rememberLogin ?? sessionStorage.getItem('swu-auth') === null;
        const otherStorage = rememberAuth ? sessionStorage : localStorage;
        otherStorage.removeItem('swu-auth');
        set({ accessToken, refreshToken, user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        rememberAuth = true;
        set({ accessToken: null, refreshToken: null, user: null });
        localStorage.removeItem('swu-auth');
        sessionStorage.removeItem('swu-auth');
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'swu-auth', storage: createJSONStorage(() => authStorage) },
  ),
);
