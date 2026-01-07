import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import api from '../lib/api';

interface Faction {
  id: number;
  name: string;
  description: string;
}

export default function Register() {
  const navigate = useNavigate();
  const register = useGameStore((state) => state.register);
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [factionId, setFactionId] = useState<number>(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchFactions = async () => {
      try {
        const response = await api.get('/factions');
        setFactions(response.data);
        if (response.data.length > 0) {
          setFactionId(response.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch factions:', err);
        setError('Fraktionen konnten nicht geladen werden');
      }
    };
    fetchFactions();
  }, []);

  // Validate invite code as user types
  useEffect(() => {
    if (inviteCode.length === 8) {
      const validateInvite = async () => {
        try {
          const response = await api.post('/auth/validate-invite', { code: inviteCode });
          setInviteValid(response.data.valid);
        } catch (err) {
          setInviteValid(false);
        }
      };
      validateInvite();
    } else {
      setInviteValid(null);
    }
  }, [inviteCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!inviteCode || inviteCode.length !== 8) {
      setError('Bitte gib einen gültigen Invite-Code ein');
      return;
    }

    if (inviteValid === false) {
      setError('Ungültiger oder bereits verwendeter Invite-Code');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ email, username, password, factionId, inviteCode });
      
      // Show success message with reference to settings
      if (result.inviteCodes) {
        alert(`Willkommen! Deine Invite-Codes:\n${result.inviteCodes.join('\n')}\n\nDu findest deine Codes jederzeit in den Einstellungen.\nTeile sie mit Freunden!`);
      }
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent),
                           linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 holo-terminal p-8 rounded-lg w-full max-w-md">
        {/* Scan Line Effect */}
        <div className="holo-scan-line"></div>

        <div className="text-center mb-8 relative">
          <div className="mb-4">
            <h1 className="holo-title text-4xl mb-2">SWHOLO.NET</h1>
            <p className="holo-subtitle">// IDENTITÄTS-REGISTRIERUNG //</p>
          </div>
          <div className="holo-divider"></div>
          <h2 className="text-holo/80 font-mono text-lg mt-4">NEUE IDENTITÄT ERSTELLEN</h2>
        </div>

        {error && (
          <div className="mb-4 holo-error">
            <p className="font-bold">⚠ FEHLER</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite Code */}
          <div>
            <label className="block holo-subtitle mb-2">
              [ZUGANGSSCHLÜSSEL]
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              maxLength={8}
              className={`w-full px-4 py-3 holo-input rounded ${
                inviteValid === true
                  ? 'border-green-400 shadow-none'
                  : inviteValid === false
                  ? 'border-red-400 shadow-none'
                  : ''
              }`}
              placeholder="XXXXXXXX"
              disabled={isLoading}
            />
            {inviteValid === true && (
              <p className="mt-1 text-sm text-green-400 font-mono">✓ GÜLTIG</p>
            )}
            {inviteValid === false && (
              <p className="mt-1 text-sm text-red-400 font-mono">✗ UNGÜLTIG ODER VERWENDET</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block holo-subtitle mb-2">
              [KOMMUNIKATIONS-ID]
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

          {/* Username */}
          <div>
            <label className="block holo-subtitle mb-2">
              [PILOT-NAME]
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full px-4 py-3 holo-input rounded"
              placeholder="Wähle einen Namen"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block holo-subtitle mb-2">
              [SICHERHEITSCODE]
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 holo-input rounded"
              placeholder="Mind. 6 Zeichen"
              disabled={isLoading}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block holo-subtitle mb-2">
              [CODE BESTÄTIGEN]
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 holo-input rounded"
              placeholder="Wiederholen"
              disabled={isLoading}
            />
          </div>

          {/* Faction Selection */}
          <div>
            <label className="block holo-subtitle mb-2">
              [FRAKTION AUSWÄHLEN]
            </label>
            <select
              value={factionId}
              onChange={(e) => setFactionId(Number(e.target.value))}
              required
              className="w-full px-4 py-3 bg-holo-bg/80 border border-holo text-holo rounded focus:outline-none focus:ring-2 focus:ring-holo cursor-pointer"
              disabled={isLoading}
            >
              {factions.map((faction) => (
                <option key={faction.id} value={faction.id}>
                  {faction.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full holo-button rounded py-3 font-bold text-lg uppercase tracking-wider mt-6"
          >
            {isLoading ? '⟳ REGISTRIERUNG...' : '▶ IDENTITÄT REGISTRIEREN'}
          </button>
        </form>

        <div className="holo-divider my-6"></div>

        <div className="text-center">
          <p className="holo-subtitle mb-3">BEREITS REGISTRIERT?</p>
          <Link 
            to="/login" 
            className="holo-link text-sm uppercase tracking-wider hover:shadow-holo-lg transition-all"
          >
            ▶ ZUR AUTHENTIFIZIERUNG
          </Link>
        </div>

        <div className="holo-divider mt-6 mb-4"></div>
        <p className="text-center text-holo/40 text-xs font-mono">
          STARDATE {new Date().toLocaleDateString('de-DE')}<br/>
          REG.STATUS: BEREIT
        </p>
      </div>
    </div>
  );
}
