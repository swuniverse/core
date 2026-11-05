import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../lib/errors';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

type PlayerOption = { id: number; username: string };
type AwardOption = {
  key: string;
  description: string;
  prestige: number;
  isNpc: boolean;
};
type GrantResult = { granted: boolean; count: number };

export function AdminAwardsPage() {
  const { info, error: toastError } = useToast();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [awards, setAwards] = useState<AwardOption[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [awardKey, setAwardKey] = useState('');
  const [incrementExisting, setIncrementExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.get<PlayerOption[]>('/auth/admin/users'),
      api.get<AwardOption[]>('/admin/awards/catalog'),
    ])
      .then(([nextPlayers, nextAwards]) => {
        setPlayers(nextPlayers);
        setAwards(nextAwards);
      })
      .catch((error: unknown) => {
        toastError(
          getErrorMessage(
            error,
            'Spieler oder Awards konnten nicht geladen werden.',
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  const submit = async () => {
    if (!playerId || !awardKey) return;
    setSubmitting(true);
    try {
      const result = await api.post<GrantResult>('/admin/awards/grant', {
        playerId: Number(playerId),
        awardKey,
        ...(incrementExisting ? { incrementExisting: true } : {}),
      });
      info(
        result.granted
          ? `Award vergeben (neue Anzahl: ${result.count}).`
          : `Award war bereits vorhanden (Anzahl: ${result.count}).`,
      );
    } catch (error) {
      toastError(getErrorMessage(error, 'Award konnte nicht vergeben werden.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          to="/admin"
          className="text-sm text-swu-muted hover:text-swu-accent"
        >
          Admin
        </Link>
        <h1
          className="mt-1 text-2xl font-bold text-swu-accent"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Awards vergeben
        </h1>
        <p className="mt-1 text-sm text-swu-muted">
          NPC-, Rollenspiel- und Community-Awards manuell an Spieler vergeben.
        </p>
      </div>

      <section className="max-w-xl space-y-4 rounded-lg border border-swu-border bg-swu-surface p-5">
        <label className="block text-sm text-swu-primary">
          Spieler
          <select
            aria-label="Spieler"
            className="mt-1 block w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-swu-text"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            disabled={loading || submitting}
          >
            <option value="">Spieler auswählen</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.username} (#{player.id})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-swu-primary">
          Award
          <select
            aria-label="Award"
            className="mt-1 block w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-swu-text"
            value={awardKey}
            onChange={(event) => setAwardKey(event.target.value)}
            disabled={loading || submitting}
          >
            <option value="">Award auswählen</option>
            {awards.map((award) => (
              <option key={award.key} value={award.key}>
                {award.key} — {award.description} ({award.prestige} Prestige
                {award.isNpc ? ', NPC' : ''})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-swu-primary">
          <input
            type="checkbox"
            checked={incrementExisting}
            onChange={(event) => setIncrementExisting(event.target.checked)}
            disabled={loading || submitting}
          />
          Vorhandenen Award erhöhen
        </label>
        <button
          type="button"
          disabled={loading || submitting || !playerId || !awardKey}
          onClick={() => void submit()}
          className="rounded border border-swu-accent bg-swu-accent/10 px-4 py-2 text-sm font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
        >
          {submitting ? 'Vergibt...' : 'Award vergeben'}
        </button>
      </section>
    </div>
  );
}
