import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './login';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
      super(message);
    }
  },
}));

describe('LoginPage', () => {
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

  it('remembers the remember-me choice locally and defaults to enabled', () => {
    const { unmount } = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const rememberMe = screen.getByRole('checkbox', { name: 'Angemeldet bleiben' });

    expect((rememberMe as HTMLInputElement).checked).toBe(true);
    fireEvent.click(rememberMe);
    expect(localStorage.getItem('swu-remember-login')).toBe('false');

    unmount();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(
      (screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('still logs in when local storage is denied', async () => {
    vi.mocked(api.post).mockResolvedValue({
      accessToken: 'memory-access',
      refreshToken: 'memory-refresh',
      user: {
        id: 9,
        username: 'lando',
        email: 'lando@example.test',
        prestige: 0,
        onboardingCompleted: true,
      },
      defaultView: 'maindesk',
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Storage denied', 'SecurityError');
      },
    });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const rememberMe = screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }) as HTMLInputElement;
    expect(rememberMe.checked).toBe(true);
    fireEvent.click(rememberMe);
    expect(rememberMe.checked).toBe(false);
    fireEvent.click(rememberMe);
    expect(rememberMe.checked).toBe(true);
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'lando' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.submit(screen.getByLabelText('Login Formular'));

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBe('memory-access'),
    );
    expect(sessionStorage.getItem('swu-auth')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
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

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'leia' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.submit(screen.getByLabelText('Login Formular'));

    expect(await screen.findByText('Research destination')).toBeTruthy();
    expect(localStorage.getItem('swu-auth')).toContain('"accessToken":"access"');
    expect(sessionStorage.getItem('swu-auth')).toBeNull();
  });

  it('stores authentication for the current browser session when remember-me is disabled', async () => {
    vi.mocked(api.post).mockResolvedValue({
      accessToken: 'session-access',
      refreshToken: 'session-refresh',
      user: {
        id: 8,
        username: 'han',
        email: 'han@example.test',
        prestige: 0,
        onboardingCompleted: true,
      },
      defaultView: 'maindesk',
    });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Angemeldet bleiben' }));
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'han' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.submit(screen.getByLabelText('Login Formular'));

    await waitFor(() =>
      expect(sessionStorage.getItem('swu-auth')).toContain('"accessToken":"session-access"'),
    );
    expect(localStorage.getItem('swu-auth')).toBeNull();
    expect(localStorage.getItem('swu-remember-login')).toBe('false');
  });

  it('shows the tick count and reason for a locked account', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(403, 'Dein Spieleraccount ist noch für 3 Ticks gesperrt. Begründung: Regelverstoß', 'ACCOUNT_LOCKED'));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes><Route path="/login" element={<LoginPage />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('Login-Name oder Spieler-ID'), { target: { value: 'Leia' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Login Formular' }));
    expect(await screen.findByText('Dein Spieleraccount ist noch für 3 Ticks gesperrt. Begründung: Regelverstoß')).toBeTruthy();
  });

  it('links to registration and password reset and hides registration during maintenance', async () => {
    const { unmount } = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Passwort vergessen?' }).getAttribute('href')).toBe('/lost-password');
    expect(screen.getByRole('link', { name: 'Registrieren' }).getAttribute('href')).toBe('/register');
    unmount();

    vi.mocked(api.get).mockImplementation((path: string) =>
      Promise.resolve(path === '/game-status' ? { status: 'MAINTENANCE', message: 'Update läuft.' } : null),
    );
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Registrieren' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Passwort vergessen?' })).toBeTruthy();
  });

  it('shows the maintenance and vacation notices from the query', () => {
    render(
      <MemoryRouter initialEntries={['/login?maintenance=Wartung%20l%C3%A4uft&vacation=activated']}>
        <Routes><Route path="/login" element={<LoginPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Wartung läuft')).toBeTruthy();
    expect(screen.getByText(/Urlaubsmodus aktiviert/)).toBeTruthy();
  });
});
