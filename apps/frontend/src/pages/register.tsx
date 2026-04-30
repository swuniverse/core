import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { Faction } from '@swuniverse/shared';
import type { AuthResponse } from '@swuniverse/shared';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [faction, setFaction] = useState<Faction>(Faction.REBEL_ALLIANCE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        username,
        email,
        password,
        faction,
      });
      setAuth(res.accessToken, res.refreshToken, res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-swu-surface border border-swu-border rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center text-swu-accent mb-6">
          Join the Galaxy
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-swu-danger/20 border border-swu-danger text-swu-text rounded p-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-swu-muted mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-2 text-swu-text focus:border-swu-primary outline-none"
              required
              minLength={3}
              maxLength={32}
            />
          </div>
          <div>
            <label className="block text-sm text-swu-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-2 text-swu-text focus:border-swu-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-swu-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-2 text-swu-text focus:border-swu-primary outline-none"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm text-swu-muted mb-2">Faction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFaction(Faction.REBEL_ALLIANCE)}
                className={`p-3 rounded border text-center transition-colors ${
                  faction === Faction.REBEL_ALLIANCE
                    ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                    : 'border-swu-border text-swu-muted hover:border-swu-primary'
                }`}
              >
                Rebel Alliance
              </button>
              <button
                type="button"
                onClick={() => setFaction(Faction.GALACTIC_EMPIRE)}
                className={`p-3 rounded border text-center transition-colors ${
                  faction === Faction.GALACTIC_EMPIRE
                    ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                    : 'border-swu-border text-swu-muted hover:border-swu-primary'
                }`}
              >
                Galactic Empire
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-swu-primary hover:bg-swu-accent text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="text-center text-sm text-swu-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-swu-primary hover:text-swu-accent">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
