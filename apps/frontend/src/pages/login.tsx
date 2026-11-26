import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import type { AuthResponse } from '@swuniverse/shared';
import { AuthShell } from '../components/auth/AuthShell';

function getRememberLoginPreference(): boolean {
  try {
    return localStorage.getItem('swu-remember-login') !== 'false';
  } catch {
    return true;
  }
}

function saveRememberLoginPreference(rememberLogin: boolean): void {
  try {
    localStorage.setItem('swu-remember-login', String(rememberLogin));
  } catch {
    // Remember-me is optional when browser storage is unavailable.
  }
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(getRememberLoginPreference);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  );
  const [maintenance, setMaintenance] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const maintenanceMessage = searchParams.get('maintenance');
  const vacationActivated = searchParams.get('vacation') === 'activated';

  useEffect(() => {
    api
      .get<{ status: string }>('/game-status')
      .then((s) => setMaintenance(s?.status === 'MAINTENANCE'))
      .catch(() => undefined);
  }, []);

  async function handleLogin(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendState('idle');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        username,
        password,
      });
      saveRememberLoginPreference(rememberLogin);
      setAuth(res.accessToken, res.refreshToken, res.user, rememberLogin);
      const routeByDefaultView: Record<string, string> = {
        maindesk: '/',
        colonies: '/colonies',
        spacecraft: '/spacecraft',
        starmap: '/starmap',
        messages: '/messages',
        research: '/research',
        holonet: '/holonet',
      };
      navigate(
        res.user.onboardingCompleted
          ? (routeByDefaultView[res.defaultView ?? 'maindesk'] ?? '/')
          : '/onboarding',
        {
          state: res.vacationEnded ? { toast: 'Urlaubsmodus beendet' } : undefined,
        },
      );
    } catch (err) {
      setUnverified(
        err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED',
      );
      setError(
        err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendState('sending');
    try {
      await api.post('/auth/resend-verification', { email: loginEmail });
    } finally {
      setResendState('sent');
    }
  }

  return (
    <AuthShell
      title="Zurück auf die Brücke"
    >
      <form
        className="swu-auth__form"
        onSubmit={handleLogin}
        aria-label="Login Formular"
      >
        {maintenanceMessage && (
          <div className="swu-auth__notice" role="status">
            {maintenanceMessage}
          </div>
        )}
        {vacationActivated && (
          <div className="swu-auth__notice" role="status">
            Urlaubsmodus aktiviert. Er wird in 48 Stunden wirksam.
          </div>
        )}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        {unverified && (
          <div className="swu-field">
            <span>E-Mail-Adresse deines Kontos</span>
            <input
              name="verification-email"
              type="email"
              autoComplete="email"
              placeholder="commander@galaxy.net"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <button
              className="swu-btn swu-btn--ghost swu-btn--wide"
              type="button"
              onClick={handleResendVerification}
              disabled={!loginEmail || resendState !== 'idle'}
            >
              {resendState === 'sending'
                ? 'Wird gesendet...'
                : resendState === 'sent'
                  ? 'Falls ein Konto existiert, wurde eine Mail gesendet'
                  : 'Bestätigungsmail erneut senden'}
            </button>
          </div>
        )}
        <label className="swu-field">
          <span>Username</span>
          <input
            name="username"
            autoComplete="username"
            placeholder="Login-Name oder Spieler-ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="swu-field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="swu-field">
          <input
            type="checkbox"
            name="rememberLogin"
            checked={rememberLogin}
            onChange={(event) => {
              setRememberLogin(event.target.checked);
              saveRememberLoginPreference(event.target.checked);
            }}
          />
          <span>Angemeldet bleiben</span>
        </label>
        <button
          className="swu-btn swu-btn--primary swu-btn--wide"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Anmeldung...' : 'Login'}
        </button>
        <div className="swu-auth__meta">
          {!maintenance && <Link to="/register">Registrieren</Link>}
          <Link to="/lost-password">Passwort vergessen?</Link>
        </div>
      </form>
    </AuthShell>
  );
}
