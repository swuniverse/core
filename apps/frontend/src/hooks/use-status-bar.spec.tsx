import { act, renderHook } from '@testing-library/react';

import { useStatusBar } from './use-status-bar';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

const socketHandlers = vi.hoisted(
  () => new Map<string, Array<(payload: unknown) => void>>(),
);

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

vi.mock('./use-socket', () => ({
  useSocket: (event?: string, handler?: (payload: unknown) => void) => {
    if (!event || !handler) return;
    const handlers = socketHandlers.get(event) ?? [];
    if (!handlers.includes(handler)) {
      handlers.push(handler);
      socketHandlers.set(event, handlers);
    }
  },
}));

function emitSocket(event: string, payload: unknown) {
  for (const handler of socketHandlers.get(event) ?? []) {
    handler(payload);
  }
}

describe('useStatusBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T10:00:00.000Z'));
    socketHandlers.clear();
    apiMocks.get.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads absolute tick boundaries with server offset and computes uneven progress', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/tick/status') {
        return Promise.resolve({
          serverTime: '2026-08-05T10:05:00.000Z',
          previousTickAt: '2026-08-05T09:00:00.000Z',
          nextTickAt: '2026-08-05T11:00:00.000Z',
          currentTickIndex: 2,
          totalTicks: 5,
        });
      }
      if (path === '/messages/unread') {
        return Promise.resolve(7);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    const { result } = renderHook(() => useStatusBar());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.tick.loaded).toBe(true);

    expect(result.current.unreadMessages).toBe(7);
    expect(result.current.tick.currentTickIndex).toBe(2);
    expect(result.current.tick.totalTicks).toBe(5);
    expect(result.current.tick.previousTickAt.toISOString()).toBe(
      '2026-08-05T09:00:00.000Z',
    );
    expect(result.current.tick.nextTickAt.toISOString()).toBe(
      '2026-08-05T11:00:00.000Z',
    );
    expect(result.current.tick.msToNext).toBe(55 * 60 * 1000);
    expect(result.current.tick.progress).toBeCloseTo(65 / 120, 5);
  });

  it('refetches tick status when countdown reaches zero', async () => {
    let tickStatusCalls = 0;
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/messages/unread') return Promise.resolve(0);
      if (path !== '/tick/status') {
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }

      tickStatusCalls += 1;
      if (tickStatusCalls === 1) {
        return Promise.resolve({
          serverTime: '2026-08-05T10:00:00.000Z',
          previousTickAt: '2026-08-05T09:00:00.000Z',
          nextTickAt: '2026-08-05T10:00:00.000Z',
          currentTickIndex: 1,
          totalTicks: 5,
        });
      }

      return Promise.resolve({
        serverTime: '2026-08-05T10:00:00.000Z',
        previousTickAt: '2026-08-05T10:00:00.000Z',
        nextTickAt: '2026-08-05T12:00:00.000Z',
        currentTickIndex: 2,
        totalTicks: 5,
      });
    });

    const { result } = renderHook(() => useStatusBar());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.tick.loaded).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(tickStatusCalls).toBe(2);
    expect(result.current.tick.nextTickAt.toISOString()).toBe(
      '2026-08-05T12:00:00.000Z',
    );
  });

  it('refetches tick status on TICK socket events', async () => {
    let tickStatusCalls = 0;
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/messages/unread') return Promise.resolve(0);
      if (path !== '/tick/status') {
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }

      tickStatusCalls += 1;
      return Promise.resolve(
        tickStatusCalls === 1
          ? {
              serverTime: '2026-08-05T10:00:00.000Z',
              previousTickAt: '2026-08-05T09:00:00.000Z',
              nextTickAt: '2026-08-05T12:00:00.000Z',
              currentTickIndex: 1,
              totalTicks: 5,
            }
          : {
              serverTime: '2026-08-05T10:00:00.000Z',
              previousTickAt: '2026-08-05T12:00:00.000Z',
              nextTickAt: '2026-08-05T15:00:00.000Z',
              currentTickIndex: 2,
              totalTicks: 5,
            },
      );
    });

    const { result } = renderHook(() => useStatusBar());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.tick.loaded).toBe(true);
    const callsBeforeEvent = tickStatusCalls;

    act(() => {
      emitSocket('TICK', { tick: 11 });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(tickStatusCalls).toBeGreaterThan(callsBeforeEvent);
    expect(result.current.tick.currentTickIndex).toBe(2);
    expect(result.current.tick.nextTickAt.toISOString()).toBe(
      '2026-08-05T15:00:00.000Z',
    );
  });
});
