import { useEffect, useState } from 'react';
import type {
  SpacecraftEnergyFlowDto,
  SpaceLocationDto,
} from '@swuniverse/shared';
import { shipImage } from '../../lib/assets';
import { api } from '../../services/api';
import { Tooltip } from '../Tooltip';
import { ShipQuickActions } from './ShipQuickActions';
import { SYSTEM_ASSETS } from './ShipControlCenter';
import { SHIP_SYSTEMS } from './ship-system-presentation';
import { validateShipName } from '@swuniverse/shared';
import { ShipName } from '../ShipName';

interface ShipHeaderTableProps {
  ship: {
    hasLastCombatReport?: boolean;
    id: number;
    name: string;
    shipClassId: number;
    shipClassName?: string;
    shipClassKey?: string | null;
    status: string;
    alertState: string;
    hull: number;
    hullMax: number;
    shields: number;
    shieldsMax: number;
    shieldRegeneration?: number;
    energy: number;
    energyMax: number;
    reactorOutput: number;
    warpdrive: number;
    warpdriveMax: number;
    battery: number;
    batteryMax: number;
    warpSpeed: number;
    crew: number;
    crewRequired?: number;
    crewMax: number;
    location: SpaceLocationDto;
    locationLabel?: string;
    region?: { id: number; name: string; description?: string | null } | null;
    adminRegion?: { key: string; name: string } | null;
    kind?: 'SHIP' | 'STATION';
    stationRole?: string | null;
    actions?: Record<string, { available: boolean }>;
  };
  onUpdate?: () => void;
  onSelfDestruct: () => void;
  onInfo: () => void;
  onEnergy: () => void;
  standby: boolean;
  alertState: 'GREEN' | 'YELLOW' | 'RED';
  onNavigation: () => void;
  onSensors: () => void;
  systems?: Record<string, { active: boolean; integrity: number }>;
  children?: React.ReactNode;
}

