import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { AuthShell } from '../components/auth/AuthShell';
import { useAuthStore } from '../stores/auth.store';
import type { AuthResponse, RegisterResponse } from '@swuniverse/shared';

interface FactionOption {
  id: number;
  key: string;
  name: string;
  colorPrimary: string;
  playerCount: number;
  playerLimit: number;
  isSelectable: boolean;
  hasFreePlayerSlots: boolean;
}

function passwordStrength(pw: string): number {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (hasDigit && hasSpecial) return 4;
  if (hasDigit || hasSpecial) return 3;
  return 2;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [factionId, setFactionId] = useState<number | null>(null);
  const [factions, setFactions] = useState<FactionOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  );

  useEffect(() => {
    api.get<FactionOption[]>('/factions').then(setFactions);
  }, []);

  const selected = factions.find((f) => f.id === factionId);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factionId) {
      setError('Wähle eine Fraktion');
      setStep(1);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse | RegisterResponse>('/auth/register', {
        username,
        email,
        password,
        factionId,
      });
      if ('accessToken' in res) {
        // Without mandatory email verification the account is active at once.
        setAuth(res.accessToken, res.refreshToken, res.user);
        navigate('/');
      } else {
        setRegisteredEmail(res.email);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Registrierung fehlgeschlagen',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!registeredEmail) return;
    setResendState('sending');
    try {
      await api.post('/auth/resend-verification', { email: registeredEmail });
    } finally {
      setResendState('sent');
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell
        title="Prüfe dein Postfach."
        lead={
          <>
            Wir haben einen Bestätigungslink an <strong>{registeredEmail}</strong>{' '}
            geschickt. Sobald du ihn geöffnet hast, ist dein Konto aktiv und du
            kannst dich anmelden. Der Link ist 24 Stunden gültig.
          </>
        }
      >
        <div className="swu-auth__form">
          <button
            className="swu-btn swu-btn--ghost swu-btn--wide"
            type="button"
            onClick={handleResend}
            disabled={resendState !== 'idle'}
          >
            {resendState === 'sending'
              ? 'Wird gesendet...'
              : resendState === 'sent'
                ? 'Mail wurde erneut gesendet'
                : 'Mail erneut senden'}
          </button>
          <div className="swu-auth__meta">
            <Link to="/login">Zurück zum Login</Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      title={step === 1 ? 'Wähle deine Fraktion.' : 'Lege deinen Zugang an.'}
      lead={
        step === 1
          ? 'Sie bestimmt deine Seite im Konflikt.'
          : selected
            ? `Du startest bei ${selected.name}.`
            : undefined
      }
    >
      <ol className="swu-steps-bar" aria-label="Fortschritt">
        <li aria-current={step === 1 ? 'step' : undefined}>1 Fraktion</li>
        <li aria-current={step === 2 ? 'step' : undefined}>2 Zugang</li>
        <li>3 E-Mail bestätigen</li>
      </ol>

      <form className="swu-auth__form" onSubmit={handleSubmit}>
        {error && (
          <div className="auth-error" role="alert" tabIndex={-1}>
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <fieldset className="swu-factions">
              <legend className="visually-hidden">Fraktion wählen</legend>
              <div className="swu-factions__row">
                {factions
                  .filter((f) => f.isSelectable)
                  .map((f) => (
                    <button
                      className={`swu-faction ${factionId === f.id ? 'swu-faction--selected' : ''}`}
                      key={f.id}
                      type="button"
                      aria-pressed={factionId === f.id}
                      disabled={!f.hasFreePlayerSlots}
                      title={
                        f.hasFreePlayerSlots
                          ? undefined
                          : 'Alle vorgesehenen Spielerplätze dieser Fraktion sind belegt'
                      }
                      onClick={() => setFactionId(f.id)}
                      style={{ color: f.colorPrimary }}
                    >
                      <span
                        className="swu-faction__mark"
                        style={{ backgroundColor: f.colorPrimary }}
                        aria-hidden="true"
                      />
                      <span>{f.name}</span>
                      <span className="swu-faction__count">
                        {f.playerLimit > 0
                          ? `${f.playerCount}/${f.playerLimit}`
                          : f.playerCount}{' '}
                        Siedler
                        {!f.hasFreePlayerSlots && ', voll'}
                      </span>
                    </button>
                  ))}
              </div>
            </fieldset>
            <button
              className="swu-btn swu-btn--primary swu-btn--wide"
              type="button"
              disabled={!factionId}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              Weiter
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="swu-register-card__fields">
              <label className="swu-field">
                <span>
                  Commander Name{' '}
                  <small className="swu-field__hint">3 bis 32 Zeichen</small>
                </span>
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
                <span>
                  E-Mail{' '}
                  <small className="swu-field__hint">zur Kontobestätigung</small>
                </span>
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
            </div>
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
            <button
              className="swu-btn swu-btn--primary swu-btn--wide"
              type="submit"
              disabled={loading || !factionId}
            >
              {loading ? 'Wird registriert...' : 'Commander registrieren'}
            </button>
            <button
              className="swu-btn swu-btn--ghost swu-btn--wide"
              type="button"
              onClick={() => setStep(1)}
            >
              Fraktion ändern
            </button>
          </>
        )}

        <div className="swu-auth__meta">
          <Link to="/login">Zurück zum Login</Link>
        </div>
      </form>
    </AuthShell>
  );
}
