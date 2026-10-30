import { useEffect, useState } from 'react';
import type { Faction } from '@swuniverse/shared';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';

interface FactionAdminEntry {
  id: number;
  key: Faction;
  name: string;
  isSelectable: boolean;
  playerCount: number;
}

export function AdminFactionsPage() {
  const [factions, setFactions] = useState<FactionAdminEntry[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<FactionAdminEntry[]>('/factions')
      .then(setFactions)
      .catch((err: unknown) =>
        setError(
          err instanceof ApiError
            ? err.message
            : 'Fraktionen konnten nicht geladen werden',
        ),
      );
  }, []);

  async function toggleSelectability(faction: FactionAdminEntry) {
    setSavingId(faction.id);
    setError('');
    try {
      const updated = await api.patch<FactionAdminEntry>(
        `/factions/${faction.id}/selectability`,
        { isSelectable: !faction.isSelectable },
      );
      setFactions((current) =>
        current.map((entry) => (entry.id === faction.id ? updated : entry)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Fraktionswählbarkeit konnte nicht gespeichert werden',
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-4 p-6">
      <div className="text-xs text-swu-muted">
        <Link to="/admin" className="hover:text-swu-accent">
          Admin
        </Link>{' '}
        / Fraktionen
      </div>
      <div>
        <h1 className="text-2xl font-bold text-swu-accent">Fraktionen</h1>
        <p className="mt-1 text-sm text-swu-muted">
          Legt fest, welche Fraktionen neue Spieler im Onboarding wählen können.
          Bereits zugeordnete Spieler bleiben unverändert.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="overflow-x-auto border border-swu-border bg-swu-surface">
        <table className="w-full text-sm">
          <thead className="bg-swu-bg/50 text-left text-xs uppercase text-swu-muted">
            <tr>
              <th className="p-3">Fraktion</th>
              <th className="p-3 text-right">Spieler</th>
              <th className="p-3">Für neue Spieler</th>
            </tr>
          </thead>
          <tbody>
            {factions.map((faction) => (
              <tr key={faction.id} className="border-t border-swu-border">
                <td className="p-3 font-semibold text-swu-text">{faction.name}</td>
                <td className="p-3 text-right text-swu-muted">
                  {faction.playerCount}
                </td>
                <td className="p-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={faction.isSelectable}
                      disabled={savingId === faction.id}
                      onChange={() => void toggleSelectability(faction)}
                    />
                    {faction.isSelectable ? 'Wählbar' : 'Nicht wählbar'}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
