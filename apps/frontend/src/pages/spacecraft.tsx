import { WsEventType, type SpacecraftVisibilityPayload } from '@swuniverse/shared';
import { useSocket } from '../hooks/use-socket';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SpacecraftListDto,
  SpacecraftOwnBuoyDto,
  SpacecraftListSystemDto,
} from '@swuniverse/shared';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { alertStateImage, shipImage } from '../lib/assets';
import { ShipStorageTooltip } from '../components/spacecraft/ShipStoragePanel';

const ALERT_PRESENTATION = {
  GREEN: { label: 'Grüner Alarm', className: 'bg-swu-success' },
  YELLOW: { label: 'Gelber Alarm', className: 'bg-swu-warning' },
  RED: { label: 'Roter Alarm', className: 'bg-swu-danger' },
} as const;

const SYSTEMS = [
  ['SHORT_RANGE_SENSORS', 'NBS', 'Nahbereichssensoren'],
  ['LONG_RANGE_SENSORS', 'LRS', 'Langstreckensensoren'],
  ['WEAPONS', 'W', 'Waffen'],
  ['TORPEDO_BANK', 'T', 'Torpedos'],
] as const;

const STATUS = {
  STANDBY: 'Bereitschaft',
  CARTOGRAPHY_FINALIZATION: 'Kartographie-Finalisierung',
} as const;

const cell = 'border border-swu-border px-1.5 py-1';
const numberCell = `${cell} text-right font-mono whitespace-nowrap`;
const SHIELD_REGENERATION_DESCRIPTION =
  'Kostenlose Schildregeneration alle 15 Minuten, wenn alle Voraussetzungen erfüllt sind: aufgerundet 10 % der maximalen Schilde, begrenzt auf die fehlenden Schilde.';

