import { useEffect, useState } from 'react';
import { shipImage } from '../../lib/assets';
import { api } from '../../services/api';
import { ShipQuickActions } from './ShipQuickActions';
import { SYSTEM_ASSETS } from './ShipControlCenter';
import { SHIP_SYSTEMS } from './ship-system-presentation';

interface ShipHeaderTableProps {
  ship: {
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
    energy: number;
    energyMax: number;
    reactorOutput: number;
    warpdrive: number;
    warpdriveMax: number;
    battery: number;
    batteryMax: number;
    warpSpeed: number;
    warpCooldown: number;
    crew: number;
    crewRequired?: number;
    crewMax: number;
    posX: number;
    posY: number;
    locationLabel?: string;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    setDraftName(ship.name);
    setError(null);
  }, [ship.id, ship.name]);

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
  const rows = [
    {
      label: 'Koordinaten',
      value: `${ship.posX}|${ship.posY}`,
      icon: 'hud1.png',
    },
    {
      label: 'Hülle',
      value: `${ship.hull}/${ship.hullMax}`,
      icon: 'integ.png',
    },
    {
      label: 'Schilde',
      value: `${ship.shields}/${ship.shieldsMax}`,
      icon: 'sb_schilde_1.png',
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
      value: `${ship.energy}/${ship.energyMax}`,
      icon: 'eps.png',
    },
    {
      label: 'Batterie',
      value: `${ship.battery}/${ship.batteryMax}`,
      icon: 'batt.png',
    },
    {
      label: 'Crew',
      value: `${ship.crew} (${ship.crewRequired ?? 0},${ship.crewMax || 'kA'})`,
      icon: 'crew.png',
      title: 'aktuell (Minimum, Maximum)',
    },
  ];

  return (
    <section
      className="overflow-hidden rounded border border-swu-border bg-swu-surface"
      aria-label="Schiffskopf"
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-center text-xs">
          <thead className="bg-black/50 text-swu-muted">
            <tr>
              <th className="border border-swu-border px-2 py-1">Typ</th>
              <th
                className="border border-swu-border px-1 py-1"
                aria-label="Alarmstufe"
              />
              {rows.map((row) => (
                <th
                  key={row.label}
                  className="border border-swu-border px-2 py-1"
                >
                  {row.label === 'Energie' ? (
                    <button
                      type="button"
                      onClick={onEnergy}
                      className="inline-flex items-center gap-1 hover:text-swu-accent focus:outline-none focus:ring-1 focus:ring-swu-accent"
                    >
                      <AssetIcon file={row.icon} />
                      {row.label}
                    </button>
                  ) : (
                    <span
                      title={row.title}
                      className="inline-flex items-center gap-1"
                    >
                      <AssetIcon file={row.icon} />
                      {row.label}
                    </span>
                  )}
                </th>
              ))}
              <th className="border border-swu-border px-2 py-1">Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-swu-border px-2 py-1">
                <img
                  src={shipImage(ship.shipClassId, ship.shipClassKey)}
                  alt={classLabel}
                  title={classLabel}
                  className="mx-auto h-9 w-16 object-contain"
                />
              </td>
              <td className="border border-swu-border px-1 py-2">
                <button
                  type="button"
                  onClick={() => setAlertOpen(true)}
                  aria-label="Alarmstufe ändern"
                  title="Alarmstufe ändern"
                  className={`size-4 border border-swu-border ${alertState === 'GREEN' ? 'bg-green-500' : alertState === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-500'}`}
                />
              </td>
              {rows.map((row) => (
                <td
                  key={row.label}
                  className={`border border-swu-border px-2 py-2 font-mono ${row.valueClassName ?? 'text-swu-primary'}`}
                >
                  {row.value}
                </td>
              ))}
              <td className="border border-swu-border px-2 py-2 text-left">
                <RenameForm
                  draftName={draftName}
                  onDraftName={setDraftName}
                  onSave={saveName}
                  saving={saving}
                  disabled={!draftName.trim() || draftName.trim() === ship.name}
                  onSelfDestruct={onSelfDestruct}
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
                          shipId={ship.id}
                          onRefresh={() => onUpdate?.()}
                          onInfo={onInfo}
                          standby={standby}
                          onNavigation={onNavigation}
                          onSensors={onSensors}
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
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-3 border-b border-swu-border/30 pb-1 last:border-b-0"
          >
            <span className="flex items-center gap-1 text-swu-muted">
              <AssetIcon file={row.icon} />
              {row.label}
            </span>
            <span
              className={`font-mono ${row.valueClassName ?? 'text-swu-primary'}`}
            >
              {row.value}
            </span>
          </div>
        ))}
        <RenameForm
          draftName={draftName}
          onDraftName={setDraftName}
          onSave={saveName}
          saving={saving}
          disabled={!draftName.trim() || draftName.trim() === ship.name}
          onSelfDestruct={onSelfDestruct}
        />
        <ShipQuickActions
          shipId={ship.id}
          onRefresh={() => onUpdate?.()}
          onInfo={onInfo}
          standby={standby}
          onNavigation={onNavigation}
          onSensors={onSensors}
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
  onSelfDestruct: () => void;
}) {
  return (
    <div className="flex min-w-[220px] items-center gap-1">
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
        disabled={saving || disabled}
        className="rounded border border-swu-accent/60 bg-swu-accent/10 px-2 py-1 text-xs font-bold text-swu-accent hover:bg-swu-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Speichere…' : 'Ändern'}
      </button>
      <button
        type="button"
        onClick={onSelfDestruct}
        className="rounded border border-red-700/70 bg-black/30 p-1 hover:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
        aria-label="Selbstzerstörung"
        title="Selbstzerstörung"
      >
        <AssetIcon file="selfdes1.png" />
      </button>
    </div>
  );
}
