import { useEffect, useState, type SyntheticEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { StarField } from '../components/auth/StarField';
import type { AuthResponse } from '@swuniverse/shared';

interface FactionModifiers {
  hullMultiplier: number;
  shieldMultiplier: number;
  cargoMultiplier: number;
  researchMultiplier: number;
  colonyGrowthMultiplier: number;
  tradeModifier: number;
}

const MODIFIER_LABELS: Record<keyof FactionModifiers, string> = {
  hullMultiplier: 'Hülle',
  shieldMultiplier: 'Schilde',
  cargoMultiplier: 'Fracht',
  researchMultiplier: 'Forschung',
  colonyGrowthMultiplier: 'Koloniewachstum',
  tradeModifier: 'Handel',
};

function getBonuses(m: FactionModifiers): { label: string; value: string }[] {
  return (Object.keys(MODIFIER_LABELS) as (keyof FactionModifiers)[])
    .filter((k) => m[k] !== 1)
    .map((k) => ({
      label: MODIFIER_LABELS[k],
      value: `+${Math.round((m[k] - 1) * 100)}%`,
    }));
}

interface FactionOption {
  id: number;
  key: string;
  name: string;
  colorPrimary: string;
  playerCount: number;
  modifiers: FactionModifiers[];
}

function CinematicBg() {
  return (
    <div className="swu-bg" aria-hidden="true">
      <div className="swu-bg__nebula" />
      <div className="swu-bg__planet" />
      <div className="swu-bg__flare" />
    </div>
  );
}

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function passwordStrength(pw: string): number {
    if (pw.length === 0) return 0;
    if (pw.length < 8) return 1;
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
    if (hasDigit && hasSpecial) return 4;
    if (hasDigit || hasSpecial) return 3;
    return 2;
  }
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

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factionId) {
      setError('Wähle eine Fraktion');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
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
    <main className="swu-page swu-page--register">
      <StarField />
      <CinematicBg />

      <nav className="swu-nav" aria-label="Navigation">
        <Link
          className="swu-nav__brand"
          to="/login"
          aria-label="Star Wars Universe Start"
        >
          <span className="swu-nav__sigil" aria-hidden="true" />
          <span>SWU</span>
        </Link>
        <div className="swu-nav__links">
          <Link to="/login">Zur Landing Page</Link>
          <a
            href="https://github.com/swuniverse"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="swu-nav__discord"
            href="https://discord.com/invite/vvUwR6UZbB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        </div>
      </nav>

      <section className="swu-register-shell" aria-labelledby="register-title">
        <form className="swu-register-card" onSubmit={handleSubmit}>
          <div className="swu-register-card__header">
            <p className="swu-eyebrow">Closed Alpha Zugang</p>
            <h1 id="register-title">Commander registrieren</h1>
            <p>
              Wähle dein Rufzeichen, sichere deinen Invite Key und betrete die
              erste Testwelle von Star Wars Universe.
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="swu-register-card__fields">
            <label className="swu-field">
              <span>Commander Name</span>
              <input
                name="commander"
                autoComplete="username"
                placeholder="z. B. TarkinShadow"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
              />
            </label>
            <label className="swu-field">
              <span>E-Mail</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="commander@galaxy.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="swu-field">
              <span>Passwort</span>
              <div className="swu-password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mindestens 8 Zeichen"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  className="swu-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Verbergen' : 'Anzeigen'}
                </button>
              </div>
            </label>
            {password.length > 0 && (
              <div
                className="swu-password-strength"
                data-level={passwordStrength(password)}
                aria-hidden="true"
              >
                <span className="swu-password-strength__seg" />
                <span className="swu-password-strength__seg" />
                <span className="swu-password-strength__seg" />
                <span className="swu-password-strength__seg" />
              </div>
            )}
            <label className="swu-field">
              <span>Passwort bestätigen</span>
              <input
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className="swu-field">
              <span>Invite Key</span>
              <input
                name="invite"
                inputMode="text"
                placeholder="SWU-ABCDE-23456-FGHIJ"
                value={inviteKey}
                onChange={(e) => setInviteKey(e.target.value)}
              />
            </label>
          </div>

          <fieldset className="swu-factions">
            <legend>Fraktion wählen</legend>
            <div className="swu-factions__row">
              {factions.map((f) => (
                <button
                  className={`swu-faction ${factionId === f.id ? 'swu-faction--selected' : ''}`}
                  key={f.id}
                  type="button"
                  aria-pressed={factionId === f.id}
                  onClick={() => setFactionId(f.id)}
                  style={{ color: f.colorPrimary }}
                >
                  <span
                    className="swu-faction__mark"
                    style={{ backgroundColor: f.colorPrimary }}
                    aria-hidden="true"
                  />
                  <span>{f.name}</span>
                  <span className="swu-faction__count">{f.playerCount} Siedler</span>
                  {f.modifiers?.[0] && (
                    <span className="swu-faction__bonuses">
                      {getBonuses(f.modifiers[0]).map((b) => (
                        <span key={b.label} className="swu-faction__bonus-chip">
                          <span className="swu-faction__bonus-value" style={{ color: f.colorPrimary }}>{b.value}</span>
                          {' '}{b.label}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="swu-btn swu-btn--primary swu-btn--wide"
            type="submit"
            disabled={loading || !factionId}
          >
            {loading ? 'Registriere...' : 'Alpha-Zugang sichern'}
          </button>

          <Link className="swu-register-card__back" to="/login">
            Zurück zum Login
          </Link>
        </form>
      </section>
    </main>
  );
}
