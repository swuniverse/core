import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@swuniverse/shared';
import { api } from './api';
import { useAuthStore } from '../stores/auth.store';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().logout();
});

describe('api token refresh', () => {
  it('keeps refreshed authentication in the current browser session', async () => {
    useAuthStore.getState().setAuth(
      'expired-access',
      'session-refresh',
      { id: 8, username: 'han' } as UserProfile,
      false,
    );
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accessToken: 'refreshed-access',
        refreshToken: 'refreshed-refresh',
        user: { id: 8, username: 'han' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/private');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer refreshed-access' }),
    }));
    expect(sessionStorage.getItem('swu-auth')).toContain('"accessToken":"refreshed-access"');
    expect(localStorage.getItem('swu-auth')).toBeNull();
  });
});
