import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { AuthShell } from '../components/auth/AuthShell';

type Status = 'pending' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'Der Bestätigungslink ist unvollständig.',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        if (!cancelled) setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'Die Bestätigung ist fehlgeschlagen.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const title =
    status === 'pending'
      ? 'Bestätigung läuft...'
      : status === 'success'
        ? 'Konto aktiviert.'
        : 'Bestätigung fehlgeschlagen.';

  return (
    <AuthShell title={title}>
      <div className="swu-auth__form">
        {status === 'pending' && <p>Dein Link wird geprüft.</p>}
        {status === 'success' && (
          <p>Deine E-Mail-Adresse ist bestätigt. Du kannst dich jetzt anmelden.</p>
        )}
        {status === 'error' && (
          <>
            <p role="alert">{message}</p>
            <p>Melde dich an und fordere dort eine neue Bestätigungsmail an.</p>
          </>
        )}
        <Link className="swu-btn swu-btn--primary swu-btn--wide" to="/login">
          Zum Login
        </Link>
      </div>
    </AuthShell>
  );
}