export function SpacecraftPage() {
  const navigate = useNavigate();
  const [ships, setShips] = useState<SpacecraftListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fleetActionPending, setFleetActionPending] = useState(false);
  const [fleetActionError, setFleetActionError] = useState<string | null>(null);
  const [fleetAlertFailures, setFleetAlertFailures] = useState<Record<number, string[]>>({});
  const [buoys, setBuoys] = useState<SpacecraftOwnBuoyDto[]>([]);

  const loadVersion = useRef(0);
  const loadShips = useCallback(async () => {
    const version = ++loadVersion.current;
    const data = await api.get<SpacecraftListDto[]>('/spacecraft');
    if (version !== loadVersion.current) return;
    setShips(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadShips();
    void api.get<SpacecraftOwnBuoyDto[]>('/spacecraft/buoys').then(setBuoys).catch(() => setBuoys([]));
  }, [loadShips]);

  useSocket(WsEventType.SPACECRAFT_VISIBILITY_CHANGED, payload => {
    const event = payload as SpacecraftVisibilityPayload;
    if (event.type === 'REMOVED') setShips(current => current.filter(ship => ship.id !== event.shipId));
    void loadShips();
  });

  useSocket(WsEventType.SPACECRAFT_EVENT, (payload) => {
    const event = payload as { type?: string; shipId?: number };
    if (event.type !== 'SHIELDS_REGENERATED') return;
    void loadShips();
  });

  const fleets = useMemo(() => {
    const grouped = new Map<number, SpacecraftListDto[]>();
    for (const ship of ships) {
      if (ship.fleetId == null) continue;
      const members = grouped.get(ship.fleetId) ?? [];
      members.push(ship);
      grouped.set(ship.fleetId, members);
    }
    return [...grouped.entries()].map(([id, members]) => ({
      id,
      name: members[0].fleetName ?? `Flotte ${id}`,
      leaderId: members[0].fleetLeaderId,
      sort: members[0].fleetSort ?? 0,
      isHidden: members[0].fleetIsHidden ?? false,
      members: [...members].sort((a, b) =>
        a.id === members[0].fleetLeaderId ? -1 : b.id === members[0].fleetLeaderId ? 1 : a.id - b.id,
      ),
    })).sort((a, b) => b.sort - a.sort || a.id - b.id);
  }, [ships]);
  const stations = ships.filter((ship) => ship.kind === 'STATION');
  const mobileShips = ships.filter((ship) => ship.kind !== 'STATION');
  const singles = mobileShips.filter((ship) => ship.fleetId == null);

  // STU shiplist: the last cell creates, leaves or dissolves a fleet.
  async function changeFleet(ship: SpacecraftListDto) {
    if (fleetActionPending) return;
    setFleetActionPending(true);
    setFleetActionError(null);
    try {
      if (ship.fleetId == null) {
        await api.post('/spacecraft/fleets/create', { name: 'Flotte', leaderId: ship.id });
      } else if (ship.fleetLeaderId === ship.id) {
        await api.delete(`/spacecraft/fleets/${ship.fleetId}`);
      } else {
        await api.post(`/spacecraft/${ship.id}/leave-fleet`, {});
      }
      await loadShips();
    } catch (error) {
      setFleetActionError(error instanceof Error ? error.message : 'Flottenaktion fehlgeschlagen');
    } finally {
      setFleetActionPending(false);
    }
  }

  async function renameFleet(id: number, currentName: string) {
    const name = window.prompt('Neuer Flottenname', currentName)?.trim();
    if (!name || name === currentName) return;
    await api.patch(`/spacecraft/fleets/${id}`, { name });
    await loadShips();
  }

  async function dissolveFleet(id: number, name: string) {
    if (!window.confirm(`Flotte „${name}“ wirklich auflösen?`)) return;
    await api.delete(`/spacecraft/fleets/${id}`);
    await loadShips();
  }

  async function setFleetAlertState(
    fleetId: number,
    alertState: SpacecraftListDto['alertState'],
  ) {
    const result = await api.patch<{
      failed: Array<{ shipName: string; reason: string }>;
    }>(`/spacecraft/fleets/${fleetId}/alert-state`, { alertState });
    setFleetAlertFailures((current) => ({
      ...current,
      [fleetId]: result.failed.map(({ shipName, reason }) => `${shipName}: ${reason}`),
    }));
    await loadShips();
  }

  async function updateFleetList(fleetId: number, isHidden?: boolean) {
    if (fleetActionPending) return;
    setFleetActionPending(true);
    setFleetActionError(null);
    try {
      if (isHidden === undefined)
        await api.post(`/spacecraft/fleets/${fleetId}/prioritize`, {});
      else
        await api.patch(`/spacecraft/fleets/${fleetId}/visibility`, {
          isHidden,
        });
      await loadShips();
    } catch (error: unknown) {
      setFleetActionError(
        error instanceof Error ? error.message : 'Flottenpflege fehlgeschlagen',
      );
    } finally {
      setFleetActionPending(false);
    }
  }

  if (loading) return <div className="p-3 text-swu-muted md:p-6">Flotte wird geladen...</div>;

  return (
    <div className="space-y-3 p-3 md:p-6" data-tutorial="ship-list">
      <div className="border border-swu-border bg-black/30 px-3 py-1.5">
        <h1 className="text-xs font-bold text-swu-primary">/ Schiffe / Flotte</h1>
      </div>
      {fleetActionError && <p role="alert" className="border border-swu-danger px-3 py-2 text-xs text-red-400">{fleetActionError}</p>}
      {fleets.map((fleet) => (
        <ShipTable
          key={fleet.id}
          title={fleet.name}
          ships={fleet.members}
          leaderId={fleet.leaderId}
          collapsed={fleet.isHidden}
          actions={(
            <>
              <span>{fleet.members.length} {fleet.members.length === 1 ? 'Schiff' : 'Schiffe'}</span>
              <button type="button" disabled={fleetActionPending} aria-label={`${fleet.name} ${fleet.isHidden ? 'einblenden' : 'ausblenden'}`} aria-expanded={!fleet.isHidden} className="border border-swu-border px-2 py-1 text-swu-primary disabled:opacity-40" onClick={() => void updateFleetList(fleet.id, !fleet.isHidden)}>{fleet.isHidden ? 'Einblenden' : 'Ausblenden'}</button>
              <button type="button" disabled={fleetActionPending} aria-label={`${fleet.name} nach oben`} className="border border-swu-border px-2 py-1 text-swu-primary disabled:opacity-40" onClick={() => void updateFleetList(fleet.id)}>Nach oben</button>
              <div className="flex items-center gap-1">
                {(['GREEN', 'YELLOW', 'RED'] as const).map((alertState) => {
                  const active = fleet.members.every((member) => member.alertState === alertState);
                  return (
                    <button
                      key={alertState}
                      type="button"
                      aria-label={`Alarmstufe ${alertState === 'GREEN' ? 'Grün' : alertState === 'YELLOW' ? 'Gelb' : 'Rot'} für ${fleet.name}`}
                      title={`Alarmstufe ${alertState === 'GREEN' ? 'Grün' : alertState === 'YELLOW' ? 'Gelb' : 'Rot'}`}
                      className={active ? 'ring-1 ring-swu-primary' : 'opacity-60 hover:opacity-100'}
                      onClick={() => void setFleetAlertState(fleet.id, alertState)}
                    >
                      <img src={alertStateImage(alertState, active)} alt="" className="size-4" />
                    </button>
                  );
                })}
              </div>
              <button type="button" className="text-swu-primary hover:underline" onClick={() => void renameFleet(fleet.id, fleet.name)}>Umbenennen</button>
              <button type="button" className="text-red-400 hover:underline" onClick={() => void dissolveFleet(fleet.id, fleet.name)}>Auflösen</button>
            </>
          )}
          message={fleetAlertFailures[fleet.id]?.join('\n')}
          onFleet={(ship) => void changeFleet(ship)}
onOpen={(id) => navigate(`/spacecraft/${id}`)}
        />
      ))}
      <StationTable stations={stations} onOpen={(id) => navigate(`/spacecraft/${id}`)} />
      <ShipTable
        title="Einzelschiffe"
        ships={singles}
        emptyLabel={ships.length === 0 ? 'Du besitzt derzeit keine Schiffe' : 'Alle Schiffe sind einer Flotte zugeordnet'}
        onFleet={(ship) => void changeFleet(ship)}
onOpen={(id) => navigate(`/spacecraft/${id}`)}
      />
      <BuoyTable buoys={buoys} />
    </div>
  );
}

