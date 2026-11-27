import { NavicomputerJumpPanel } from './NavicomputerJumpPanel';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CartographyPlanDto,
  type CombatReportDto,
  type MovementResultDto,
  type MovementStopReason,
  type SpaceLocationDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { shipCursorImage } from '../../lib/assets';
import { CombatReportDialog } from './CombatReportDialog';
import { tutorialEvent } from '../tutorial/useTutorial';
import { DirectionalControls, HUNTER_SIGNAL_STYLE } from './DirectionalControls';
import { LssMap } from './LssMap';
import type { LocalMapResponse } from './LssMap';

interface Ship {
  id: number;
  name: string;
  shipClassKey?: string | null;
  fleetFlagshipClassKey?: string | null;
  status: string;
  energy: number;
  energyMax: number;
  location: SpaceLocationDto;
  runtimeSystems?: Record<
    string,
    {
      active: boolean;
      lastScanAt?: number;
      integrity?: number;
      cooldown?: number;
    }
  >;
  lssMode?: 'DISABLED' | 'TERRITORY' | 'IMPASSABLE' | 'CARTOGRAPHY';
  navigationBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

interface NavigationPanelProps {
  ship: Ship;
  onShipUpdate: () => Promise<void> | void;
  cartography?: CartographyPlanDto | null;
  onLocalMapChange?: (localMap: LocalMapResponse | null) => void;
  /** Bumped by the page after ship-affecting actions; reloads the LSS without clearing it. */
  refreshVersion?: number;
}

const STOP_MESSAGES: Record<MovementStopReason, string> = {
  ARRIVED: 'Position aktualisiert',
  ALERT_COMBAT: 'Flug durch Reaktion gestoppt',
  DESTROYED: 'Flug nach Schiffsverlusten abgebrochen',
  INSUFFICIENT_ENERGY: 'Flug mangels Energie abgebrochen',
};

export function NavigationPanel({
  ship,
  onShipUpdate,
  cartography,
  onLocalMapChange,
  refreshVersion = 0,
}: NavigationPanelProps) {
  const [localMap, setLocalMap] = useState<LocalMapResponse | null>(null);
  const hunterSignal =
    localMap?.mode === 'galaxy' ? (localMap.bountyHunterSignal ?? null) : null;
  const [navMessage, setNavMessage] = useState<string | null>(null);
  const [combatReports, setCombatReports] = useState<CombatReportDto[]>([]);
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
  // The cursor graphic faces right; turn it towards the last move.
  const lastPosition = useRef<{ scope: string; x: number; y: number } | null>(
    null,
  );
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    const scope = `${inSystem ? 'system' : 'galaxy'}:${locationId ?? ''}`;
    const previous = lastPosition.current;
    if (
      previous &&
      previous.scope === scope &&
      (previous.x !== shipX || previous.y !== shipY)
    ) {
      setHeading(
        (Math.atan2(shipY - previous.y, shipX - previous.x) * 180) / Math.PI,
      );
    }
    lastPosition.current = { scope, x: shipX, y: shipY };
  }, [inSystem, locationId, shipX, shipY]);
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
    setNavMessage(null);
    void fetchLocalMap();
  }, [
    fetchLocalMap,
    onLocalMapChange,
    ship.runtimeSystems?.LONG_RANGE_SENSORS?.active,
    ship.runtimeSystems?.TACHYON_SCANNER?.active,
    ship.runtimeSystems?.TACHYON_SCANNER?.lastScanAt,
    navigationLocationKey,
  ]);

  // Silent reload (e.g. after collecting the bounty hunter, which then moves away).
  useEffect(() => {
    if (refreshVersion === 0 || !ship.runtimeSystems?.LONG_RANGE_SENSORS?.active)
      return;
    void fetchLocalMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  useEffect(() => {
    setChangingSystem(false);
  }, [navigationLocationKey]);

  const handleFly = async (targetX: number, targetY: number) => {
    setNavMessage(null);
    setMoving(true);
    try {
      const path =
        localMap?.mode === 'system' || inSystem
          ? `/spacecraft/${ship.id}/navigate`
          : `/spacecraft/${ship.id}/fly`;
      const response = await api.post<
        { movement?: MovementResultDto } | undefined
      >(path, {
        targetX,
        targetY,
      });
      const movement = response?.movement;
      await tutorialEvent('spacecraft.flight.started');
      const reports = movement?.combatReports ?? [];
      const stop = STOP_MESSAGES[movement?.stopReason ?? 'ARRIVED'];
      setNavMessage(
        reports.length
          ? `Alarmreaktion: ${reports.length === 1 ? '1 Kampf' : `${reports.length} Kämpfe`} · ${stop}`
          : stop,
      );
      setCombatReports(reports);
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
    if (ship.status !== 'IDLE' || !localMap || changingSystem || moving) return;
    if (x === localMap.shipX && y === localMap.shipY) return;
    if (x !== localMap.shipX && y !== localMap.shipY) {
      setNavMessage('Nur geradlinige Flugrouten sind möglich');
      return;
    }
    // STU: a click on the LSS flies at once, hints live in the field tooltip.
    void handleFly(x, y);
  };

  const handleEnterSystem = async () => {
    setChangingSystem(true);
    setNavMessage('System wird betreten…');
    setLocalMap(null);
    onLocalMapChange?.(null);
    try {
      await api.post(`/spacecraft/${ship.id}/enter-system`, {});
      await onShipUpdate();
    } catch (err: unknown) {
      setNavMessage(err instanceof Error ? err.message : 'Fehler');
      setChangingSystem(false);
    }
  };

  const lssActive = ship.runtimeSystems?.LONG_RANGE_SENSORS?.active === true;
  // STU control_nav.twig: LSS controls need long range sensors (`hasLss`),
  // movement needs a warp or impulse drive (`canMove`).
  const hasLss = ship.runtimeSystems?.LONG_RANGE_SENSORS != null;
  const canMove =
    ship.runtimeSystems?.WARPDRIVE != null ||
    ship.runtimeSystems?.SUBLIGHT_DRIVE != null;
  // Open measure points are always framed on the map while a plan is active;
  // the Kartographieansicht is no longer needed to see them.
  const cartographyPoints =
    cartography?.status === 'PLANNED' &&
    (cartography.targetType === 'REGION'
      ? localMap?.mode !== 'system'
      : localMap?.mode === 'system')
      ? cartography.remainingCoordinates
      : [];
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
  const isErrorMessage =
    navMessage?.includes('fehl') ||
    navMessage?.includes('Fehler') ||
    navMessage?.includes('gestoppt') ||
    navMessage?.includes('abgebrochen');

  return (
    <section
      className="rounded-lg border border-swu-border bg-swu-surface/80 p-2"
      aria-labelledby="navigation-panel-heading"
      data-tutorial="ship-navigation"
    >
      {!inSystem &&
        ship.runtimeSystems?.HYPERSPACE_COIL &&
        (ship.runtimeSystems.HYPERSPACE_COIL.integrity ?? 0) > 0 && (
          <NavicomputerJumpPanel
            shipId={ship.id}
            cooldown={ship.runtimeSystems.HYPERSPACE_COIL.cooldown}
            disabled={
              moving ||
              changingSystem ||
              ship.status !== 'IDLE' ||
              ship.energy < 55 ||
              !ship.runtimeSystems?.WARPDRIVE?.active
            }
            onJump={async () => {
              await onShipUpdate();
              await fetchLocalMap();
            }}
          />
        )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-swu-border/60 pb-1">
        <h3
          id="navigation-panel-heading"
          className="flex items-center gap-1 text-xs font-bold tracking-wide text-swu-primary"
        >
          {hasLss && (
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
          )}
          {lssActive && localMap
            ? `LSS · ${localMap.mode === 'system' ? localMap.systemName : 'Galaxie'} · R${localMap.sensorRange}`
            : hasLss
              ? 'Navigation Applet (Langstreckensensoren aktivieren)'
              : 'Navigation'}
        </h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-swu-muted">
          <span>
            POS [{localMap?.shipX ?? blindX},{localMap?.shipY ?? blindY}]
          </span>
          <span>
            E {ship.energy}/{ship.energyMax}
          </span>
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
        canMove && (
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
        )
      ) : !localMap ? (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
          <p className="text-xs text-red-300">Keine Kartendaten verfügbar.</p>
          {mapError && (
            <p className="mt-1 text-[11px] text-red-200/80">{mapError}</p>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
          data-testid="lss-signal-frame"
          style={
            hunterSignal
              ? { boxShadow: HUNTER_SIGNAL_STYLE[hunterSignal].glow }
              : undefined
          }
        >
          <LssMap
            onScanExpired={fetchLocalMap}
            localMap={localMap}
            navTarget={null}
            cartographyPoints={cartographyPoints}
            shipCursorUrl={shipCursorImage(
              ship.fleetFlagshipClassKey ?? ship.shipClassKey,
            )}
            shipHeading={heading}
            onFieldClick={handleFieldClick}
          />

          <div className="flex w-full flex-col items-center gap-2 sm:min-w-[150px] sm:w-auto sm:pt-4">
            {canMove && (
              <DirectionalControls
                onMove={handleDirectionalMove}
                stepSize={stepSize}
                onStepChange={setStepSize}
                disabled={!isDocked || moving || changingSystem}
                signal={hunterSignal}
              />
            )}
          </div>
        </div>
      )}
      {combatReports[0] && (
        <CombatReportDialog
          report={combatReports[0]}
          onClose={() => setCombatReports((previous) => previous.slice(1))}
        />
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
