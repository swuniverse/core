import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@swuniverse/shared';
import { useAuthStore } from './auth.store';

const AUTH_STORAGE_KEY = 'swu-auth';

describe('auth store', () => {
  const storageDescriptors = {
    localStorage: Object.getOwnPropertyDescriptor(window, 'localStorage'),
    sessionStorage: Object.getOwnPropertyDescriptor(window, 'sessionStorage'),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const [name, descriptor] of Object.entries(storageDescriptors)) {
      if (descriptor) Object.defineProperty(window, name, descriptor);
      else Reflect.deleteProperty(window, name);
    }
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('clears persisted authentication from both browser storages on logout', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'persistent auth');
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'session auth');

    useAuthStore.getState().logout();

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('imports and keeps authentication in memory when storage access is denied', async () => {
    vi.resetModules();
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Storage denied', 'SecurityError');
      },
    });

    const { useAuthStore: isolatedAuthStore } = await import('./auth.store');
    const user = { id: 1, username: 'leia' } as UserProfile;

    expect(() =>
      isolatedAuthStore.getState().setAuth('access', 'refresh', user, false),
    ).not.toThrow();
    expect(isolatedAuthStore.getState().accessToken).toBe('access');

    vi.resetModules();
  });

  it('clears auth state and attempts both removals when persistence write and one removal fail', () => {
    const auth = useAuthStore.getState();
    auth.setAuth('access', 'refresh', { id: 1, username: 'leia' } as UserProfile, true);

    const nativeLocalStorage = window.localStorage;
    const nativeSessionStorage = window.sessionStorage;
    const writeError = new DOMException('Storage full', 'QuotaExceededError');
    const removalError = new Error('Unexpected removal failure');
    let localRemovalAttempted = false;
    let sessionRemovalAttempted = false;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: nativeLocalStorage.getItem.bind(nativeLocalStorage),
        setItem: () => {
          throw writeError;
        },
        removeItem: () => {
          localRemovalAttempted = true;
          throw removalError;
        },
      },
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: nativeSessionStorage.getItem.bind(nativeSessionStorage),
        setItem: nativeSessionStorage.setItem.bind(nativeSessionStorage),
        removeItem: (key: string) => {
          sessionRemovalAttempted = true;
          nativeSessionStorage.removeItem(key);
        },
      },
    });

    expect(() => auth.logout()).toThrow(removalError);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localRemovalAttempted).toBe(true);
    expect(sessionRemovalAttempted).toBe(true);
  });
});
