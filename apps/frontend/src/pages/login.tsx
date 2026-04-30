import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import type { AuthResponse } from '@swuniverse/shared';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { username, password });
      setAuth(res.accessToken, res.refreshToken, res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-swu-surface border border-swu-border rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center text-swu-accent mb-6">
          Star Wars Universe
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
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-swu-primary hover:bg-swu-accent text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm text-swu-muted mt-4">
          No account?{' '}
          <Link to="/register" className="text-swu-primary hover:text-swu-accent">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
