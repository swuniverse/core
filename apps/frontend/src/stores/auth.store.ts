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

let rememberAuth = true;
const memoryStorage = new Map<string, string>();

function isStorageFailure(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'SecurityError' || error.name === 'QuotaExceededError')
  );
}

function getStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window[name];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'SecurityError') {
      return null;
    }
    throw error;
  }
}

const authStorage: StateStorage = {
  getItem: (name) => {
    const session = getStorage('sessionStorage')?.getItem(name);
    if (session !== null && session !== undefined) {
      rememberAuth = false;
      return session;
    }
    const local = getStorage('localStorage')?.getItem(name);
    if (local !== null && local !== undefined) {
      rememberAuth = true;
      return local;
    }
    return memoryStorage.get(name) ?? null;
  },
  setItem: (name, value) => {
    const storage = getStorage(rememberAuth ? 'localStorage' : 'sessionStorage');
    if (storage) {
      try {
        storage.setItem(name, value);
        memoryStorage.delete(name);
        return;
      } catch (error) {
        if (!isStorageFailure(error)) throw error;
      }
    }
    memoryStorage.set(name, value);
  },
  removeItem: (name) => {
    memoryStorage.delete(name);
    getStorage(rememberAuth ? 'localStorage' : 'sessionStorage')?.removeItem(name);
  },
};

function clearPersistedAuth(): void {
  memoryStorage.delete('swu-auth');
  let removalError: unknown;
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      getStorage(storageName)?.removeItem('swu-auth');
    } catch (error) {
      if (!isStorageFailure(error)) removalError ??= error;
    }
  }
  if (removalError) throw removalError;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user, rememberLogin) => {
        rememberAuth = rememberLogin ?? true;
        clearPersistedAuth();
        set({ accessToken, refreshToken, user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        rememberAuth = true;
        let persistenceError: unknown;
        try {
          set({ accessToken: null, refreshToken: null, user: null });
        } catch (error) {
          if (!isStorageFailure(error)) persistenceError = error;
        }
        try {
          clearPersistedAuth();
        } catch (error) {
          persistenceError ??= error;
        }
        if (persistenceError) throw persistenceError;
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'swu-auth', storage: createJSONStorage(() => authStorage) },
  ),
);
