import { useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/auth/AuthShell';
import { ApiError, api } from '../services/api';

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: string;
}) {
  return (
    <button
      className="swu-btn swu-btn--primary swu-btn--wide"
      type="submit"
      disabled={loading}
    >
      {loading ? 'Bitte warten...' : children}
    </button>
  );
}

export function LostPasswordPage() {
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/lost-password', { login });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Reset-Link konnte nicht gesendet werden.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Passwort vergessen?"
      lead="Fordere einen Link an, um ein neues Passwort festzulegen."
    >
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {sent ? (
        <p className="swu-auth__notice" role="status">
          Wenn die E-Mail-Adresse bekannt ist, wurde ein Reset-Link gesendet.
        </p>
      ) : (
        <form className="swu-auth__form" onSubmit={handleSubmit}>
          <label className="swu-field">
            <span>Login-Name oder E-Mail-Adresse</span>
            <input
              type="text"
              autoComplete="username"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
            />
          </label>
          <SubmitButton loading={loading}>Reset-Link senden</SubmitButton>
        </form>
      )}
      <div className="swu-auth__meta">
        <Link to="/login">Zurück zum Login</Link>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    token ? '' : 'Ungültiger oder fehlender Reset-Link.',
  );
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmation) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setComplete(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Ungültiger oder abgelaufener Reset-Link.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Passwort erneuern"
      lead="Lege ein neues Passwort für deinen Commander-Zugang fest."
    >
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {complete ? (
        <div className="swu-auth__form" role="status">
          <p className="swu-auth__notice">Dein Passwort wurde geändert.</p>
          <Link className="swu-btn swu-btn--primary swu-btn--wide" to="/login">
            Zum Login
          </Link>
        </div>
      ) : (
        <form className="swu-auth__form" onSubmit={handleSubmit}>
          <label className="swu-field">
            <span>Neues Passwort</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={!token}
            />
          </label>
          <label className="swu-field">
            <span>Passwort bestätigen</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              disabled={!token}
            />
          </label>
          <SubmitButton loading={loading || !token}>
            Passwort zurücksetzen
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
