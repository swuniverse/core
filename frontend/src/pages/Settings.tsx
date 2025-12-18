import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import api from '../lib/api';

interface InviteCode {
  code: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
}

interface InviteStats {
  total: number;
  used: number;
  available: number;
  codes: InviteCode[];
}

export default function Settings() {
  const { user, isConnected } = useGameStore();
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    try {
      const response = await api.get('/player/invite-codes');
      setInviteStats(response.data);
    } catch (err) {
      console.error('Failed to fetch invite codes:', err);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.patch('/auth/update-username', { username });
      setMessage('Username updated successfully! Please re-login for changes to take effect.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await api.patch('/auth/update-password', { 
        currentPassword, 
        newPassword 
      });
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Einstellungen</h1>

      {/* Connection Status */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Verbindungsstatus</h2>
        <div className={`flex items-center gap-3 px-4 py-3 rounded ${isConnected ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <p className={`font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Verbunden' : 'Getrennt'}
            </p>
            <p className="text-sm text-gray-400">
              {isConnected 
                ? 'Echtzeit-Updates aktiv' 
                : 'Verbindung verloren. Versuche erneut zu verbinden...'}
            </p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Accountinformationen</h2>
        <div className="space-y-3 text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-400">E-Mail:</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Fraktion:</span>
            <span>{user?.player?.faction?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Spieler-ID:</span>
            <span>#{user?.player?.id}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 mb-6">
          <p className="text-green-200">{message}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Update Username */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Benutzernamen ändern</h2>
        <form onSubmit={handleUpdateUsername} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Neuer Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rebel"
              placeholder="Neuen Benutzernamen eingeben"
              minLength={3}
              maxLength={20}
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Aktuell: {user?.username}
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || username === user?.username}
            className="w-full bg-rebel hover:bg-rebel-light text-white py-2 px-4 rounded-lg font-semibold transition disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {loading ? 'Aktualisiere...' : 'Benutzernamen aktualisieren'}
          </button>
        </form>
      </div>

      {/* Update Password */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Passwort ändern</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rebel"
              placeholder="Aktuelles Passwort eingeben"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rebel"
              placeholder="Neues Passwort eingeben"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Neues Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rebel"
              placeholder="Neues Passwort bestätigen"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rebel hover:bg-rebel-light text-white py-2 px-4 rounded-lg font-semibold transition disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {loading ? 'Aktualisiere...' : 'Passwort aktualisieren'}
          </button>
        </form>
      </div>

      {/* Invite Codes Section */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700 mt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Invite-Codes</h2>
        
        {inviteStats && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-rebel">{inviteStats.total}</div>
                <div className="text-gray-400 text-sm">Gesamt</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{inviteStats.available}</div>
                <div className="text-gray-400 text-sm">Verfügbar</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-400">{inviteStats.used}</div>
                <div className="text-gray-400 text-sm">Verwendet</div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
              <p className="text-blue-200">
                <span className="font-bold">💡 Tipp:</span> Jeder neue Spieler erhält 2 Invite-Codes.
                Teile sie mit Freunden, um das Universum zu erweitern!
              </p>
            </div>

            {/* Codes List */}
            {inviteStats.codes.length > 0 ? (
              <div className="space-y-2">
                {inviteStats.codes.map((code) => (
                  <div
                    key={code.code}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-mono bg-gray-900 px-3 py-1 rounded">
                          {code.code}
                        </code>
                        {code.isUsed ? (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                            Verwendet
                          </span>
                        ) : (
                          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-700">
                            Verfügbar
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Erstellt: {new Date(code.createdAt).toLocaleDateString('de-DE')}
                        {code.usedAt && (
                          <> • Verwendet: {new Date(code.usedAt).toLocaleDateString('de-DE')}</>
                        )}
                      </div>
                    </div>
                    {!code.isUsed && (
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="ml-4 px-4 py-2 bg-rebel hover:bg-rebel-light text-white rounded transition"
                      >
                        {copiedCode === code.code ? '✓ Kopiert!' : 'Kopieren'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Keine Invite-Codes vorhanden</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
