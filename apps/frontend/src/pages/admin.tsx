import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

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
    } catch (e: any) {
      setError(e.message || 'Tick fehlgeschlagen');
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
