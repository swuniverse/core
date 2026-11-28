import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SpacecraftDetailDto,
  SpacecraftDockResultDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { DockResult } from './DockResult';
import { TransferDialog } from './TransferDialog';
import { ShipName } from '../ShipName';
import { stripShipNameBbCode } from '@swuniverse/shared';

type DockingPanelProps = {
  ship: SpacecraftDetailDto;
  onChanged: () => Promise<void> | void;
};

/** Undocking controls: a docked ship leaves its station, a station releases its ships. */
export function DockingPanel({ ship, onChanged }: DockingPanelProps) {
  const [result, setResult] = useState<SpacecraftDockResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState<{
    target: { id: number; name: string };
    direction: 'TO_TARGET' | 'FROM_TARGET';
  } | null>(null);

  async function run(path: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.post<SpacecraftDockResultDto>(path, {}));
      await onChanged();
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Abdocken fehlgeschlagen',
      );
    } finally {
      setBusy(false);
    }
  }

  const isStation = ship.kind === 'STATION';
  const docked = ship.dockedShips ?? [];
  if (!isStation && ship.dockedAtId == null) return null;

  return (
    <section className="mt-2 border border-swu-border bg-swu-surface text-xs">
      <header className="flex items-center justify-between border-b border-swu-border bg-black/30 px-3 py-2">
        <h2 className="font-bold text-swu-primary">
          {isStation ? 'Angedockte Schiffe' : 'Angedockt'}
          {isStation && (
            <span className="ml-2 font-normal text-swu-muted">
              {docked.length}/{ship.dockCapacity ?? 0}
            </span>
          )}
        </h2>
        {isStation && docked.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(`/spacecraft/${ship.id}/docked/undock-all`)}
            className="border border-swu-border px-2 py-0.5 font-normal disabled:opacity-40"
          >
            Alle abdocken
          </button>
        )}
      </header>
      {result && <DockResult result={result} />}
      {error && (
        <p role="alert" className="px-3 py-2 text-red-300">
          {error}
        </p>
      )}
      {isStation ? (
        docked.length > 0 ? (
          <ul>
            {docked.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/50 px-3 py-2 last:border-0"
              >
                <Link
                  to={`/spacecraft/${entry.id}`}
                  className="text-swu-primary"
                >
                  <ShipName name={entry.name} />
                </Link>
                <span className="flex items-center gap-2">
                  {entry.shipClassName} · Hülle {entry.hull}/{entry.hullMax}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        `/spacecraft/${ship.id}/docked/${entry.id}/undock`,
                      )
                    }
                    className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
                  >
                    {`${stripShipNameBbCode(entry.name)} abdocken`}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransfer({ target: entry, direction: 'TO_TARGET' })
                    }
                    title={`Fracht an ${entry.name} beamen`}
                  >
                    <img
                      src="/assets/buttons/b_down1.png"
                      alt={`Fracht an ${entry.name} beamen`}
                      className="inline size-4"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransfer({ target: entry, direction: 'FROM_TARGET' })
                    }
                    title={`Fracht von ${entry.name} beamen`}
                  >
                    <img
                      src="/assets/buttons/b_up1.png"
                      alt={`Fracht von ${entry.name} beamen`}
                      className="inline size-4"
                    />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-swu-muted">Keine Schiffe angedockt</p>
        )
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span>
            Angedockt an{' '}
            <Link
              to={`/spacecraft/${ship.dockedAtId}`}
              className="text-swu-primary"
            >
              {ship.dockedAtName ?? 'Station'}
            </Link>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(`/spacecraft/${ship.id}/undock`)}
            className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
          >
            Abdocken (1 Energie)
          </button>
        </div>
      )}
      {transfer && (
        <TransferDialog
          shipId={ship.id}
          targetShipId={transfer.target.id}
          targetName={stripShipNameBbCode(transfer.target.name)}
          direction={transfer.direction}
          onClose={() => setTransfer(null)}
          onTransfer={() => void onChanged()}
        />
      )}
    </section>
  );
}
