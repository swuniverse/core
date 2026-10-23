import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './login';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

describe('LoginPage', () => {
  const observer = vi.fn();

  beforeEach(() => {
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
  });

  it('opens the configured start view after a successful login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: 7,
        username: 'leia',
        email: 'leia@example.test',
        prestige: 0,
        onboardingCompleted: true,
      },
      defaultView: 'research',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/research" element={<p>Research destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Login' })[0]);
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'leia' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.submit(screen.getByLabelText('Login Formular'));

    expect(await screen.findByText('Research destination')).toBeTruthy();
  });

  it('shows a lost-password link only when password reset is active', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/auth/features') {
        return Promise.resolve({ passwordReset: true });
      }
      if (path === '/game-status') {
        return Promise.resolve({ status: 'ONLINE', message: '' });
      }
      return Promise.resolve(null);
    });

    const { rerender } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const lostPasswordLink = await screen.findByRole('link', {
      name: 'Passwort vergessen?',
      hidden: true,
    });
    expect(lostPasswordLink.getAttribute('href')).toBe('/lost-password');

    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/auth/features') {
        return Promise.resolve({ passwordReset: false });
      }
      if (path === '/game-status') {
        return Promise.resolve({ status: 'ONLINE', message: '' });
      }
      return Promise.resolve(null);
    });
    rerender(
      <MemoryRouter>
        <LoginPage key="inactive" />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('link', {
          name: 'Passwort vergessen?',
          hidden: true,
        }),
      ).toBeNull(),
    );
  });

  it('renders system news and safe public links', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/news') return Promise.resolve([{ id: 1, title: 'Server Update', renderedText: '<strong>Online</strong>', links: ['https://example.com'], isChangelog: true, createdAt: '2026-10-23T12:00:00.000Z' }]);
      if (path === '/auth/features') return Promise.resolve({ passwordReset: false });
      if (path === '/game-status') return Promise.resolve({ status: 'ONLINE', message: '' });
      return Promise.resolve(null);
    });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(await screen.findByText('Server Update')).toBeTruthy();
    expect(screen.getByText('Online', { selector: 'strong' }).tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'https://example.com' }).getAttribute('href')).toBe('https://example.com');
  });

  it('renders the system news empty state', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
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
        <LoginPage />
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
      screen.getAllByRole('button', { name: 'Login' }).length,
    ).toBeGreaterThan(0);
  });
});
