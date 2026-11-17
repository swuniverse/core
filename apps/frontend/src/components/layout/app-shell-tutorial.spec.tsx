import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './app-shell';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../hooks/use-socket', () => ({ useSocket: vi.fn() }));
vi.mock('./header', () => ({ Header: () => null }));
vi.mock('./sidebar', () => ({ Sidebar: () => null }));
vi.mock('./bottom-nav', () => ({ BottomNav: () => null }));
vi.mock('../OrderBroadcastOverlay', () => ({ OrderBroadcastOverlay: () => null }));
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: null, setUser: vi.fn() }),
}));

describe('AppShell tutorial route integration', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockImplementation((path: string) => {
      if (path === '/tutorial/research') return Promise.resolve({
        version: 1,
        view: 'research',
        currentStepId: 'intro',
        steps: [{ id: 'intro', title: 'Forschung lernen', text: 'Los' }],
      });
      if (path === '/game-status') return Promise.resolve({ status: 'ONLINE' });
      return Promise.resolve(null);
    });
    apiMocks.post.mockReset().mockResolvedValue({});
  });

  it('maps the current route to a tutorial view and loads it', async () => {
    render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes><Route element={<AppShell />}><Route path="/research/tree" element={<p>Seite</p>} /></Route></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Forschung lernen' })).toBeTruthy();
    for (const name of ['Impressum', 'Datenschutz', 'Hilfe']) {
      expect(screen.getByRole('link', { name })).toBeTruthy();
    }
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/tutorial/research'));
  });

  it('shows the tick-running banner', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/game-status') return Promise.resolve({ status: 'TICK', message: '' });
      return Promise.resolve(null);
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<AppShell />}><Route index element={<p>Seite</p>} /></Route></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tick läuft')).toBeTruthy();
  });
});
