import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './app-shell';

const callbacks = vi.hoisted(
  () => new Map<string, (payload: unknown) => void>(),
);
vi.mock('../../hooks/use-socket', () => ({
  useSocket: (event?: string, callback?: (payload: unknown) => void) => {
    if (event && callback) callbacks.set(event, callback);
  },
}));
vi.mock('../../services/api', () => ({
  api: {
    get: async (path: string) =>
      path === '/game-status' ? { status: 'ONLINE' } : null,
  },
}));
vi.mock('../../hooks/use-interface-theme', () => ({
  useInterfaceTheme: () => undefined,
}));
vi.mock('./header', () => ({ Header: () => null }));
vi.mock('./sidebar', () => ({ Sidebar: () => null }));
vi.mock('./bottom-nav', () => ({ BottomNav: () => null }));
vi.mock('../OrderBroadcastOverlay', () => ({
  OrderBroadcastOverlay: () => null,
}));
vi.mock('../tutorial/TutorialPadd', () => ({ TutorialPadd: () => null }));
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: null, setUser: () => undefined }),
}));

describe('colony upgrade completion notifications', () => {
  beforeEach(() => callbacks.clear());

  it.each([
    [[{ type: 'BUILDING_FINISHED', activated: true, reactivatedCount: 2 }], 2],
    [
      [
        { type: 'TERRAFORMING_FINISHED' },
        { type: 'BUILDING_FINISHED', activated: true, reactivatedCount: 1 },
        { type: 'BUILDING_FINISHED', activated: true, reactivatedCount: 2 },
      ],
      3,
    ],
  ])(
    'shows the total reactivated orbital buildings in the message area',
    async (events, count) => {
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Kolonie</p>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await act(async () =>
        callbacks.get('COLONY_TICK_REPORT')?.({
          colonyId: 7,
          tick: 123,
          events,
        }),
      );
      expect(
        await screen.findByText(
          new RegExp(`Es wurden ${count} Orbitalgebäude reaktiviert`),
        ),
      ).toBeTruthy();
    },
  );
});
