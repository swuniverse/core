import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { StarField } from '../components/auth/StarField';

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

  return (
    <main className="swu-page swu-page--register">
      <StarField />
      <section
        className="swu-register-shell"
        aria-labelledby="verify-email-title"
      >
        <div className="swu-register-card">
          <div className="swu-register-card__header">
            <p className="swu-eyebrow">SUBSPACE // KONTOBESTÄTIGUNG</p>
            {status === 'pending' && (
              <>
                <h1 id="verify-email-title">Bestätigung läuft...</h1>
                <p>Dein Link wird geprüft.</p>
              </>
            )}
            {status === 'success' && (
              <>
                <h1 id="verify-email-title">Konto aktiviert.</h1>
                <p>
                  Deine E-Mail-Adresse ist bestätigt. Du kannst dich jetzt
                  anmelden.
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <h1 id="verify-email-title">Bestätigung fehlgeschlagen.</h1>
                <p role="alert">{message}</p>
                <p>
                  Melde dich an und fordere dort eine neue Bestätigungsmail an.
                </p>
              </>
            )}
          </div>
          <Link className="swu-btn swu-btn--primary swu-btn--wide" to="/login">
            Zum Login
          </Link>
        </div>
      </section>
    </main>
  );
}