export function ShipHeaderTable({
  ship,
  onUpdate,
  onSelfDestruct,
  onInfo,
  onEnergy,
  standby,
  alertState,
  onNavigation,
  onSensors,
  systems,
  children,
}: ShipHeaderTableProps) {
  const [draftName, setDraftName] = useState(ship.name);
  const isConstruction =
    ship.kind === 'STATION' && ship.stationRole === 'CONSTRUCTION';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [energyFlow, setEnergyFlow] = useState<SpacecraftEnergyFlowDto | null>(
    null,
  );
  const [regionOpen, setRegionOpen] = useState(false);

  useEffect(() => {
    setDraftName(ship.name);
    setError(null);
  }, [ship.id, ship.name]);

  useEffect(() => {
    let current = true;
    setEnergyFlow(null);
    void api
      .get<SpacecraftEnergyFlowDto>(`/spacecraft/${ship.id}/energy-flow`)
      .then((flow) => {
        if (current) setEnergyFlow(flow);
      })
      .catch(() => {
        if (current) setEnergyFlow(null);
      });
    return () => {
      current = false;
    };
  }, [ship.id]);

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === ship.name) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/spacecraft/${ship.id}`, { name: nextName });
      onUpdate?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Name konnte nicht geändert werden',
      );
    } finally {
      setSaving(false);
    }
  };

  const classLabel = ship.shipClassName ?? `Klasse ${ship.shipClassId}`;
  const shieldRegeneration = ship.shieldRegeneration ?? 0;
  const crewClassName =
    ship.crew < (ship.crewRequired ?? 0)
      ? 'text-red-400'
      : ship.crew > ship.crewMax
        ? 'text-yellow-400'
        : 'text-green-400';
  const allRows = [
    {
      label: 'Koordinaten',
      value: `${ship.location.x}|${ship.location.y}`,
      region: ship.region,
      icon: 'hud1.png',
    },
    {
      label: 'Hülle',
      value: `${ship.hull}/${ship.hullMax}`,
      icon: 'integ.png',
    },
    {
      label: 'Schilde',
      value: `${ship.shields}/${ship.shieldsMax}${shieldRegeneration > 0 ? ` +${shieldRegeneration}` : ''}`,
      icon: 'sb_schilde_1.png',
      tooltip:
        'Kostenlose Schildregeneration alle 15 Minuten, wenn alle Voraussetzungen erfüllt sind: aufgerundet 10 % der maximalen Schilde, begrenzt auf die fehlenden Schilde.',
      valueClassName: systems?.SHIELDS?.active
        ? 'text-cyan-400'
        : 'text-swu-muted',
    },
    {
      label: 'Hyperantrieb',
      value: `${ship.warpdrive}/${ship.warpdriveMax}`,
      icon: 'warp1.png',
    },
    {
      label: 'Energie',
      value: energyFlow
        ? `${ship.energy}/${ship.energyMax} +${energyFlow.effectiveEpsProduction} (${energyFlow.totalSystemConsumption}/${energyFlow.reactorOutput})`
        : `${ship.energy}/${ship.energyMax}`,
      icon: 'eps.png',
      tooltip: 'Aktuell/Maximum, +Zuwachs, (Systemverbrauch/Reaktorleistung)',
    },
    {
      label: 'Batterie',
      value: `${ship.battery}/${ship.batteryMax}`,
      icon: 'batt.png',
    },
    {
      label: 'Crew',
      value: `${ship.crew} (${ship.crewRequired ?? 0}/${ship.crewMax || 'kA'})`,
      icon: 'crew.png',
      tooltip: 'Aktuell (Minimum/Maximum)',
      valueClassName: crewClassName,
    },
  ];
  // STU spacecraft.twig: warp only with a warp drive, battery only with capacity.
  const rows = allRows.filter(
    (row) =>
      (row.label !== 'Hyperantrieb' || systems?.WARPDRIVE != null) &&
      (row.label !== 'Batterie' || ship.batteryMax > 0),
  );

  return (
    <section
      className="overflow-hidden rounded border border-swu-border bg-swu-surface"
      aria-label="Schiffskopf"
      data-tutorial="ship-header"
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-center text-xs">
          <thead className="bg-black/50 text-swu-muted">
            <tr>
              <th className="border border-swu-border px-1.5 py-1">Typ</th>
              <th
                className="border border-swu-border px-1 py-1"
                aria-label="Alarmstufe"
              />
              {rows.map((row) => (
                <th
                  key={row.label}
                  className="border border-swu-border px-1.5 py-1"
                >
                  {row.label === 'Energie' ? (
                    <Tooltip content={row.tooltip}>
                      <button
                        type="button"
                        onClick={onEnergy}
                        className="inline-flex items-center gap-1 hover:text-swu-accent focus:outline-none focus:ring-1 focus:ring-swu-accent"
                      >
                        <AssetIcon file={row.icon} />
                        {row.label}
                      </button>
                    </Tooltip>
                  ) : row.tooltip ? (
                    <Tooltip content={row.tooltip}>
                      <span
                        className="inline-flex items-center gap-1"
                        tabIndex={0}
                      >
                        <AssetIcon file={row.icon} />
                        {row.label}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <AssetIcon file={row.icon} />
                      {row.label}
                    </span>
                  )}
                </th>
              ))}
              <th className="border border-swu-border px-1.5 py-1">Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-swu-border px-1.5 py-1">
                <img
                  src={shipImage(ship.shipClassId, ship.shipClassKey)}
                  alt={classLabel}
                  title={classLabel}
                  className="mx-auto h-9 w-16 object-contain"
                />
              </td>
              <td className="border border-swu-border px-1 py-2">
                {/* STU shows the alert level only with a computer (`hasComputer`). */}
                {systems?.COMPUTER && (
                  <button
                    type="button"
                    onClick={() => setAlertOpen(true)}
                    aria-label="Alarmstufe ändern"
                    data-tutorial="ship-alarm"
                    title="Alarmstufe ändern"
                    className={`size-4 border border-swu-border ${alertState === 'GREEN' ? 'bg-green-500' : alertState === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-500'}`}
                  />
                )}
              </td>
              {rows.map((row) => (
                <td
                  key={row.label}
                  className={`border border-swu-border px-1.5 py-1 font-mono text-xs ${row.valueClassName ?? 'text-swu-primary'}`}
                >
                  {row.value}
                  {row.region && (
                    <button
                      type="button"
                      onClick={() => setRegionOpen(true)}
                      className="ml-1 text-swu-primary hover:text-swu-accent hover:underline"
                    >
                      · Region: {row.region.name}
                    </button>
                  )}
                </td>
              ))}
              <td className="border border-swu-border px-2 py-2 text-left">
                <RenameForm
                  draftName={draftName}
                  onDraftName={setDraftName}
                  onSave={saveName}
                  saving={saving}
                  disabled={!draftName.trim() || draftName.trim() === ship.name}
                  onSelfDestruct={isConstruction ? undefined : onSelfDestruct}
                />
              </td>
            </tr>
            <tr>
              <td
                colSpan={rows.length + 3}
                className="border border-swu-border bg-black/20 px-2 py-1 text-left"
              >
                <table className="w-full table-fixed border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-[20%] pr-2 align-middle">
                        <ShipQuickActions
                          hasLastCombatReport={ship.hasLastCombatReport}
                          shipId={ship.id}
                          onRefresh={() => onUpdate?.()}
                          onInfo={onInfo}
                          standby={standby}
                          onNavigation={onNavigation}
                          onSensors={onSensors}
                          sensorsAvailable={systems?.LONG_RANGE_SENSORS != null}
                          repairAvailable={
                            ship.actions?.repair?.available ?? true
                          }
                          mapAvailable={
                            ship.actions?.starMap?.available ?? true
                          }
                        />
                      </td>
                      <td className="w-[24%] px-2 align-middle">{children}</td>
                      <td className="w-[36%] px-2 align-middle">
                        <HeaderSystemIcons systems={systems} />
                      </td>
                      <td className="w-[20%]" />
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 p-3 text-xs md:hidden">
        <div className="flex items-center gap-2 border-b border-swu-border/30 pb-2">
          <img
            src={shipImage(ship.shipClassId, ship.shipClassKey)}
            alt=""
            className="h-8 w-14 object-contain"
          />
          <span className="text-swu-primary">{classLabel}</span>
        </div>
        {/* Mobile counterpart of the desktop alert-level swatch (STU: only with a computer). */}
        {systems?.COMPUTER && (
          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            title="Alarmstufe ändern"
            className="flex items-center justify-between gap-3 border-b border-swu-border/30 pb-1 text-left"
          >
            <span className="text-swu-muted">Alarmstufe</span>
            <span className="flex items-center gap-2 text-swu-primary">
              <span
                className={`size-4 border border-swu-border ${alertState === 'GREEN' ? 'bg-green-500' : alertState === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-500'}`}
              />
              {alertState === 'GREEN'
                ? 'Grün'
                : alertState === 'YELLOW'
                  ? 'Gelb'
                  : 'Rot'}
              <span className="text-swu-muted">ändern</span>
            </span>
          </button>
        )}
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-3 border-b border-swu-border/30 pb-1 last:border-b-0"
          >
            {row.tooltip ? (
              <Tooltip content={row.tooltip}>
                <span
                  className="flex items-center gap-1 text-swu-muted"
                  tabIndex={0}
                >
                  <AssetIcon file={row.icon} />
                  {row.label}
                </span>
              </Tooltip>
            ) : (
              <span className="flex items-center gap-1 text-swu-muted">
                <AssetIcon file={row.icon} />
                {row.label}
              </span>
            )}
            <span
              className={`font-mono ${row.valueClassName ?? 'text-swu-primary'}`}
            >
              {row.value}
              {row.region && (
                <button
                  type="button"
                  onClick={() => setRegionOpen(true)}
                  className="ml-1 text-swu-primary hover:text-swu-accent hover:underline"
                >
                  · Region: {row.region.name}
                </button>
              )}
            </span>
          </div>
        ))}
        <RenameForm
          draftName={draftName}
          onDraftName={setDraftName}
          onSave={saveName}
          saving={saving}
          disabled={!draftName.trim() || draftName.trim() === ship.name}
          onSelfDestruct={isConstruction ? undefined : onSelfDestruct}
        />
        <ShipQuickActions
          hasLastCombatReport={ship.hasLastCombatReport}
          shipId={ship.id}
          onRefresh={() => onUpdate?.()}
          onInfo={onInfo}
          standby={standby}
          onNavigation={onNavigation}
          onSensors={onSensors}
          sensorsAvailable={systems?.LONG_RANGE_SENSORS != null}
          repairAvailable={ship.actions?.repair?.available ?? true}
          mapAvailable={ship.actions?.starMap?.available ?? true}
        />
      </div>

      {alertOpen && (
        <AlertDialog
          shipId={ship.id}
          alertState={alertState}
          onClose={() => setAlertOpen(false)}
          onUpdate={() => onUpdate?.()}
        />
      )}

      {regionOpen && ship.region && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Regionsinfo"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
        >
          <section className="w-full max-w-md border border-swu-border bg-swu-bg p-3 text-xs">
            <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
              <h3 className="font-bold text-swu-primary">{ship.region.name}</h3>
              <button type="button" onClick={() => setRegionOpen(false)}>
                Schließen
              </button>
            </header>
            <p className="whitespace-pre-wrap text-swu-muted">
              {ship.region.description ?? 'Keine Beschreibung vorhanden.'}
            </p>
            {ship.adminRegion && (
              <p className="mt-2">Verwaltungsregion: {ship.adminRegion.name}</p>
            )}
          </section>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="border-t border-red-500/30 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function HeaderSystemIcons({
  systems,
}: {
  systems?: Record<string, { active: boolean; integrity: number }>;
}) {
  const visible = SHIP_SYSTEMS.flatMap((system) => {
    const state = systems?.[system.key];
    return state ? [{ system, state }] : [];
  });
  if (visible.length === 0) return null;

  return (
    <div
      className="flex flex-wrap justify-start gap-1"
      aria-label="Systemstatus"
    >
      {visible.map(({ system, state }) => (
        <span
          key={system.key}
          title={`${system.label}: ${state.integrity}%`}
          className={`inline-flex size-8 items-center justify-center border ${state.integrity >= 75 ? 'border-emerald-400' : state.integrity >= 40 ? 'border-amber-400' : 'border-red-400'}`}
        >
          <img
            src={`/assets/system/${SYSTEM_ASSETS[system.key] ?? '1.png'}`}
            alt={system.label}
            className="size-6 object-contain"
          />
        </span>
      ))}
    </div>
  );
}

