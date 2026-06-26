import { useState } from 'react';
import type { ColonyDetailV2 } from '../types';

// ─── Panel: Crew ─────────────────────────────────────────────

export function PanelCrew({
  crew,
  orbitShips,
  onQueueCrewTraining,
  onAssignCrewToShip,
  onUnassignCrewFromShip,
  onLandShip: _onLandShip,
  onDisassembleShip: _onDisassembleShip,
}: {
  crew: NonNullable<ColonyDetailV2['crew']>;
  orbitShips: ColonyDetailV2['orbitShips'];
  onQueueCrewTraining: (amount: number) => Promise<void> | void;
  onAssignCrewToShip: (shipId: number, amount: number) => Promise<void> | void;
  onUnassignCrewFromShip: (
    shipId: number,
    amount: number,
  ) => Promise<void> | void;
  onLandShip: (shipId: number) => Promise<void> | void;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const train = async () => {
    setBusy(true);
    setError(null);
    try {
      await onQueueCrewTraining(amount);
      setAmount(1);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Crew-Ausbildung fehlgeschlagen',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Crew-Übersicht
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
          <div>
            Kolonie:{' '}
            <span className="text-swu-primary font-mono">
              {crew.assignedToColony}/{crew.localLimit}
            </span>
          </div>
          <div>
            In Ausbildung:{' '}
            <span className="text-swu-primary font-mono">
              {crew.inTraining}
            </span>
          </div>
          <div>
            Global:{' '}
            <span className="text-swu-primary font-mono">
              {crew.globalLimit}
            </span>
          </div>
          <div>
            Verbleibend:{' '}
            <span className="text-swu-primary font-mono">
              {crew.remainingGlobal}
            </span>
          </div>
          <div>
            Jetzt trainierbar:{' '}
            <span className="text-swu-primary font-mono">
              {crew.trainableNow}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          {crew.trainingFacility?.mode === 'ACADEMY'
            ? 'Akademie'
            : 'Koloniezentrale'}
        </div>
        {crew.trainingFacility?.mode === 'CENTRAL' && (
          <div className="text-[10px] text-swu-muted">
            Begrenzte Grundausbildung über die Koloniezentrale: maximal 2 Crew
            gleichzeitig.
          </div>
        )}
        {crew.trainingFacility && !crew.trainingFacility.active && (
          <div className="text-[10px] text-yellow-400">
            Ausbildungsgebäude vorhanden, aber nicht aktiv.
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, crew.trainableNow)}
            value={amount}
            onChange={(e) =>
              setAmount(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-24 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
          />
          <button
            onClick={train}
            disabled={
              busy ||
              crew.trainableNow <= 0 ||
              crew.trainingFacility?.active === false
            }
            className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 disabled:opacity-40"
          >
            {busy ? '...' : 'Ausbilden'}
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Orbit-Crew
        </div>
        <div className="space-y-1 mb-2">
          {orbitShips.length === 0 ? (
            <div className="text-swu-muted">Keine Schiffe im Orbit.</div>
          ) : (
            orbitShips.map((ship) => (
              <div
                key={ship.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    Crew {ship.crew}/{ship.crewRequired} · Max {ship.crewMax}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAssignCrewToShip(ship.id, 1)}
                    disabled={crew.available <= 0 || ship.crew >= ship.crewMax}
                    className="px-2 py-1 rounded bg-swu-accent/15 text-swu-accent disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onUnassignCrewFromShip(ship.id, 1)}
                    disabled={ship.crew <= 0}
                    className="px-2 py-1 rounded bg-red-500/10 text-red-300 disabled:opacity-40"
                  >
                    -
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Warteschlange
        </div>
        {crew.trainingQueue.length === 0 ? (
          <div className="text-swu-muted">Keine aktive Ausbildung.</div>
        ) : (
          <div className="space-y-1">
            {crew.trainingQueue.map((job) => (
              <div
                key={job.id}
                className="flex justify-between border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <span className="text-swu-primary">{job.amount} Crew</span>
                <span className="text-swu-muted">
                  bis {new Date(job.finishesAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
