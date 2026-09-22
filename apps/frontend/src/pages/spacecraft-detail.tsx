import { useCallback, useEffect, useState } from 'react';
import type { SpacecraftDetailDto } from '@swuniverse/shared';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { NavigationPanel } from '../components/spacecraft/NavigationPanel';
import { ShipHeaderTable } from '../components/spacecraft/ShipHeaderTable';
import { ShipControlCenter } from '../components/spacecraft/ShipControlCenter';
import { ReactorPanel } from '../components/spacecraft/ReactorPanel';
import { SpacecraftMessageBar } from '../components/spacecraft/SpacecraftMessageBar';
import type { LocalMapResponse } from '../components/spacecraft/LssMap';
import { ApiError } from '../services/api';
import { ShipStoragePanel } from '../components/spacecraft/ShipStoragePanel';
import { NearbySensorPanel } from '../components/spacecraft/NearbySensorPanel';
import { FieldContextPanel } from '../components/spacecraft/FieldContextPanel';
import { ShipModulesPanel } from '../components/spacecraft/ShipModulesPanel';
import { ShipOperationsPanel } from '../components/spacecraft/ShipOperationsPanel';
import { SelfDestructPanel } from '../components/spacecraft/SelfDestructPanel';
import { SensorOperationsPanel } from '../components/spacecraft/SensorOperationsPanel';
import {
  spaceBackgroundTile,
  starTileImage,
  systemTypeImage,
} from '../lib/assets';

type Spacecraft = SpacecraftDetailDto;

