import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { ApiError, api } from '../services/api';

interface PlayerProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  faction: string | null;
  factionName: string;
  prestige: number;
  colonies: number;
  ships: number;
  completedResearch: number;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Spieler nicht gefunden.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get<PlayerProfile>(`/database/settlers/${id}`)
      .then((data) => {
        if (cancelled) return;
        setPlayer(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlayer(null);
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Spieler nicht gefunden.'
            : 'Spielerprofil konnte nicht geladen werden.',
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-3 text-swu-muted md:p-6">
        Spielerprofil wird geladen...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="p-3 md:p-6 space-y-4">
        <Link
          to="/database"
          className="text-xs text-swu-muted hover:text-swu-accent"
        >
          ← Datenbank
        </Link>
        <p className="text-swu-muted">{error ?? 'Spieler nicht gefunden.'}</p>
      </div>
    );
  }

  const name = player.displayName || player.username;

  return (
    <div className="p-3 md:p-6 space-y-4">
      <Link
        to="/database"
        className="text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Datenbank
      </Link>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-swu-border bg-swu-bg">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={`${name} Profilbild`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-swu-muted">
                {name[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-2xl font-bold text-swu-accent"
                style={{ fontFamily: 'var(--font-swu-display)' }}
              >
                {name}
              </h1>
              {player.isAdmin && (
                <span className="rounded border border-swu-accent/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-swu-accent">
                  ADMIN
                </span>
              )}
            </div>
            {player.displayName && player.displayName !== player.username && (
              <p className="text-xs text-swu-muted">Login: {player.username}</p>
            )}
            <p className="text-sm text-swu-primary">{player.factionName}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileMetric label="Prestige" value={player.prestige} />
        <ProfileMetric label="Kolonien" value={player.colonies} />
        <ProfileMetric label="Schiffe" value={player.ships} />
        <ProfileMetric label="Forschung" value={player.completedResearch} />
      </section>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-swu-primary">
          Beschreibung
        </h2>
        {player.description ? (
          <BbCodeText
            text={player.description}
            className="text-sm text-swu-text whitespace-pre-wrap"
          />
        ) : (
          <p className="text-sm italic text-swu-muted">Keine Beschreibung</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ProfileMeta
          label="Siedler seit"
          value={dateFormatter.format(new Date(player.createdAt))}
        />
        <ProfileMeta
          label="Status"
          value={player.onboardingCompleted ? 'aktiv' : 'im Aufbau'}
        />
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <p className="text-xs uppercase tracking-wider text-swu-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-swu-accent">{value}</p>
    </div>
  );
}

function ProfileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <p className="text-xs uppercase tracking-wider text-swu-muted">{label}</p>
      <p className="mt-2 text-sm text-swu-text">{value}</p>
    </div>
  );
}
