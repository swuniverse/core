import { useEffect, useState } from 'react';
import type { SpacecraftAstrometryJobDto } from '@swuniverse/shared';
import { api } from '../../services/api';

type Props = {
  shipId: number;
  refreshKey?: number;
  onUpdate: () => Promise<void> | void;
  compact?: boolean;
  onError?: (message: string) => void;
};

const statusText: Record<SpacecraftAstrometryJobDto['status'], string> = {
  ACTIVE: 'Astrometrie läuft',
  COMPLETED: 'System erfolgreich kartographiert',
  ABORTED: 'Astrometrie abgebrochen',
};

export function AstrometryPanel({
  shipId,
  refreshKey = 0,
  onUpdate,
  compact = false,
  onError,
}: Props) {
  const [job, setJob] = useState<SpacecraftAstrometryJobDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    api
      .get<SpacecraftAstrometryJobDto | null>(
        `/spacecraft/${shipId}/astrometry`,
      )
      .then((result) => {
        if (current) setJob(result);
      })
      .catch((err: unknown) => {
        if (!current) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Astrometriestatus konnte nicht geladen werden',
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [shipId, refreshKey]);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<SpacecraftAstrometryJobDto>(
        `/spacecraft/${shipId}/astrometry`,
        {},
      );
      setJob(result);
      await onUpdate();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Astrometrie konnte nicht gestartet werden';
      if (onError) onError(message);
      else setError(message);
    } finally {
      setPending(false);
    }
  }

  const active = job?.status === 'ACTIVE';
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-swu-primary">Astrometrie</h2>
        {active && <span className="text-amber-300">Läuft</span>}
      </div>
      {loading ? (
        <p className="mt-1 text-swu-muted">Status wird geladen…</p>
      ) : job ? (
        <div className="mt-1 space-y-1">
          <p
            className={
              job.status === 'ABORTED' ? 'text-red-300' : 'text-swu-text'
            }
          >
            {statusText[job.status]}
          </p>
          {active && (
            <p className="text-swu-muted">
              Abschluss beim nächsten Haupttick (seit{' '}
              {new Date(job.startedAt).toLocaleString('de-DE')})
            </p>
          )}
          {job.abortReason && (
            <p className="text-red-300">Grund: {job.abortReason}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-swu-muted">
          Kartographiert das aktuelle Sternensystem. Kosten: 10 EPS.
        </p>
      )}
      {!active && (
        <button
          type="button"
          disabled={pending || loading}
          onClick={() => void start()}
          className="mt-2 border border-swu-accent px-2 py-1 font-bold text-swu-accent hover:bg-swu-accent/10 disabled:opacity-50"
        >
          {pending ? 'Starte Astrometrie…' : 'Astrometrie starten'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-300">
          {error}
        </p>
      )}
    </>
  );

  if (compact) return <div aria-label="Astrometrie">{content}</div>;

  return (
    <section
      aria-label="Astrometrie"
      className="border border-swu-border bg-swu-surface/50 p-3 text-xs"
    >
      {content}
    </section>
  );
}
