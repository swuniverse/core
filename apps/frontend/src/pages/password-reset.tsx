import { useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ApiError, api } from '../services/api';

function AuthPageHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="mb-6 text-center">
      <p className="swu-eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold text-swu-primary">{title}</h1>
      <p className="mt-3 text-sm text-swu-muted">{copy}</p>
    </header>
  );
}

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
    <AuthLayout>
      <AuthPageHeader
        eyebrow="ACCOUNT RECOVERY"
        title="Passwort vergessen?"
        copy="Fordere einen Link an, um ein neues Passwort festzulegen."
      />
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {sent ? (
        <p className="text-center text-sm text-swu-primary" role="status">
          Wenn die E-Mail-Adresse bekannt ist, wurde ein Reset-Link gesendet.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
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
      <p className="mt-5 text-center text-sm">
        <Link className="text-swu-accent hover:underline" to="/login">
          Zurück zum Login
        </Link>
      </p>
    </AuthLayout>
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
    <AuthLayout>
      <AuthPageHeader
        eyebrow="SECURITY OVERRIDE"
        title="Neues Passwort"
        copy="Lege ein neues Passwort für deinen Commander-Zugang fest."
      />
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {complete ? (
        <div className="text-center" role="status">
          <p className="text-sm text-swu-primary">
            Dein Passwort wurde geändert.
          </p>
          <Link
            className="mt-4 inline-block text-swu-accent hover:underline"
            to="/login"
          >
            Zum Login
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
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
    </AuthLayout>
  );
}