const STATION_ROLES: Record<string, string> = {
  CONSTRUCTION: 'Konstrukt',
  DEPOT_SMALL: 'Versorgungsdepot',
  DEPOT_LARGE: 'Logistikzentrum',
  SHIPYARD: 'Raumwerft',
  SENSOR: 'Sensorphalanx',
  OUTPOST: 'Außenposten',
  BASE: 'Raumstation',
};

function BuoyTable({ buoys }: { buoys: SpacecraftOwnBuoyDto[] }) {
  return (
    <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
      <header className="border-b border-swu-border bg-black/30 px-3 py-2 text-xs">
        <h2 className="font-bold text-swu-primary">Bojen</h2>
      </header>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-black/40 text-center font-bold text-swu-primary"><th className={cell}>Botschaft</th><th className={cell} title="im System (außerhalb)">x|y</th></tr></thead>
        <tbody>{buoys.length === 0
          ? <tr><td colSpan={2} className={`${cell} py-4 text-center text-swu-muted`}>Du hast keine Bojen ausgelegt</td></tr>
          : buoys.map((buoy) => <tr key={buoy.id}><td className={`${cell} break-words`}>{buoy.text}</td><td className={numberCell}>{buoy.sector}</td></tr>)}
        </tbody>
      </table>
    </section>
  );
}