export function SpacecraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ship, setShip] = useState<Spacecraft | null>(null);
  const [localMap, setLocalMap] = useState<LocalMapResponse | null>(null);
  const [fieldContext, setFieldContext] = useState<
    import('@swuniverse/shared').SpacecraftFieldContextDto | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [selfDestructOpen, setSelfDestructOpen] = useState(false);
  const [shipInfoOpen, setShipInfoOpen] = useState(false);
  const [energyFlowOpen, setEnergyFlowOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [sensorsOpen, setSensorsOpen] = useState(false);
  const [storageVersion, setStorageVersion] = useState(0);
  const [shipRefreshVersion, setShipRefreshVersion] = useState(0);

  const fetchShip = useCallback(async () => {
    const data = await api.get<Spacecraft>(`/spacecraft/${id}`);
    setShip(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchShip();
  }, [fetchShip]);

  const refreshShipAndStorage = useCallback(async () => {
    await fetchShip();
    setStorageVersion((version) => version + 1);
    setShipRefreshVersion((version) => version + 1);
  }, [fetchShip]);

  const locationKey = ship
    ? ship.inSystem
      ? `system:${ship.starSystem?.id ?? ''}:${ship.currentSystemFieldX ?? ''}:${ship.currentSystemFieldY ?? ''}`
      : `galaxy:${ship.posX}:${ship.posY}`
    : '';

  useEffect(() => {
    if (!ship || !locationKey) return;
    let current = true;
    setFieldContext(null);
    void api
      .get<import('@swuniverse/shared').SpacecraftFieldContextDto>(
        `/spacecraft/${ship.id}/field-context`,
      )
      .then((data) => {
        if (current) setFieldContext(data);
      })
      .catch(() => {
        if (current) setFieldContext(null);
      });
    return () => {
      current = false;
    };
  }, [ship?.id, locationKey]);

  useEffect(() => {
    if (ship?.status !== 'IN_FLIGHT') return;
    const interval = setInterval(() => void fetchShip(), 5000);
    return () => clearInterval(interval);
  }, [ship?.status, fetchShip]);

  if (loading)
    return (
      <div className="p-3 text-swu-muted md:p-6">Schiff wird geladen...</div>
    );

  if (!ship)
    return (
      <div className="p-3 md:p-6">
        <p className="text-swu-muted">Schiff nicht gefunden.</p>
        <Link to="/spacecraft" className="text-swu-accent text-sm">
          ← Zurück
        </Link>
      </div>
    );

  return (
    <div className="p-2 pb-[calc(56px+env(safe-area-inset-bottom,0px)+8px)] md:p-4 md:pb-4">
      <Link
        to="/spacecraft"
        className="mb-2 inline-block text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Schiffsliste
      </Link>

      <SpacecraftMessageBar shipId={ship.id} />
      <ShipHeaderTable
        ship={ship}
        onUpdate={refreshShipAndStorage}
        onSelfDestruct={() => setSelfDestructOpen(true)}
        onInfo={() => setShipInfoOpen(true)}
        onEnergy={() => setEnergyFlowOpen(true)}
        standby={ship.operatingMode === 'STANDBY'}
        alertState={ship.alertState}
        onNavigation={() => setNavigationOpen(true)}
        onSensors={() => setSensorsOpen(true)}
        systems={ship.runtimeSystems}
      >
        <ShipModulesPanel shipId={ship.id} compact />
      </ShipHeaderTable>

      <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(360px,1.2fr)_minmax(300px,0.9fr)_minmax(250px,0.75fr)] xl:items-start">
        <div id="ship-navigation">
          <NavigationPanel
            ship={ship}
            onShipUpdate={refreshShipAndStorage}
            onLocalMapChange={setLocalMap}
          />
        </div>
        <div className="space-y-2">
          <ShipControlCenter
            shipId={ship.id}
            systems={ship.runtimeSystems}
            onUpdate={refreshShipAndStorage}
          />
          <FieldContextPanel
            shipId={ship.id}
            context={fieldContext}
            onUpdate={refreshShipAndStorage}
            canColonize={ship.isColonizer === true}
            onColonized={(colonyId) =>
              navigate(`/colonies?selected=${colonyId}`)
            }
            onLanded={(colonyId) => navigate(`/colonies?selected=${colonyId}`)}
          />
        </div>
        <div className="space-y-2">
          <div id="ship-operations">
            <ShipOperationsPanel
              shipId={ship.id}
              showDetails={shipInfoOpen}
              onCloseDetails={() => setShipInfoOpen(false)}
              showEnergy={energyFlowOpen}
              onCloseEnergy={() => setEnergyFlowOpen(false)}
            />
          </div>
          <div id="ship-reactor">
            <ReactorPanel
              shipId={ship.id}
              energy={ship.energy}
              energyMax={ship.energyMax}
              reactorOutput={ship.reactorOutput}
              warpdrive={ship.warpdrive}
              warpdriveMax={ship.warpdriveMax}
              battery={ship.battery}
              batteryMax={ship.batteryMax}
              reactorFuel={ship.reactorFuel ?? 0}
              reactorFuelMax={ship.reactorFuelMax ?? 0}
              reactorWarpSplit={ship.reactorWarpSplit}
              hyperdriveActive={ship.runtimeSystems?.WARPDRIVE?.active === true}
              inSystem={ship.inSystem === true}
              onUpdate={refreshShipAndStorage}
            />
          </div>
        </div>
      </div>

      {navigationOpen && (
        <StarMapDialog
          shipId={ship.id}
          onClose={() => setNavigationOpen(false)}
        />
      )}
      <SensorOperationsPanel
        shipId={ship.id}
        open={sensorsOpen}
        onClose={() => setSensorsOpen(false)}
        onUpdate={refreshShipAndStorage}
      />

      <SelfDestructPanel
        shipId={ship.id}
        shipName={ship.name}
        destroyed={ship.status === 'DESTROYED'}
        open={selfDestructOpen}
        onClose={() => setSelfDestructOpen(false)}
        onDestroyed={() => navigate('/spacecraft')}
      />

      <NearbySensorPanel
        shipId={ship.id}
        locationKey={locationKey}
        refreshKey={shipRefreshVersion}
        systems={ship.runtimeSystems}
        onUpdate={refreshShipAndStorage}
      />
      <div className="mt-2">
        <div id="ship-storage">
          <ShipStoragePanel
            shipId={ship.id}
            cargoMax={ship.cargoMax ?? 0}
            refreshKey={storageVersion}
          />
        </div>
      </div>
    </div>
  );
}

interface StarMapField {
  id: number;
  x: number;
  y: number;
  name: string;
  passable: boolean;
  fieldTypeKey: string;
  fieldTypeId: number;
  systemTypeId?: number | null;
  tooltip: string;
}

interface StarMapData {
  center: { x: number; y: number };
  fields: StarMapField[];
}

