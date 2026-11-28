import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpacecraftDetailDto, StationRepairDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { ShipName } from '../ShipName';

const REPAIRING_ROLES = ['SHIPYARD', 'BASE'];

const STATUS_LABEL = { ACTIVE: 'In Reparatur', WAITING: 'Wartet', STOPPED: 'Angehalten' } as const;

/** Repair queue for docked ships and the passive self-repair of a station (STU `shipRepair.twig`). */
export function StationRepairPanel({
  ship,
  onChanged,
}: {
  ship: SpacecraftDetailDto;
  onChanged?: () => Promise<void> | void;
}) {
  const [overview, setOverview] = useState<StationRepairDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const relevant = ship.kind === 'STATION';

  const load = useCallback(async () => {
    setOverview(await api.get<StationRepairDto>(`/spacecraft/${ship.id}/station-repair`));
  }, [ship.id]);

  useEffect(() => {
    if (!relevant) return;
    load().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : 'Reparaturdaten nicht ladbar'),
    );
  }, [relevant, load]);

  if (!relevant || !overview) {
    return error ? (
      <p role="alert" className="mt-2 px-3 py-1 text-xs text-red-300">
        {error}
      </p>
    ) : null;
  }

  const showQueue =
    REPAIRING_ROLES.includes(ship.stationRole ?? '') &&
    (overview.queue.length > 0 || overview.repairable.length > 0);
  const showSelf = overview.selfRepair.needed || overview.selfRepair.active;
  if (!showQueue && !showSelf) return null;

  async function run(action: () => Promise<{ message: string }>) {
    setBusy(true);
    setError(null);
    try {
      setMessage((await action()).message);
      await load();
      await onChanged?.();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  const base = `/spacecraft/${ship.id}/station-repair`;
  const stopped = overview.queue.some((job) => job.status === 'STOPPED');
  const { selfRepair } = overview;

  return (
    <section className="mt-2 border border-swu-border bg-swu-surface text-xs">
      <header className="flex items-center justify-between border-b border-swu-border bg-black/30 px-3 py-2">
        <h2 className="font-bold text-swu-primary">Reparatur</h2>
        {stopped && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => api.post<{ message: string }>(`${base}/reactivate`, {}))}
            className="border border-swu-border px-2 py-0.5 font-normal disabled:opacity-40"
          >
            Warteschlange reaktivieren
          </button>
        )}
      </header>
      {message && (
        <p role="status" className="px-3 py-2 text-swu-muted">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="px-3 py-2 text-red-300">
          {error}
        </p>
      )}
      {showSelf && (
        <div className="flex items-center justify-between gap-2 border-b border-swu-border/50 px-3 py-2">
          <span>
            Stationsreparatur: {selfRepair.active ? 'läuft' : 'inaktiv'}
            <span className="ml-2 text-swu-muted">
              Workbees {selfRepair.workbees.docked}/{selfRepair.workbees.required}
            </span>
          </span>
          {!selfRepair.active && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => api.post<{ message: string }>(`${base}/self`, {}))}
              className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
            >
              Station reparieren
            </button>
          )}
        </div>
      )}
      {overview.queue.length > 0 && (
        <ul>
          {overview.queue.map((job) => (
            <li
              key={job.shipId}
              className="flex items-center justify-between gap-2 border-b border-swu-border/50 px-3 py-2 last:border-0"
            >
              <span>
                <Link to={`/spacecraft/${job.shipId}`} className="text-swu-primary">
                  {job.name}
                </Link>
                <span className="ml-2 text-swu-muted">
                  {job.hull}/{job.hullMax} · {STATUS_LABEL[job.status]} · {job.steps} Schritte
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                aria-label={`Reparatur von ${job.name} abbrechen`}
                onClick={() =>
                  void run(() => api.delete<{ message: string }>(`${base}/${job.shipId}`))
                }
                className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
              >
                Abbrechen
              </button>
            </li>
          ))}
        </ul>
      )}
      {overview.repairable.length > 0 && (
        <ul>
          {overview.repairable.map((entry) => (
            <li
              key={entry.shipId}
              className="flex items-center justify-between gap-2 border-b border-swu-border/50 px-3 py-2 last:border-0"
            >
              <span>
                <ShipName name={entry.name} />
                <span className="ml-2 text-swu-muted">
                  {entry.hull}/{entry.hullMax} · {entry.steps} Schritte
                </span>
              </span>
              <button
                type="button"
                disabled={busy || !overview.canRepairShips}
                aria-label={`${entry.name} reparieren`}
                onClick={() =>
                  void run(() => api.post<{ message: string }>(`${base}/${entry.shipId}`, {}))
                }
                className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
              >
                Reparieren
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
