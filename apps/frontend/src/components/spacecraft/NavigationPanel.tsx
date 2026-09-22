import { useCallback, useEffect, useState } from 'react';
import type { SpaceLocationDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { DirectionalControls } from './DirectionalControls';
import { LssMap } from './LssMap';
import type { LocalMapResponse } from './LssMap';

interface Ship {
  id: number;
  name: string;
  status: string;
  energy: number;
  energyMax: number;
  arrivalAt: string | null;
  location: SpaceLocationDto;
  runtimeSystems?: Record<string, { active: boolean }>;
  navigationBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

interface NavigationPanelProps {
  ship: Ship;
  onShipUpdate: () => Promise<void> | void;
  onLocalMapChange?: (localMap: LocalMapResponse | null) => void;
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
  const [moving, setMoving] = useState(false);
  const [changingSystem, setChangingSystem] = useState(false);
  const inSystem = ship.location.scope === 'SYSTEM';
  const shipX = ship.location.x;
  const shipY = ship.location.y;
  const locationId =
    ship.location.scope === 'SYSTEM'
      ? ship.location.systemId
      : ship.location.layerId;
  const navigationLocationKey = `${inSystem ? 'system' : 'galaxy'}:${locationId ?? ''}:${shipX}:${shipY}`;

  const fetchLocalMap = useCallback(async () => {
    try {
      setMapError(null);
      const data = await api.get<LocalMapResponse>(
        `/spacecraft/${ship.id}/local-map`,
      );
      setLocalMap(data);
      onLocalMapChange?.(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Sensordaten konnten nicht geladen werden';
      setMapError(message);
      setLocalMap(null);
      onLocalMapChange?.(null);
    }
    setLoading(false);
  }, [onLocalMapChange, ship.id]);

  useEffect(() => {
    if (!ship.runtimeSystems?.LONG_RANGE_SENSORS?.active) {
      setLocalMap(null);
      onLocalMapChange?.(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLocalMap(null);
    onLocalMapChange?.(null);
    setNavTarget(null);
    setNavMessage(null);
    void fetchLocalMap();
  }, [
    fetchLocalMap,
    onLocalMapChange,
    ship.runtimeSystems?.LONG_RANGE_SENSORS?.active,
    navigationLocationKey,
  ]);

  useEffect(() => {
    setChangingSystem(false);
  }, [navigationLocationKey]);

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
    setMoving(true);
    try {
      if (localMap?.mode === 'system' || inSystem) {
        await api.post(`/spacecraft/${ship.id}/navigate`, { targetX, targetY });
      } else {
        await api.post(`/spacecraft/${ship.id}/fly`, { targetX, targetY });
      }
      setNavTarget(null);
      setNavMessage('Position aktualisiert');
      await onShipUpdate();
      await fetchLocalMap();
    } catch (err: unknown) {
      setNavMessage(err instanceof Error ? err.message : 'Fehler beim Fliegen');
    } finally {
      setMoving(false);
    }
  };

  const handleDirectionalMove = (dx: number, dy: number) => {
    const x = localMap?.shipX ?? shipX;
    const y = localMap?.shipY ?? shipY;
    void handleFly(x + dx * stepSize, y + dy * stepSize);
  };

  const handleFieldClick = (x: number, y: number) => {
    if (ship.status !== 'IDLE' || !localMap || changingSystem) return;
    if (x === localMap.shipX && y === localMap.shipY) return;
    if (x !== localMap.shipX && y !== localMap.shipY) {
      setNavMessage('Nur geradlinige Flugrouten sind möglich');
      return;
    }
    void handleFly(x, y);
  };

  const handleEnterSystem = async () => {
    setChangingSystem(true);
    setNavMessage('System wird betreten…');
    setLocalMap(null);
    onLocalMapChange?.(null);
    try {
      await api.post(`/spacecraft/${ship.id}/enter-system`, {});
      setNavTarget(null);
      await onShipUpdate();
    } catch (err: unknown) {
      setNavMessage(err instanceof Error ? err.message : 'Fehler');
      setChangingSystem(false);
    }
  };

  const lssActive = ship.runtimeSystems?.LONG_RANGE_SENSORS?.active === true;
  const blindX = shipX;
  const blindY = shipY;
  const blindBounds = ship.navigationBounds ?? {
    minX: 1,
    maxX: Number.MAX_SAFE_INTEGER,
    minY: 1,
    maxY: Number.MAX_SAFE_INTEGER,
  };

  async function toggleLss() {
    setNavMessage(null);
    try {
      await api.patch(`/spacecraft/${ship.id}/systems/LONG_RANGE_SENSORS`, {
        active: !lssActive,
      });
      await onShipUpdate();
      if (!lssActive) await fetchLocalMap();
    } catch (err: unknown) {
      setNavMessage(
        err instanceof Error
          ? err.message
          : 'Langstreckensensoren konnten nicht umgeschaltet werden',
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <span className="text-xs text-swu-muted">Lade Sensordaten…</span>
      </div>
    );
  }

  const isDocked = ship.status === 'IDLE';
  const isFlying = ship.status === 'IN_FLIGHT';
  const isErrorMessage =
    navMessage?.includes('fehl') || navMessage?.includes('Fehler');

  return (
    <section
      className="rounded border border-swu-border bg-swu-surface/80 p-2"
      aria-labelledby="navigation-panel-heading"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-swu-border/60 pb-1">
        <h3
          id="navigation-panel-heading"
          className="flex items-center gap-1 text-xs font-bold tracking-wide text-swu-primary"
        >
          <button
            type="button"
            onClick={() => void toggleLss()}
            title={
              lssActive
                ? 'Langstreckensensoren deaktivieren'
                : 'Langstreckensensoren aktivieren'
            }
            aria-label={
              lssActive
                ? 'Langstreckensensoren deaktivieren'
                : 'Langstreckensensoren aktivieren'
            }
            className="border border-swu-border p-0.5"
          >
            <img
              src={`/assets/buttons/${lssActive ? 'lss1.png' : 'lss2.png'}`}
              alt=""
              className="size-5 object-contain"
            />
          </button>
          {lssActive && localMap
            ? `LSS · ${localMap.mode === 'system' ? localMap.systemName : 'Galaxie'} · R${localMap.sensorRange}`
            : 'Navigation Applet (Langstreckensensoren aktivieren)'}
        </h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-swu-muted">
          <span>
            POS [{localMap?.shipX ?? blindX},{localMap?.shipY ?? blindY}]
          </span>
          <span>
            E {ship.energy}/{ship.energyMax}
          </span>
          {isFlying && <span className="text-amber-400">IM FLUG</span>}
          {navMessage && (
            <span
              role="status"
              className={isErrorMessage ? 'text-red-300' : 'text-emerald-400'}
            >
              {navMessage}
            </span>
          )}
        </div>
      </div>

      {!lssActive ? (
        <div className="border border-swu-border/50 bg-black/20 p-3 text-xs">
          <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-2 font-mono">
            <BlindFlightTarget
              x={blindX}
              y={blindY - 1}
              onFly={handleFly}
              disabled={!isDocked || moving || blindY <= blindBounds.minY}
              className="col-start-2 row-start-1"
            />
            <BlindFlightTarget
              x={blindX - 1}
              y={blindY}
              onFly={handleFly}
              disabled={!isDocked || moving || blindX <= blindBounds.minX}
              className="col-start-1 row-start-2"
            />
            <span className="col-start-2 row-start-2 border border-swu-accent bg-swu-accent/10 px-3 py-1 text-swu-primary">
              {blindX}|{blindY}
            </span>
            <BlindFlightTarget
              x={blindX + 1}
              y={blindY}
              onFly={handleFly}
              disabled={!isDocked || moving || blindX >= blindBounds.maxX}
              className="col-start-3 row-start-2"
            />
            <BlindFlightTarget
              x={blindX}
              y={blindY + 1}
              onFly={handleFly}
              disabled={!isDocked || moving || blindY >= blindBounds.maxY}
              className="col-start-2 row-start-3"
            />
          </div>
        </div>
      ) : !localMap ? (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
          <p className="text-xs text-red-300">Keine Kartendaten verfügbar.</p>
          {mapError && (
            <p className="mt-1 text-[11px] text-red-200/80">{mapError}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <LssMap
            localMap={localMap}
            navTarget={navTarget}
            onFieldClick={handleFieldClick}
          />

          <div className="flex w-full flex-col items-center gap-2 sm:min-w-[150px] sm:w-auto sm:pt-4">
            <DirectionalControls
              onMove={handleDirectionalMove}
              stepSize={stepSize}
              onStepChange={setStepSize}
              disabled={!isDocked || moving || changingSystem}
            />

            <div className="w-full space-y-1.5">
              {moving && (
                <p className="rounded border border-swu-accent/40 bg-swu-accent/5 p-2 text-[11px] text-swu-muted">
                  Flug wird ausgeführt…
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BlindFlightTarget({
  x,
  y,
  onFly,
  disabled,
  className = '',
}: {
  x: number;
  y: number;
  onFly: (x: number, y: number) => Promise<void>;
  disabled: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => void onFly(x, y)}
      disabled={disabled}
      aria-label={`Blindflug nach ${x}|${y}`}
      className={`border border-swu-border px-3 py-1 text-swu-primary hover:border-swu-accent disabled:opacity-40 ${className}`}
    >
      {disabled ? '-' : `${x}|${y}`}
    </button>
  );
}
