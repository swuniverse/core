import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { DirectionalControls } from './DirectionalControls';
import { LssMap } from './LssMap';
import type { LocalMapResponse, NearbyShip } from './LssMap';

interface Ship {
  id: number;
  name: string;
  status: string;
  energy: number;
  energyMax: number;
  arrivalAt: string | null;
}

interface NavigationPanelProps {
  ship: Ship;
  onShipUpdate: () => void;
  onLocalMapChange?: (localMap: LocalMapResponse | null) => void;
}

interface CombatLogEntry {
  action: string;
  source: 'attacker' | 'defender';
  value?: number;
  detail?: string;
}

interface CombatRoundResult {
  round: number;
  attackerShields: number;
  defenderShields: number;
  attackerHull: number;
  defenderHull: number;
  log: CombatLogEntry[];
}

interface CombatResult {
  rounds: CombatRoundResult[];
  winner: 'attacker' | 'defender' | 'draw' | 'escaped';
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
}

export function NavigationPanel({
  ship,
  onShipUpdate,
  onLocalMapChange,
}: NavigationPanelProps) {
  const [localMap, setLocalMap] = useState<LocalMapResponse | null>(null);
  const [navTarget, setNavTarget] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [navMessage, setNavMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [stepSize, setStepSize] = useState(1);
  const [loading, setLoading] = useState(true);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [combatTarget, setCombatTarget] = useState<string | null>(null);
  const [attacking, setAttacking] = useState(false);

  const fetchLocalMap = useCallback(async () => {
    try {
      setMapError(null);
      const data = await api.get<LocalMapResponse>(
        `/spacecraft/${ship.id}/local-map`,
      );
      setLocalMap(data);
      onLocalMapChange?.(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sensordaten konnten nicht geladen werden';
      setMapError(message);
      setLocalMap(null);
      onLocalMapChange?.(null);
    }
    setLoading(false);
  }, [onLocalMapChange, ship.id]);

  useEffect(() => {
    setLoading(true);
    setNavTarget(null);
    setNavMessage(null);
    void fetchLocalMap();
  }, [fetchLocalMap]);

  useEffect(() => {
    if (ship.status !== 'IN_FLIGHT') return;
    const interval = setInterval(() => {
      void fetchLocalMap();
      onShipUpdate();
    }, 5000);
    return () => clearInterval(interval);
  }, [ship.status, fetchLocalMap, onShipUpdate]);

  const handleFly = async (targetX: number, targetY: number) => {
    setNavMessage(null);
    try {
      if (localMap?.mode === 'system') {
        await api.post(`/spacecraft/${ship.id}/navigate`, { targetX, targetY });
      } else {
        await api.post(`/spacecraft/${ship.id}/fly`, { targetX, targetY });
      }
      setNavTarget(null);
      setNavMessage('Position aktualisiert');
      await onShipUpdate();
      await fetchLocalMap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Fliegen';
      setNavMessage(msg);
    }
  };

  const handleDirectionalMove = (dx: number, dy: number) => {
    if (!localMap) return;
    const targetX = localMap.shipX + dx * stepSize;
    const targetY = localMap.shipY + dy * stepSize;
    void handleFly(targetX, targetY);
  };

  const handleFieldClick = (x: number, y: number) => {
    if (ship.status !== 'DOCKED' || !localMap) return;
    if (x === localMap.shipX && y === localMap.shipY) return;
    setNavTarget({ x, y });
    setNavMessage(null);
  };

  const handleEnterSystem = async () => {
    setNavMessage(null);
    try {
      await api.post(`/spacecraft/${ship.id}/enter-system`, {});
      setNavMessage('System betreten');
      setNavTarget(null);
      onShipUpdate();
      await fetchLocalMap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      setNavMessage(msg);
    }
  };

  const handleLeaveSystem = async () => {
    setNavMessage(null);
    try {
      await api.post(`/spacecraft/${ship.id}/leave-system`, {});
      setNavMessage('System verlassen');
      setNavTarget(null);
      onShipUpdate();
      await fetchLocalMap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      setNavMessage(msg);
    }
  };

  const handleAttack = async (target: NearbyShip) => {
    setAttacking(true);
    setCombatTarget(target.name);
    setCombatResult(null);
    try {
      const result = await api.post<CombatResult>('/combat/attack', {
        attackerId: ship.id,
        targetId: target.id,
      });
      setCombatResult(result);
      onShipUpdate();
      await fetchLocalMap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kampf fehlgeschlagen';
      setNavMessage(msg);
    } finally {
      setAttacking(false);
    }
  };

  const shipsOnSameField: NearbyShip[] =
    localMap?.ships?.filter((s) => s.onSameField) ?? [];

  if (loading) {
    return (
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <span className="text-xs text-swu-muted">Lade Sensordaten...</span>
      </div>
    );
  }

  if (!localMap) {
    return (
      <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
        <p className="text-xs text-red-300">Keine Kartendaten verfügbar.</p>
        {mapError && <p className="mt-1 text-[11px] text-red-200/80">{mapError}</p>}
      </div>
    );
  }

  const isDocked = ship.status === 'DOCKED';
  const isFlying = ship.status === 'IN_FLIGHT';

  return (
    <section className="rounded border border-swu-border bg-swu-surface/80 p-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-swu-border/60 pb-1">
        <h3 className="text-xs font-bold tracking-wide text-swu-primary">
          LSS · {localMap.mode === 'system' ? localMap.systemName : 'Galaxie'} · R{localMap.sensorRange}
        </h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-swu-muted">
          <span>POS [{localMap.shipX},{localMap.shipY}]</span>
          <span>E {ship.energy}/{ship.energyMax}</span>
          {isFlying && <span className="text-amber-400">IM FLUG</span>}
          {navMessage && <span className="text-emerald-400">{navMessage}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <LssMap
          localMap={localMap}
          navTarget={navTarget}
          onFieldClick={handleFieldClick}
        />

        <div className="flex min-w-[150px] flex-col items-center gap-2 pt-4">
          <DirectionalControls
            onMove={handleDirectionalMove}
            stepSize={stepSize}
            onStepChange={setStepSize}
            disabled={!isDocked}
          />

          <div className="w-full space-y-1.5">
            {localMap.canEnterSystem && (
              <button
                onClick={() => void handleEnterSystem()}
                disabled={!isDocked}
                className="w-full rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
              >
                System betreten
              </button>
            )}
            {localMap.canLeaveSystem && (
              <button
                onClick={() => void handleLeaveSystem()}
                disabled={!isDocked}
                className="w-full rounded border border-sky-500/60 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
              >
                System verlassen
              </button>
            )}
            {navTarget && isDocked && (
              <button
                onClick={() => void handleFly(navTarget.x, navTarget.y)}
                className="w-full rounded bg-swu-accent px-2 py-1.5 text-xs font-bold text-black hover:bg-swu-accent/80"
              >
                Fliegen [{navTarget.x},{navTarget.y}]
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ships on same field — Combat interaction */}
      {shipsOnSameField.length > 0 && (
        <div className="border-t border-swu-border/50 pt-3">
          <h4 className="text-[10px] font-bold text-swu-muted uppercase mb-2">
            Schiffe auf diesem Feld
          </h4>
          <div className="space-y-1">
            {shipsOnSameField.map((target) => (
              <div
                key={target.id}
                className="flex items-center justify-between bg-swu-bg/50 border border-swu-border/50 rounded px-2 py-1.5"
              >
                <div>
                  <span className="text-xs font-bold text-red-300">
                    {target.name}
                  </span>
                  <span className="text-[10px] text-swu-muted ml-2">
                    ({target.username || 'Unknown'})
                  </span>
                </div>
                <button
                  onClick={() => void handleAttack(target)}
                  disabled={!isDocked || attacking}
                  className="px-2 py-0.5 rounded border border-red-500/60 bg-red-500/10 text-[10px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                >
                  {attacking ? '...' : 'Angreifen'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combat Result Modal */}
      {combatResult && (
        <div className="border-t border-swu-border/50 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold text-swu-muted uppercase">
              Kampfbericht vs. {combatTarget}
            </h4>
            <button
              onClick={() => setCombatResult(null)}
              className="text-[10px] text-swu-muted hover:text-swu-primary"
            >
              Schliessen
            </button>
          </div>
          <div className="text-xs mb-2">
            <span
              className={`font-bold ${
                combatResult.winner === 'attacker'
                  ? 'text-green-400'
                  : combatResult.winner === 'defender'
                    ? 'text-red-400'
                    : combatResult.winner === 'escaped'
                      ? 'text-amber-400'
                      : 'text-swu-muted'
              }`}
            >
              {combatResult.winner === 'attacker'
                ? 'SIEG'
                : combatResult.winner === 'defender'
                  ? 'NIEDERLAGE'
                  : combatResult.winner === 'escaped'
                    ? 'FLUCHT'
                    : 'UNENTSCHIEDEN'}
            </span>
            <span className="text-swu-muted ml-2">
              {combatResult.rounds.length} Runden
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {combatResult.rounds.map((round) => (
              <div
                key={round.round}
                className="bg-swu-bg/30 border border-swu-border/30 rounded p-1.5"
              >
                <div className="flex items-center gap-3 text-[10px] text-swu-muted mb-0.5">
                  <span>R{round.round}</span>
                  <span className="text-red-300">
                    H:{round.attackerHull} S:{round.attackerShields}
                  </span>
                  <span className="text-blue-300">
                    H:{round.defenderHull} S:{round.defenderShields}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {round.log.map((entry, i) => (
                    <span
                      key={i}
                      className={`text-[9px] px-1 rounded ${
                        entry.source === 'attacker'
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-red-900/30 text-red-300'
                      }`}
                    >
                      {entry.action}
                      {entry.value ? ` ${entry.value}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
