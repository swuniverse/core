import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

export function ConfirmDeletionPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Kontolöschung wird bestätigt...');
  const [error, setError] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setError(true);
      setMessage('Der Link ist ungültig oder abgelaufen');
      return;
    }
    void api.post('/auth/confirm-deletion', { token }).then(() => {
      logout();
      setMessage('Deine Kontolöschung wurde bestätigt.');
    }).catch((caught) => {
      setError(true);
      setMessage(caught instanceof ApiError ? caught.message : 'Der Link ist ungültig oder abgelaufen');
    });
  }, [logout, token]);

  return (
    <main className="mx-auto mt-16 max-w-lg border border-swu-border bg-swu-surface p-6 text-center">
      <h1 className="mb-4 text-xl font-bold text-swu-primary">Kontolöschung</h1>
      <p className={error ? 'text-red-400' : 'text-swu-text'}>{message}</p>
      <Link className="mt-4 inline-block text-swu-accent hover:underline" to="/login">Zur Anmeldung</Link>
    </main>
  );
}
