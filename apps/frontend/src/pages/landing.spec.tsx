import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './landing';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
      super(message);
    }
  },
}));

describe('LandingPage', () => {
  const observer = vi.fn();
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  beforeEach(() => {
    if (localStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor);
    }
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observer;
        unobserve = observer;
        disconnect = observer;
      },
    );
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/auth/features') {
        return Promise.resolve({ passwordReset: false });
      }
      if (path === '/game-status') {
        return Promise.resolve({ status: 'ONLINE', message: '' });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    if (localStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor);
    }
    useAuthStore.getState().logout();
  });

  it('renders system news and safe public links', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/news') return Promise.resolve([{ id: 1, title: 'Server Update', renderedText: '<strong>Online</strong>', links: ['https://example.com'], isChangelog: true, createdAt: '2026-10-23T12:00:00.000Z' }]);
      if (path === '/auth/features') return Promise.resolve({ passwordReset: false });
      if (path === '/game-status') return Promise.resolve({ status: 'ONLINE', message: '' });
      return Promise.resolve(null);
    });
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText('Server Update')).toBeTruthy();
    expect(screen.getByText('Online', { selector: 'strong' }).tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'https://example.com' }).getAttribute('href')).toBe('https://example.com');
  });

  it('renders the system news empty state', async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText('Keine System-News vorhanden.')).toBeTruthy();
  });

  it('shows the current maintenance status and keeps login but hides registration', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/game-status') {
        return Promise.resolve({
          status: 'MAINTENANCE',
          message: 'Update läuft.',
        });
      }
      return Promise.resolve({
        settlers: 1,
        colonies: 1,
        ships: 1,
        totalTechs: 1,
        shipClasses: 1,
        planetTypes: 1,
        buildingTypes: 1,
      });
    });

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Wartung läuft')).toBeTruthy());
    expect(screen.getByLabelText('Spielstatus').className).toContain(
      'swu-game-status',
    );
    expect(screen.getByText('Spielstatus')).toBeTruthy();
    expect(screen.getByText('Update läuft.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Registrieren' })).toBeNull();
    expect(
      screen.getAllByRole('link', { name: 'Login' }).length,
    ).toBeGreaterThan(0);
  });

  it('links to login, registration and the legal pages', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: 'Login' })[0].getAttribute('href')).toBe('/login');
    expect(screen.getAllByRole('link', { name: 'Registrieren' })[0].getAttribute('href')).toBe('/register');
    for (const [name, href] of [['Impressum', '/impressum'], ['Datenschutz', '/datenschutz'], ['Hilfe', '/hilfe']]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
  });

  it('lists the latest older news under Aktuelles without repeating the newest one', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/news') {
        return Promise.resolve([
          { id: 3, title: 'Neueste', renderedText: 'a', links: [], isChangelog: false, createdAt: '2026-11-03T12:00:00.000Z' },
          { id: 2, title: 'Mittlere', renderedText: 'b', links: [], isChangelog: true, createdAt: '2026-11-02T12:00:00.000Z' },
          { id: 1, title: 'Alte', renderedText: 'c', links: [], isChangelog: false, createdAt: '2026-11-01T12:00:00.000Z' },
        ]);
      }
      if (path === '/game-status') return Promise.resolve({ status: 'ONLINE', message: '' });
      return Promise.resolve(null);
    });
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const heading = await screen.findByRole('heading', { name: 'Aktuelles' });
    const section = heading.closest('section')!;
    expect(section.textContent).toContain('Changelog: Mittlere');
    expect(section.textContent).toContain('Alte');
    expect(section.textContent).not.toContain('Neueste');
  });

  it('shows settlers and the online count before the game contents', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/database/overview') return Promise.resolve({ settlers: 7, colonies: 1, ships: 1, totalTechs: 2, shipClasses: 3, planetTypes: 1, buildingTypes: 4 });
      if (path === '/database/online') return Promise.resolve([{ id: 1 }, { id: 2 }]);
      if (path === '/game-status') return Promise.resolve({ status: 'ONLINE', message: '' });
      return Promise.resolve(null);
    });
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText('Siedler')).toBeTruthy();
    expect(screen.getByText('davon online')).toBeTruthy();
  });

  it('states the free-to-play promise in the hero', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText('Kostenlos, ohne Werbung, kein Pay-to-win.')).toBeTruthy();
  });
});