function StarMapDialog({
  shipId,
  onClose,
}: {
  shipId: number;
  onClose: () => void;
}) {
  const [map, setMap] = useState<StarMapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StarMapData>(
        `/spacecraft/${shipId}/centred-map?sectionX=0&sectionY=0`,
      )
      .then(setMap)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Sternkarte konnte nicht geladen werden',
        ),
      );
  }, [shipId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sternkarte"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[90vh] w-full max-w-4xl overflow-auto border border-swu-border bg-swu-bg p-3 shadow-xl">
        <header className="mb-3 flex items-center justify-between border-b border-swu-border pb-2">
          <h2 className="text-sm font-bold text-swu-primary">Sternkarte</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-swu-muted"
          >
            Schließen
          </button>
        </header>
        {error ? (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        ) : !map ? (
          <p className="text-xs text-swu-muted">Sternkarte wird geladen…</p>
        ) : (
          <div
            className="grid gap-px bg-swu-border"
            style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}
          >
            {Array.from({ length: 400 }, (_, index) => {
              const x = map.center.x - 10 + (index % 20);
              const y = map.center.y - 10 + Math.floor(index / 20);
              const field = map.fields.find(
                (entry) => entry.x === x && entry.y === y,
              );
              const isShip = x === map.center.x && y === map.center.y;
              return (
                <div
                  key={`${x}-${y}`}
                  title={field?.tooltip ?? `[${x},${y}] unbekannt`}
                  className={`relative aspect-square min-w-0 overflow-hidden border border-black/20 ${isShip ? 'z-10 ring-2 ring-emerald-400' : field?.passable ? '' : 'opacity-60'}`}
                  style={{
                    backgroundImage: `url(${field?.fieldTypeKey === 'EMPTY_SPACE' ? spaceBackgroundTile(x, y) : field ? starTileImage(field.fieldTypeId) : spaceBackgroundTile(x, y)})`,
                    backgroundSize: 'cover',
                  }}
                >
                  {field?.systemTypeId && (
                    <img
                      src={systemTypeImage(field.systemTypeId)}
                      alt=""
                      className="absolute inset-0 size-full object-contain"
                    />
                  )}
                  {isShip && (
                    <span className="absolute inset-0 grid place-items-center text-sm text-emerald-300">
                      ◆
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

interface ColonizationTargetCheck {
  canColonize: boolean;
  reasons: string[];
  target: {
    id: number;
    classId: number | null;
    classGate: string | null;
    limitType: string | null;
  } | null;
}

function ColonizationPanel({
  ship,
  localMap,
  message,
  onMessage,
  onColonized,
}: {
  ship: Spacecraft;
  localMap: LocalMapResponse | null;
  message: string | null;
  onMessage: (message: string | null) => void;
  onColonized: () => void;
}) {
  const [targetCheck, setTargetCheck] =
    useState<ColonizationTargetCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const currentObject =
    localMap?.mode === 'system'
      ? localMap.fields.find(
          (field) =>
            field.sx === localMap.shipX &&
            field.sy === localMap.shipY &&
            field.celestialObject,
        )?.celestialObject
      : null;

  useEffect(() => {
    let cancelled = false;
    if (!currentObject) {
      setTargetCheck(null);
      return;
    }
    setChecking(true);
    api
      .get<ColonizationTargetCheck>(
        `/colonization/targets/${currentObject.id}?shipId=${ship.id}`,
      )
      .then((result) => {
        if (!cancelled) setTargetCheck(result);
      })
      .catch(() => {
        if (!cancelled) setTargetCheck(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentObject?.id, ship.id]);

  const canTry =
    Boolean(currentObject?.isColonizable) && Boolean(targetCheck?.canColonize);

  const colonize = async () => {
    if (!currentObject) return;
    if (
      !window.confirm(
        `${currentObject.name ?? 'Dieses Objekt'} kolonisieren? Das Kolonieschiff wird verbraucht.`,
      )
    ) {
      return;
    }
    onMessage(null);
    try {
      const result = await api.post<
        { success: true; colonyId: number; consumedShipId: number },
        { celestialObjectId: number }
      >(`/spacecraft/${ship.id}/colonize`, {
        celestialObjectId: currentObject.id,
      });
      onMessage(
        `Kolonie #${result.colonyId} gegründet. Kolonieschiff verbraucht.`,
      );
      onColonized();
    } catch (e: unknown) {
      onMessage(
        e instanceof ApiError || e instanceof Error
          ? e.message
          : 'Kolonisierung fehlgeschlagen',
      );
    }
  };

  return (
    <div className="mt-3 bg-swu-surface border border-swu-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-bold text-swu-muted uppercase">
            Kolonieschiff
          </h3>
          <p className="text-[11px] text-swu-muted">
            Tier {ship.colonizerTier ?? 1} · Ziel muss exakt auf dem aktuellen
            Systemfeld liegen.
          </p>
        </div>
        <button
          type="button"
          disabled={!canTry || checking}
          onClick={colonize}
          className="rounded bg-swu-accent px-3 py-1.5 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checking ? 'Prüfe…' : 'Kolonie gründen'}
        </button>
      </div>
      <div className="text-[11px] text-swu-muted">
        Aktuelles Ziel:{' '}
        <span className="text-swu-primary">
          {currentObject
            ? `${currentObject.name ?? 'Unbenannt'}${currentObject.isColonizable ? ' (kolonisierbar)' : ' (nicht kolonisierbar)'}`
            : 'kein Himmelskörper auf diesem Feld'}
        </span>
      </div>
      {targetCheck?.reasons && targetCheck.reasons.length > 0 && (
        <ul className="list-disc pl-5 text-[11px] text-swu-warning">
          {targetCheck.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {message && <div className="text-[11px] text-swu-accent">{message}</div>}
    </div>
  );
}
