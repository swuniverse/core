import { useEffect, useState } from 'react';

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

export default function InviteCodes() {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/player/invite-codes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch invite codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    const timeout = setTimeout(() => setCopiedCode(null), 2000);
    return () => clearTimeout(timeout);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space text-white p-8">
        <div className="max-w-4xl mx-auto">
          <p>Lade Invite-Codes...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-space text-white p-8">
        <div className="max-w-4xl mx-auto">
          <p>Fehler beim Laden der Invite-Codes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Invite-Codes</h1>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-space-light p-6 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-rebel">{stats.total}</div>
            <div className="text-gray-400 text-sm">Gesamt</div>
          </div>
          <div className="bg-space-light p-6 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{stats.available}</div>
            <div className="text-gray-400 text-sm">Verfügbar</div>
          </div>
          <div className="bg-space-light p-6 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-gray-400">{stats.used}</div>
            <div className="text-gray-400 text-sm">Verwendet</div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <p className="text-blue-200">
            <span className="font-bold">💡 Tipp:</span> Jeder neue Spieler erhält 2 Invite-Codes.
            Teile sie mit Freunden, um das Universum zu erweitern!
          </p>
        </div>

        {/* Codes List */}
        <div className="bg-space-light rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">Deine Codes</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {stats.codes.map((code) => (
              <div
                key={code.code}
                className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono bg-gray-800 px-3 py-1 rounded">
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
        </div>

        {stats.codes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Keine Invite-Codes vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}
