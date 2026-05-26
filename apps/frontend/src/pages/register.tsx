import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { AuthLayout } from '../components/auth/AuthLayout';
import type { AuthResponse } from '@swuniverse/shared';

interface FactionOption {
  id: number;
  key: string;
  name: string;
  colorPrimary: string;
}

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [factionId, setFactionId] = useState<number | null>(null);
  const [factions, setFactions] = useState<FactionOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    api.get<FactionOption[]>('/factions').then(setFactions);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factionId) {
      setError('Waehle eine Fraktion');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        username,
        email,
        password,
        factionId,
        inviteKey: inviteKey.trim() || undefined,
      });
      setAuth(res.accessToken, res.refreshToken, res.user);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Registrierung fehlgeschlagen',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-stagger space-y-5">
        <div className="text-center">
          <p className="auth-subtitle">Neue Rekruten</p>
          <h1 className="auth-title">Der Galaxis beitreten</h1>
        </div>

        <div className="auth-notice">
          Closed Alpha — Neue Kommandanten benoetigen einen Invite Key. Nur der
          allererste Account darf ohne Key starten und wird Admin.
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="auth-label" htmlFor="reg-user">
              Benutzername
            </label>
            <input
              id="reg-user"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="reg-pass">
              Passwort
            </label>
            <input
              id="reg-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="reg-invite">
              Invite Key
            </label>
            <input
              id="reg-invite"
              type="text"
              value={inviteKey}
              onChange={(e) => setInviteKey(e.target.value)}
              className="auth-input uppercase tracking-wider"
              placeholder="SWU-ABCDE-23456-FGHIJ"
              minLength={8}
              maxLength={128}
            />
            <p className="mt-1.5 text-xs text-swu-muted opacity-70">
              Leer lassen nur beim allerersten Admin-Account.
            </p>
          </div>

          <div>
            <label className="auth-label">Fraktion</label>
            <div className="auth-faction-grid">
              {factions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFactionId(f.id)}
                  className={`auth-faction-btn ${factionId === f.id ? 'auth-faction-btn--selected' : ''}`}
                  style={
                    factionId === f.id
                      ? {
                          borderColor: f.colorPrimary,
                          boxShadow: `0 0 20px ${f.colorPrimary}25, inset 0 0 30px ${f.colorPrimary}08`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: f.colorPrimary }}
                  />
                  <div className="auth-faction-name">{f.name}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !factionId}
            className="auth-btn"
          >
            {loading ? 'Konto wird erstellt...' : 'Registrieren'}
          </button>
        </form>

        <p className="text-center text-sm text-swu-muted">
          Bereits ein Konto?{' '}
          <Link to="/login" className="auth-link">
            Anmelden
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