function AlertDialog({
  shipId,
  alertState,
  onClose,
  onUpdate,
}: {
  shipId: number;
  alertState: 'GREEN' | 'YELLOW' | 'RED';
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alarmstufe ändern"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-xs border border-swu-border bg-swu-bg shadow-xl">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h2 className="text-sm font-bold text-swu-primary">
            Alarmstufe ändern
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            className="text-swu-muted"
          >
            Schließen
          </button>
        </header>
        <div className="p-2">
          {(
            [
              ['GREEN', 'Grün', 'bg-green-500'],
              ['YELLOW', 'Gelb', 'bg-yellow-400'],
              ['RED', 'Rot', 'bg-red-500'],
            ] as const
          ).map(([state, label, color]) => (
            <button
              key={state}
              type="button"
              onClick={() => {
                void api
                  .patch(`/spacecraft/${shipId}/alert-state`, {
                    alertState: state,
                  })
                  .then(() => {
                    onClose();
                    onUpdate();
                  });
              }}
              aria-pressed={alertState === state}
              className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-swu-primary hover:bg-white/5"
            >
              <span className={`size-4 border border-swu-border ${color}`} />
              Alarmstufe {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AssetIcon({ file }: { file: string }) {
  return (
    <img
      src={`/assets/buttons/${file}`}
      alt=""
      className="size-4 object-contain"
    />
  );
}

function RenameForm({
  draftName,
  onDraftName,
  onSave,
  saving,
  disabled,
  onSelfDestruct,
}: {
  draftName: string;
  onDraftName: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  /** Missing on a construction, where STU offers no self-destruct. */
  onSelfDestruct?: () => void;
}) {
  const nameError = draftName.trim() ? validateShipName(draftName) : null;
  return (
    <div className="flex min-w-[220px] flex-wrap items-center gap-1">
      <label className="sr-only" htmlFor="ship-name-input">
        Schiffsname
      </label>
      <input
        id="ship-name-input"
        value={draftName}
        onChange={(event) => onDraftName(event.target.value)}
        className="min-w-0 flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-primary focus:border-swu-accent focus:outline-none"
        aria-label="Schiffsname"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled || !!nameError}
        className="rounded border border-swu-accent/60 bg-swu-accent/10 px-2 py-1 text-xs font-bold text-swu-accent hover:bg-swu-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Speichere…' : 'Ändern'}
      </button>
      {draftName.includes('[') && (
        <div className="basis-full text-xs">
          Vorschau: <ShipName name={draftName} />
          {nameError && <span className="ml-2 text-red-300">{nameError}</span>}
        </div>
      )}
      {onSelfDestruct && (
        <button
          type="button"
          onClick={onSelfDestruct}
          className="rounded border border-red-700/70 bg-black/30 p-1 hover:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          aria-label="Selbstzerstörung"
          title="Selbstzerstörung"
        >
          <AssetIcon file="selfdes1.png" />
        </button>
      )}
    </div>
  );
}
