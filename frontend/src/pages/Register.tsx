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
    <div className="min-h-screen bg-space flex items-center justify-center px-4 py-8">
      <div className="bg-space-light p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Star Wars Universe</h1>
          <h2 className="text-xl text-gray-300">Account erstellen</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Invite-Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              maxLength={8}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 placeholder-gray-400 ${
                inviteValid === true
                  ? 'border-green-500 focus:ring-green-500'
                  : inviteValid === false
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:ring-rebel'
              }`}
              placeholder="XXXXXXXX"
              disabled={isLoading}
            />
            {inviteValid === true && (
              <p className="mt-1 text-sm text-green-400">✓ Code gültig</p>
            )}
            {inviteValid === false && (
              <p className="mt-1 text-sm text-red-400">✗ Ungültiger oder bereits verwendeter Code</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-rebel placeholder-gray-400"
              placeholder="deine@email.de"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-rebel placeholder-gray-400"
              placeholder="Wähle einen Benutzernamen"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-rebel placeholder-gray-400"
              placeholder="Mind. 6 Zeichen"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-rebel placeholder-gray-400"
              placeholder="Passwort wiederholen"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wähle deine Fraktion
            </label>
            <select
              value={factionId}
              onChange={(e) => setFactionId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-rebel"
              disabled={isLoading}
            >
              {factions.map((faction) => (
                <option key={faction.id} value={faction.id}>
                  {faction.name} - {faction.description}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rebel hover:bg-rebel-light text-white font-bold py-3 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Erstelle Account...' : 'Account erstellen'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Bereits ein Account?{' '}
            <Link to="/login" className="text-rebel hover:text-rebel-light font-semibold">
              Hier anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
