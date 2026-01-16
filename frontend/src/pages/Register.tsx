import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import api from '../lib/api';
import { Shield, Users, Crown, Star } from 'lucide-react';

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

        // Type check: ensure response.data is an array
        if (Array.isArray(response.data)) {
          setFactions(response.data);
          if (response.data.length > 0) {
            setFactionId(response.data[0].id);
          }
        } else {
          console.error('Expected factions array but got:', typeof response.data, response.data);
          setFactions([]); // Fallback to empty array
        }
      } catch (err) {
        console.error('Failed to fetch factions:', err);
        setFactions([]); // Ensure factions is always an array
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
    <div className="min-h-screen bg-black">
      {/* Deep Space Background */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000408] via-[#000812] to-[#000204]" />

        {/* Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 49%, rgba(0, 255, 255, 0.1) 50%, transparent 51%),
                             linear-gradient(90deg, transparent 49%, rgba(0, 255, 255, 0.1) 50%, transparent 51%)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Registration Terminal Interface */}
        <div className="relative z-10 w-full max-w-lg">
          {/* Terminal Header */}
          <div className="bg-gradient-to-r from-cyan-950/80 to-cyan-900/60 border border-cyan-500/30 rounded-t-lg px-4 py-3 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/50 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
            </div>
            <span className="font-mono text-xs text-cyan-400/60 tracking-[0.2em] uppercase">
              Registration Terminal v1.2
            </span>
          </div>

          {/* Terminal Body */}
          <div className="relative bg-gradient-to-br from-cyan-950/40 via-slate-950/50 to-cyan-950/30 border border-cyan-500/20 rounded-b-lg p-8 backdrop-blur-sm">
            {/* Branding */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <h1 className="text-3xl font-bold font-mono tracking-[0.1em] text-cyan-300 relative">
                  STAR WARS
                  <div className="text-base text-cyan-500/80 font-normal tracking-[0.3em] mt-1">
                    UNIVERSE
                  </div>
                </h1>
                {/* Subtle glow effect */}
                <div className="absolute -inset-6 bg-cyan-400/10 blur-2xl rounded-full -z-10" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-full mb-4">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-cyan-400/80 font-mono tracking-wider uppercase">
                  Neue Identität erstellen
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-6" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-950/30 border border-red-500/40 text-red-300 p-4 rounded-lg font-mono text-sm">
                <p className="font-bold mb-1">FEHLER</p>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invite Code */}
              <div>
                <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                  ZUGANGSSCHLÜSSEL
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  maxLength={8}
                  className={`w-full px-4 py-3 bg-slate-900/60 border text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 rounded-md font-mono text-sm backdrop-blur-sm transition-colors ${
                    inviteValid === true
                      ? 'border-green-400/60 focus:ring-green-400 focus:border-green-400'
                      : inviteValid === false
                      ? 'border-red-400/60 focus:ring-red-400 focus:border-red-400'
                      : 'border-cyan-500/30 focus:ring-cyan-400 focus:border-cyan-400'
                  }`}
                  placeholder="XXXXXXXX"
                  disabled={isLoading}
                />
                {inviteValid === true && (
                  <p className="mt-2 text-sm text-green-400 font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 block" />
                    Code gültig
                  </p>
                )}
                {inviteValid === false && (
                  <p className="mt-2 text-sm text-red-400 font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
                    Ungültiger oder bereits verwendeter Code
                  </p>
                )}
              </div>

              {/* User Details Section */}
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    KOMMUNIKATIONS-ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="commander@imperium.net"
                    disabled={isLoading}
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    KOMMANDEUR-NAME
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={20}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="Dein Kommandeur-Name"
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    SICHERHEITSCODE
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="Mindestens 6 Zeichen"
                    disabled={isLoading}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    CODE BESTÄTIGEN
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="Code wiederholen"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Faction Selection */}
              <div>
                <label className="block text-cyan-400/90 font-mono text-sm mb-4 tracking-wider font-medium">
                  FRAKTION AUSWÄHLEN
                </label>
                <div className="space-y-3">
                  {factions.map((faction) => (
                    <div
                      key={faction.id}
                      onClick={() => setFactionId(faction.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        factionId === faction.id
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20'
                          : 'border-cyan-600/30 hover:border-cyan-500/50 hover:bg-cyan-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${
                          faction.name.includes('Imperium') || faction.name.includes('Empire')
                            ? 'bg-red-950/50 border border-red-500/30'
                            : 'bg-blue-950/50 border border-blue-500/30'
                        }`}>
                          {faction.name.includes('Imperium') || faction.name.includes('Empire') ? (
                            <Crown className="w-6 h-6 text-red-400" />
                          ) : (
                            <Star className="w-6 h-6 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-mono font-bold text-cyan-200 mb-1">
                            {faction.name}
                          </h3>
                          <p className="text-cyan-300/70 text-sm leading-relaxed">
                            {faction.description}
                          </p>
                        </div>
                        {factionId === faction.id && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-900 font-mono font-bold text-sm tracking-wider uppercase rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 mt-6"
              >
                <span className="flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      Registrierung läuft...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Identität registrieren
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-6" />

            {/* Navigation Links */}
            <div className="text-center">
              <p className="text-cyan-500/70 text-sm font-mono mb-3">
                Bereits registriert?
              </p>
              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 font-mono tracking-wider flex items-center justify-center gap-2 transition-colors group"
              >
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Zur Authentifizierung
              </Link>
            </div>

            {/* Terminal Status */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mt-6 mb-4" />
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-cyan-500/60">
                DATUM: {new Date().toLocaleDateString('de-DE')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
                <span className="text-cyan-500/60">REGISTRIERUNG: BEREIT</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
