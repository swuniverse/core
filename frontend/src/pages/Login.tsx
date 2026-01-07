import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useGameStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent),
                           linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 holo-terminal p-8 rounded-lg w-full max-w-md">
        {/* Scan Line Effect */}
        <div className="holo-scan-line"></div>

        <div className="text-center mb-8 relative">
          <div className="mb-4">
            <h1 className="holo-title text-4xl mb-2">SWHOLO.NET</h1>
            <p className="holo-subtitle">// GALAKTISCHES STRATEGIE-TERMINAL //</p>
          </div>
          <div className="holo-divider"></div>
          <h2 className="text-holo/80 font-mono text-lg mt-4">AUTHENTIFIZIERUNG ERFORDERLICH</h2>
        </div>

        {error && (
          <div className="mb-4 holo-error">
            <p className="font-bold">⚠ FEHLER</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block holo-subtitle mb-2">
              [BENUTZER-ID]
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 holo-input rounded"
              placeholder="commander@republic.holo"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block holo-subtitle mb-2">
              [ZUGANGSSCHLÜSSEL]
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 holo-input rounded"
              placeholder="••••••••••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full holo-button rounded py-3 font-bold text-lg uppercase tracking-wider"
          >
            {isLoading ? '⟳ AUTHENTIFIZIERUNG...' : '▶ ZUGRIFF GEWÄHREN'}
          </button>
        </form>

        <div className="holo-divider my-6"></div>

        <div className="text-center">
          <p className="holo-subtitle mb-3">KEIN ZUGANG VORHANDEN?</p>
          <Link 
            to="/register" 
            className="holo-link text-sm uppercase tracking-wider hover:shadow-holo-lg transition-all"
          >
            ▶ NEUE IDENTITÄT REGISTRIEREN
          </Link>
        </div>

        <div className="holo-divider mt-6 mb-4"></div>
        <p className="text-center text-holo/40 text-xs font-mono">
          STARDATE {new Date().toLocaleDateString('de-DE')}<br/>
          SYS.STATUS: BEREIT
        </p>
      </div>
    </div>
  );
}
