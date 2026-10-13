import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getErrorMessage } from '../lib/errors';

type GameStatus = {
  status: 'ONLINE' | 'MAINTENANCE_ANNOUNCED' | 'MAINTENANCE';
  message: string;
};

const DEFAULT_STATUS_MESSAGES: Partial<Record<GameStatus['status'], string>> = {
  MAINTENANCE_ANNOUNCED: 'Eine Wartung des Spiels ist angekündigt.',
  MAINTENANCE: 'Das Spiel befindet sich derzeit in Wartung.',
};

const adminCards = [
  {
    title: 'Ship Spawn',
    path: '/admin/ships',
    description:
      'Schiffe fuer Spieler erzeugen, um Navigation, Kampf und Flotten schneller zu testen.',
    badge: 'Tools',
  },
  {
    title: 'Map Admin',
    path: '/admin/starmap',
    description:
      'Galaxy- und Systemkarten bearbeiten, Layer pflegen und Regionen verwalten.',
    badge: 'Starmap',
  },
  {
    title: 'Einladungen',
    path: '/admin/invites',
    description:
      'Closed-Alpha Invite Keys, Spieler-Kontingente und neu ausgestellte Keys verwalten.',
    badge: 'Alpha',
  },
  {
    title: 'Benutzerrechte',
    path: '/admin/users',
    description:
      'Berechtigungen für Spieler verwalten (z.B. Map Editor Zugang).',
    badge: 'Users',
  },
];

function GameStatusControl() {
  const [value, setValue] = useState<GameStatus | null>(null);
  const [status, setStatus] = useState<GameStatus['status']>('ONLINE');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const next = await api.get<GameStatus>('/game-status/admin');
    setValue(next);
    setStatus(next.status);
    setMessage(
      next.message === DEFAULT_STATUS_MESSAGES[next.status] ? '' : next.message,
    );
  };

  useEffect(() => {
    void load().catch((err) =>
      setError(getErrorMessage(err, 'Spielstatus konnte nicht geladen werden.')),
    );
  }, []);

  const save = async () => {
    if (
      status === 'MAINTENANCE' &&
      !window.confirm('Wartung starten? Normale Spieler verlieren sofort den Spielzugang.')
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.patch<GameStatus, GameStatus>('/game-status', {
        status,
        message,
      });
      setValue(next);
      setMessage(
        next.message === DEFAULT_STATUS_MESSAGES[next.status] ? '' : next.message,
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Spielstatus konnte nicht gespeichert werden.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-swu-text">Spielstatus</div>
          <p className="mt-1 text-sm text-swu-muted">
            Steuert die öffentliche Meldung und den Zugang zum Spiel.
          </p>
        </div>
        {value && (
          <span className="rounded border border-swu-accent/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-swu-accent">
            {value.status === 'ONLINE'
              ? 'Online'
              : value.status === 'MAINTENANCE_ANNOUNCED'
                ? 'Angekündigt'
                : 'Wartung'}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-swu-primary">
          Status
          <select
            className="mt-1 block w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-swu-text"
            value={status}
            onChange={(event) => setStatus(event.target.value as GameStatus['status'])}
          >
            <option value="ONLINE">Online</option>
            <option value="MAINTENANCE_ANNOUNCED">Wartung angekündigt</option>
            <option value="MAINTENANCE">Wartung läuft</option>
          </select>
        </label>
        <label className="block text-sm text-swu-primary">
          Meldung <span className="text-swu-muted">(optional)</span>
          <textarea
            className="mt-1 block w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-swu-text"
            value={message}
            maxLength={2000}
            rows={3}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded border border-swu-accent bg-swu-accent/10 px-4 py-2 text-sm font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
        >
          {busy ? 'Speichert...' : 'Spielstatus speichern'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function CompleteAllBuilds() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ completed: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<{ completed: string }>(
        '/admin/colony/complete-all-builds',
        {},
      );
      setResult(res);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Fehlgeschlagen'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-swu-text">Alle Bauten abschliessen</div>
          <p className="mt-1 text-sm text-swu-muted">
            Schliesst sofort alle laufenden Gebaeude-, Fabrication-, Schiffbau- und Crew-Queues ab.
          </p>
        </div>
        <span className="rounded border border-swu-accent/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-swu-accent">
          Engine
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={trigger}
          disabled={loading}
          className="rounded border border-swu-accent bg-swu-accent/10 px-4 py-2 text-sm font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
        >
          {loading ? 'Wird verarbeitet...' : 'Alle Bauten abschliessen'}
        </button>
        {result && (
          <span className="text-sm text-swu-success">
            Abgeschlossen — {result.completed}
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function TickTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tickNumber: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<{ tickNumber: number; status: string }>(
        '/admin/tick/trigger',
        {},
      );
      setResult(res);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Tick fehlgeschlagen'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-swu-text">Game Tick</div>
          <p className="mt-1 text-sm text-swu-muted">
            Haupttick manuell ausloesen — verarbeitet Resourcen, Forschung,
            Bevoelkerung und Schiffe.
          </p>
        </div>
        <span className="rounded border border-swu-accent/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-swu-accent">
          Engine
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={trigger}
          disabled={loading}
          className="rounded border border-swu-accent bg-swu-accent/10 px-4 py-2 text-sm font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
        >
          {loading ? 'Wird verarbeitet...' : 'Tick ausloesen'}
        </button>
        {result && (
          <span className="text-sm text-swu-success">
            Tick #{result.tickNumber} — {result.status}
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-swu-accent" style={{ fontFamily: 'var(--font-swu-display)' }}>Admin</h1>
        <p className="mt-1 text-sm text-swu-muted">
          Interne Werkzeuge fuer Tests, Content-Pflege und Kartenbearbeitung.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TickTrigger />
          <CompleteAllBuilds />
          <GameStatusControl />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-3">
          Tools
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {adminCards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="rounded-lg border border-swu-border bg-swu-surface p-5 transition hover:border-swu-accent hover:bg-swu-accent/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-swu-text">
                    {card.title}
                  </div>
                  <p className="mt-2 text-sm text-swu-muted">
                    {card.description}
                  </p>
                </div>
                <span className="rounded border border-swu-accent/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-swu-accent">
                  {card.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