function StationTable({ stations, onOpen }: { stations: SpacecraftListDto[]; onOpen: (id: number) => void }) {
  return (
    <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
      <header className="border-b border-swu-border bg-black/30 px-3 py-2 text-xs">
        <h2 className="font-bold text-swu-primary">Stationen</h2>
      </header>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-black/40 text-center font-bold text-swu-primary">{['Klasse', 'Name', 'Rolle', 'Position', 'Hülle', 'Schilde', 'EPS', 'Crew', 'Andockbelegung'].map((heading) => <th key={heading} className={cell}>{heading}</th>)}</tr></thead>
        <tbody>{stations.length === 0 ? <tr><td colSpan={9} className={`${cell} py-4 text-center text-swu-muted`}>Du besitzt derzeit keine Stationen</td></tr> : stations.map((station) => {
          const location = station.location.scope === 'SYSTEM'
            ? `${station.location.galaxyX ?? 0}|${station.location.galaxyY ?? 0} (${station.location.x}|${station.location.y})`
            : `${station.location.x}|${station.location.y}`;
          return <tr key={station.id} onClick={() => onOpen(station.id)} className="cursor-pointer hover:bg-white/5">
            <td className={cell}>{station.shipClassName}</td><td className={`${cell} text-swu-primary`}>{station.name}</td>
            <td className={cell}>{STATION_ROLES[station.stationRole ?? ''] ?? station.stationRole}</td><td className={numberCell}>{location}</td>
            <td className={numberCell}><Hull current={station.hull} max={station.hullMax} /></td><td className={numberCell}>{station.shields}/{station.shieldsMax}</td>
            <td className={numberCell}>{station.energy}/{station.energyMax}</td><td className={numberCell}>{station.crew}/{station.crewRequired}/{station.crewMax}</td>
            <td className={numberCell} aria-label={`Andockbelegung ${station.dockedShips} von ${station.dockCapacity}`}>{station.dockedShips}/{station.dockCapacity}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>
  );
}

function ShipTable({
  title,
  ships,
  leaderId,
  actions,
  message,
  emptyLabel,
  collapsed = false,
  onOpen,
  onFleet,
}: {
  title: string;
  ships: SpacecraftListDto[];
  leaderId?: number | null;
  actions?: ReactNode;
  message?: string;
  emptyLabel?: string;
  collapsed?: boolean;
  onOpen: (id: number) => void;
  onFleet: (ship: SpacecraftListDto) => void;
}) {
  return (
    <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
      <header className="flex items-center justify-between gap-3 border-b border-swu-border bg-black/30 px-3 py-2 text-xs">
        <h2 className="font-bold text-swu-primary">{title}</h2>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-3 text-swu-muted">
            {actions}
          </div>
        )}
      </header>
      {!collapsed && message && (
        <p className="whitespace-pre-line border-b border-swu-border px-3 py-2 text-xs text-red-400">
          {message}
        </p>
      )}
      {!collapsed && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/40 text-center font-bold text-swu-primary">
              {[
                'Klasse',
                'Name',
                'Alarm',
                'Ebene',
                'x|y',
                'Hülle',
                'Schilde',
                'EPS',
                'Hyperantrieb',
                'Reaktor',
                'Batterie',
                'Crew',
                'Systeme',
                'Status',
                'Flotte',
              ].map((heading) => (
                <th key={heading} className={cell}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ships.length === 0 ? (
              <tr>
                <td
                  colSpan={15}
                  className={`${cell} py-4 text-center text-swu-muted`}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              ships.map((ship) => (
                <ShipRow
                  key={ship.id}
                  ship={ship}
                  leader={ship.id === leaderId}
                  onOpen={() => onOpen(ship.id)}
                  onFleet={() => onFleet(ship)}
                />
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ShipRow({ ship, leader = false, onOpen, onFleet }: { ship: SpacecraftListDto; leader?: boolean; onOpen: () => void; onFleet: () => void }) {
  const alert = ALERT_PRESENTATION[ship.alertState];
  const location = ship.location.scope === 'SYSTEM'
    ? `${ship.location.galaxyX ?? 0}|${ship.location.galaxyY ?? 0} (${ship.location.x}|${ship.location.y})`
    : `${ship.location.x}|${ship.location.y}`;
  const crewOk = ship.crewRequired <= 0 || ship.crew >= ship.crewRequired;
  const crewLabel = `Crew ${ship.crew}/${ship.crewRequired}/${ship.crewMax}: ${crewOk ? 'ausreichend' : 'zu wenig'}`;

  return (
    <tr onClick={onOpen} className="cursor-pointer hover:bg-white/5">
      <td className={cell}>
        <ShipStorageTooltip
          shipId={ship.id}
          shipName={ship.name}
          imageSrc={shipImage(ship.shipClassId, ship.shipClassKey)}
          cargoMax={ship.cargoMax}
        />
      </td>
      <td className={`${cell} font-medium text-swu-primary`}>{leader ? <span aria-label={`Flottenführer ${ship.name}`} title="Flottenführer">◆ {ship.name}</span> : ship.name}{ship.dockedAtId != null && <img src="/assets/buttons/dock1.png" title={`Angedockt an ${ship.dockedAtName ?? 'Station'}`} alt={`Angedockt an ${ship.dockedAtName ?? 'Station'}`} className="ml-1 inline-block size-4 align-middle" />}</td>
      <td className={`${cell} text-center`}><span role="img" title={alert.label} aria-label={alert.label} className={`inline-block size-3 border border-swu-border ${alert.className}`} /></td>
      <td className={`${cell} text-center`}><span title={ship.layer.name} aria-label={`Ebene ${ship.layer.name}`} className="font-mono text-swu-primary">L{ship.layer.id}</span></td>
      <td className={numberCell}>{location}</td>
      <td className={numberCell}><Hull current={ship.hull} max={ship.hullMax} /></td>
      <td className={numberCell} title={SHIELD_REGENERATION_DESCRIPTION}><span className={ship.shieldActive ? 'text-swu-primary font-bold' : ''}>{ship.shields}/{ship.shieldsMax}</span>{ship.shieldRegeneration > 0 && <span className="text-green-500"> +{ship.shieldRegeneration}</span>}</td>
      <td className={numberCell}>{ship.energy}/{ship.energyMax} <span className="text-green-500">+{ship.energyGain}</span> <span className="text-swu-muted">({ship.energyConsumption}/{ship.reactorUsage})</span></td>
      <td className={numberCell}>{ship.warpdrive}/{ship.warpdriveMax} <span className="text-green-500">+{ship.warpdriveGain}</span></td>
      <td className={numberCell}>{ship.reactorFuel}/{ship.reactorFuelMax}</td>
      <td className={numberCell}>{ship.battery}/{ship.batteryMax}</td>
      <td className={`${numberCell} ${crewOk ? 'text-green-500' : 'text-red-500'}`} aria-label={crewLabel}>{ship.crew}/{ship.crewRequired}/{ship.crewMax}</td>
      <td className={`${cell} whitespace-nowrap text-center`}>{SYSTEMS.map(([key, short, label]) => <SystemIcon key={key} label={label} short={short} system={ship.systems[key]} />)}{ship.systems.CLOAK?.present && <CloakIcon system={ship.systems.CLOAK} />}</td>
      <td className={`${cell} text-center`}>{ship.specialStatus && <span role="img" title={STATUS[ship.specialStatus]} aria-label={STATUS[ship.specialStatus]} className="inline-block size-3 border border-swu-accent bg-swu-accent/30" />}</td>
      <td className={`${cell} text-center`}><FleetButton ship={ship} onClick={onFleet} /></td>
    </tr>
  );
}

const FLEET_BUTTONS = {
  create: { label: 'Flotte erstellen', icon: 'fl_flag1.png' },
  leave: { label: 'Flotte verlassen', icon: 'fl_raus1.png' },
  dissolve: { label: 'Flotte auflösen', icon: 'fl_flag2.png' },
};

function FleetButton({ ship, onClick }: { ship: SpacecraftListDto; onClick: () => void }) {
  const { label, icon } = FLEET_BUTTONS[
    ship.fleetId == null ? 'create' : ship.fleetLeaderId === ship.id ? 'dissolve' : 'leave'
  ];
  return (
    <button
      type="button"
      title={label}
      aria-label={`${label}: ${ship.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <img src={`/assets/buttons/${icon}`} alt="" aria-hidden="true" className="inline-block size-5" />
    </button>
  );
}

function Hull({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? current / max : 0;
  const tone = ratio <= 0.25 ? 'text-red-500' : ratio <= 0.5 ? 'text-swu-warning' : ratio < 1 ? 'text-swu-accent' : 'text-swu-text';
  return <span className={tone}>{current}/{max}</span>;
}

function CloakIcon({ system }: { system: SpacecraftListSystemDto }) {
  const title = system.active ? 'Tarnung aktiviert' : 'Tarnung deaktiviert';
  return <img src={`/assets/buttons/${system.active ? 'tarn1.png' : 'tarn2.png'}`} title={title} alt={title} className="mx-0.5 inline-block size-4 align-middle" />;
}

function SystemIcon({ label, short, system }: { label: string; short: string; system: SpacecraftListSystemDto }) {
  const state = !system.present ? 'nicht vorhanden' : system.damaged ? 'beschädigt' : system.active ? 'aktiviert' : 'deaktiviert';
  const tone = !system.present ? 'opacity-20' : system.damaged ? 'text-red-500' : system.active ? 'border-swu-primary text-swu-primary' : 'opacity-40';
  return <span role="img" title={`${label} ${state}`} aria-label={`${label} ${state}`} className={`mx-0.5 inline-block min-w-5 border border-swu-border px-0.5 font-mono text-[10px] ${tone}`}>{short}</span>;
}
