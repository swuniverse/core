import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

const AUTH_STORAGE_KEY = 'swu-auth';

describe('auth store', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears persisted authentication from both browser storages on logout', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'persistent auth');
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'session auth');

    useAuthStore.getState().logout();

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
