import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
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
            <label className="block text-sm text-swu-muted mb-1">
              Username
            </label>
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
            <label className="block text-sm text-swu-muted mb-1">
              Password
            </label>
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
            <label className="block text-sm text-swu-muted mb-2">
              Fraktion
            </label>
            <div className="grid grid-cols-2 gap-3">
              {factions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFactionId(f.id)}
                  className={`p-3 rounded border text-center transition-all ${
                    factionId === f.id
                      ? 'border-swu-accent bg-swu-accent/20 text-swu-accent'
                      : 'border-swu-border bg-swu-bg text-swu-text hover:border-swu-primary'
                  }`}
                >
                  <div className="text-sm font-bold">{f.name}</div>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !factionId}
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
