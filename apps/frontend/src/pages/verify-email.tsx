import { useEffect, useState, type SyntheticEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { UserProfile } from '@swuniverse/shared';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ApiError, api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;
    void api
      .post('/auth/verify-email', { token })
      .then(async () => {
        setMessage('Deine E-Mail-Adresse wurde bestätigt.');
        if (!useAuthStore.getState().accessToken) return;
        const profile = await api.get<UserProfile>('/auth/me');
        setUser(profile);
        navigate(profile.onboardingCompleted ? '/' : '/claim-colony', {
          replace: true,
        });
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Der Bestätigungslink ist ungültig oder abgelaufen.',
        ),
      );
  }, [navigate, setUser, token]);

  async function resend() {
    setError('');
    await api.post('/auth/verification/resend', {}).then(() => {
      setMessage('Falls möglich, wurde eine neue E-Mail verschickt.');
    }).catch((caught) => {
      setError(caught instanceof ApiError ? caught.message : 'E-Mail konnte nicht gesendet werden.');
    });
  }

  async function updateEmail(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    await api.patch('/auth/verification/email', { email }).then(() => {
      setMessage('Adresse aktualisiert. Eine neue E-Mail wurde verschickt.');
    }).catch((caught) => {
      setError(caught instanceof ApiError ? caught.message : 'Adresse konnte nicht aktualisiert werden.');
    });
  }

  return (
    <AuthLayout>
      <header className="mb-6 text-center">
        <p className="swu-eyebrow">ACCOUNT VERIFICATION</p>
        <h1 className="mt-2 text-2xl font-bold text-swu-primary">E-Mail bestätigen</h1>
        <p className="mt-3 text-sm text-swu-muted">
          Bestätige deine Adresse, bevor du deine Heimatwelt beanspruchst.
        </p>
      </header>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <p className="mb-4 text-center text-sm text-swu-primary" role="status">{message}</p>}
      {user && !token && (
        <>
          <button className="swu-btn swu-btn--primary swu-btn--wide" type="button" onClick={() => void resend()}>
            E-Mail erneut senden
          </button>
          <form className="mt-6 space-y-4" onSubmit={updateEmail}>
            <label className="swu-field">
              <span>E-Mail-Adresse korrigieren</span>
              <input type="email" autoComplete="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <button className="swu-btn swu-btn--wide" type="submit">Adresse aktualisieren</button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
