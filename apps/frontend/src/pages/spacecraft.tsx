import { CREW_PER_FLEET, WsEventType, type SpacecraftVisibilityPayload } from '@swuniverse/shared';
import { useSocket } from '../hooks/use-socket';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SpacecraftListDto,
  SpacecraftOwnBuoyDto,
  SpacecraftListSystemDto,
} from '@swuniverse/shared';
import { InfoHeading } from '../components/spacecraft/InfoHeading';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { alertStateImage, shipImage } from '../lib/assets';
import { ShipStorageTooltip } from '../components/spacecraft/ShipStoragePanel';

const ALERT_LABELS = {
  GREEN: 'Grüner Alarm',
  YELLOW: 'Gelber Alarm',
  RED: 'Roter Alarm',
} as const;

/** STU shiplist_body: sensor icons always, weapons and cloak only when installed. */
const SYSTEM_ICONS: Array<[keyof SpacecraftListDto['systems'], string, string, string, boolean]> = [
  ['SHORT_RANGE_SENSORS', 'kss1', 'kss2', 'Nahbereichssensoren', true],
  ['LONG_RANGE_SENSORS', 'lss1', 'lss2', 'Langstreckensensoren', true],
  ['WEAPONS', 'act_phaser1', 'act_phaser2', 'Strahlenwaffe', false],
  ['TORPEDO_BANK', 'act_torp1', 'act_torp2', 'Torpedobänke', false],
  ['CLOAK', 'tarn1', 'tarn2', 'Tarnung', false],
];

/** STU shiplist_header with its info tooltips. */
const SHIP_COLUMNS: Array<[string, string?]> = [
  ['Klasse'],
  ['Name'],
  [''],
  ['x|y', 'im System (außerhalb)'],
  ['Hülle', 'aktuell/maximal'],
  ['Schilde', 'aktuell/maximal (Regeneration [alle 15 min])'],
  ['Energie', 'EPS: aktuell/maximal, Zuwachs, (Systemverbrauch/Reaktornutzung)\nHyperantrieb: aktuell/maximal, Zuwachs'],
  ['Versorgung', 'Reaktor, Ersatzbatterie'],
  ['Crew', 'grün: mehr als ausreichend, rot: zu wenig'],
  ['Systeme'],
  [''],
];

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
  const [joinFleetId, setJoinFleetId] = useState<number | null>(null);
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

  async function renameFleet(id: number, name: string) {
    setFleetActionError(null);
    try {
      await api.patch(`/spacecraft/fleets/${id}`, { name });
      await loadShips();
    } catch (error) {
      setFleetActionError(error instanceof Error ? error.message : 'Umbenennen fehlgeschlagen');
    }
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
      {fleetActionError && <p role="alert" className="whitespace-pre-line border border-swu-danger px-3 py-2 text-xs text-red-400">{fleetActionError}</p>}
      {fleets.map((fleet) => (
        <ShipTable
          key={fleet.id}
          header={
            <FleetHeader
              fleet={fleet}
              pending={fleetActionPending}
              onToggle={() => void updateFleetList(fleet.id, !fleet.isHidden)}
              onRename={(name) => void renameFleet(fleet.id, name)}
              onAdd={() => setJoinFleetId(fleet.id)}
            />
          }
          ships={fleet.members}
          leaderId={fleet.leaderId}
          collapsed={fleet.isHidden}
          onFleet={(ship) => void changeFleet(ship)}
          onOpen={(id) => navigate(`/spacecraft/${id}`)}
        />
      ))}
      <ShipTable
        header={<h2 className="font-bold text-swu-primary">Einzelschiffe</h2>}
        ships={singles}
        emptyLabel={ships.length === 0 ? 'Du besitzt derzeit keine Schiffe' : 'Alle Schiffe sind einer Flotte zugeordnet'}
        onFleet={(ship) => void changeFleet(ship)}
        onOpen={(id) => navigate(`/spacecraft/${id}`)}
      />
      <BuoyTable buoys={buoys} />
      {joinFleetId != null && (() => {
        const fleet = fleets.find((candidate) => candidate.id === joinFleetId);
        const leader = fleet?.members.find((member) => member.id === fleet.leaderId);
        // STU getPossibleFleetMembers: own ships without a fleet on the leader's field.
        const available = leader
          ? singles.filter((ship) => ship.status === 'IDLE' && locationKey(ship) === locationKey(leader))
          : [];
        return (
          <FleetJoinDialog
            ships={available}
            onClose={() => setJoinFleetId(null)}
            onJoin={async (shipIds) => {
              const failures: string[] = [];
              for (const shipId of shipIds) {
                try {
                  await api.post(`/spacecraft/fleets/${joinFleetId}/join`, { shipId });
                } catch (error) {
                  const name = available.find((ship) => ship.id === shipId)?.name ?? shipId;
                  failures.push(`${name}: ${error instanceof Error ? error.message : 'Beitritt fehlgeschlagen'}`);
                }
              }
              setFleetActionError(failures.length ? failures.join('\n') : null);
              setJoinFleetId(null);
              await loadShips();
            }}
          />
        );
      })()}
    </div>
  );
}

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

function ShipTable({
  header,
  ships,
  leaderId,
  emptyLabel,
  collapsed = false,
  onOpen,
  onFleet,
}: {
  header: ReactNode;
  ships: SpacecraftListDto[];
  leaderId?: number | null;
  emptyLabel?: string;
  collapsed?: boolean;
  onOpen: (id: number) => void;
  onFleet: (ship: SpacecraftListDto) => void;
}) {
  return (
    <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
      <header className="border-b border-swu-border bg-black/30 px-3 py-2 text-xs">{header}</header>
      {!collapsed && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/40 text-center font-bold text-swu-primary">
              {SHIP_COLUMNS.map(([heading, tooltip], index) => (
                <th key={`${heading}-${index}`} className={cell} title={tooltip}>
                  <InfoHeading label={heading} tooltip={tooltip} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ships.length === 0 ? (
              <tr>
                <td
                  colSpan={SHIP_COLUMNS.length}
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
  const alertLabel = ALERT_LABELS[ship.alertState];
  const location = ship.location.scope === 'SYSTEM'
    ? `${ship.location.x}|${ship.location.y} (${ship.location.galaxyX ?? 0}|${ship.location.galaxyY ?? 0})`
    : `(${ship.location.x}|${ship.location.y})`;
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
      <td className={`${cell} font-medium text-swu-primary`}>{ship.dockedAtId != null && <img src="/assets/buttons/dock2.png" title={`Angedockt an ${ship.dockedAtName ?? 'Station'}`} alt={`Angedockt an ${ship.dockedAtName ?? 'Station'}`} className="mr-1 inline-block size-5 align-middle" />}{leader ? <span aria-label={`Flottenführer ${ship.name}`} title="Flottenführer">{ship.name}</span> : ship.name}</td>
      <td className={`${cell} text-center`}><img src={alertStateImage(ship.alertState)} title={alertLabel} alt={alertLabel} className="inline-block size-4" /></td>
      <td className={`${numberCell} text-center`}>{location}</td>
      <td className={numberCell}><Hull current={ship.hull} max={ship.hullMax} /></td>
      <td className={numberCell} title={SHIELD_REGENERATION_DESCRIPTION}><span className={ship.shieldActive ? 'text-swu-primary font-bold' : ''}>{ship.shields}/{ship.shieldsMax}</span>{!ship.shieldActive && ship.shieldRegeneration > 0 && <span className="text-green-500"> (+{ship.shieldRegeneration})</span>}</td>
      <td className={numberCell} aria-label={`Energie ${ship.energy}/${ship.energyMax}`}>
        {ship.energy}/{ship.energyMax} <span className="text-green-500">+{ship.energyGain}</span> (<span className="text-red-400">{ship.energyConsumption}</span>/<span className="text-red-400">{ship.reactorUsage}</span>)
        {ship.warpdriveMax > 0 && <> {ship.warpdrive}/{ship.warpdriveMax} <span className="text-green-500">+{ship.warpdriveGain}</span></>}
      </td>
      <td className={`${cell} whitespace-nowrap`}>
        {ship.reactorFuelMax > 0 && <span className="mr-2 inline-flex items-center gap-1" title="Reaktorladung"><img src="/assets/buttons/fusrkt.png" alt="Reaktorladung" className="size-4" />{ship.reactorFuel}</span>}
        {ship.batteryMax > 0 && <span className="inline-flex items-center gap-1" title="Ersatzbatterie"><img src="/assets/buttons/batt.png" alt="Ersatzbatterie" className="size-4" />{ship.battery}</span>}
      </td>
      <td className={`${cell} text-center font-mono ${crewOk ? 'text-green-500' : 'text-red-500'}`} aria-label={crewLabel} title={`${ship.crew}/${ship.crewRequired}/${ship.crewMax}`}>{ship.crew}</td>
      <td className={`${cell} whitespace-nowrap text-center`}>{SYSTEM_ICONS.map(([key, on, off, label, always]) => <SystemIcon key={key} system={ship.systems[key]} on={on} off={off} label={label} always={always} />)}</td>
      <td className={`${cell} text-center`}><FleetButton ship={ship} onClick={onFleet} /></td>
    </tr>
  );
}

const locationKey = ({ location }: SpacecraftListDto) =>
  location.scope === 'SYSTEM'
    ? `S:${location.systemId}:${location.x}:${location.y}`
    : `G:${location.layerId}:${location.x}:${location.y}`;

function FleetJoinDialog({
  ships,
  onClose,
  onJoin,
}: {
  ships: SpacecraftListDto[];
  onClose: () => void;
  onJoin: (shipIds: number[]) => Promise<void>;
}) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-label="Schiff(e) hinzufügen" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-sm border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h2 className="font-bold text-swu-primary">Schiff(e) hinzufügen</h2>
          <button type="button" onClick={onClose}>Schließen</button>
        </header>
        {ships.length === 0 ? (
          <p>Keine Schiffe vorhanden</p>
        ) : (
          <>
            <ul className="mb-2 divide-y divide-swu-border/60">
              {ships.map((ship) => (
                <li key={ship.id}>
                  <label className="flex items-center gap-2 py-1">
                    <img src={shipImage(ship.shipClassId, ship.shipClassKey)} alt="" aria-hidden="true" className="max-h-6" />
                    <input
                      type="checkbox"
                      checked={chosen.includes(ship.id)}
                      onChange={(event) => setChosen((current) => event.target.checked ? [...current, ship.id] : current.filter((id) => id !== ship.id))}
                    />
                    {ship.name}
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={busy || chosen.length === 0}
              className="border border-swu-border px-2 py-1 text-swu-primary disabled:opacity-40"
              onClick={async () => {
                setBusy(true);
                await onJoin(chosen);
              }}
            >
              Schiffe hinzufügen
            </button>
          </>
        )}
      </section>
    </div>
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

function SystemIcon({ system, on, off, label, always }: { system?: SpacecraftListSystemDto; on: string; off: string; label: string; always: boolean }) {
  if (!system?.present && !always) return null;
  const title = `${label} ${system?.active ? 'aktiviert' : 'deaktiviert'}`;
  return <img src={`/assets/buttons/${system?.active ? on : off}.png`} title={title} alt={title} className="mx-0.5 inline-block size-4 align-middle" />;
}

/** STU shiplistFleetform: toggle, name and crew sum left; rename centre; add ship right. */
function FleetHeader({
  fleet,
  pending,
  onToggle,
  onRename,
  onAdd,
}: {
  fleet: { name: string; isHidden: boolean; members: SpacecraftListDto[] };
  pending: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onAdd: () => void;
}) {
  const [name, setName] = useState(fleet.name);
  useEffect(() => setName(fleet.name), [fleet.name]);
  const crewSum = fleet.members.reduce((sum, member) => sum + Math.max(0, member.crewRequired), 0);
  const trimmed = name.trim();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-1 items-center gap-2">
        <button type="button" disabled={pending} title="zuklappen/aufklappen" aria-label={`${fleet.name} ${fleet.isHidden ? 'aufklappen' : 'zuklappen'}`} aria-expanded={!fleet.isHidden} onClick={onToggle} className="disabled:opacity-40">
          <img src="/assets/buttons/fleet.png" alt="" aria-hidden="true" />
        </button>
        <h2 className="font-bold text-swu-primary">{fleet.name}</h2>
        <span className="text-swu-muted">({crewSum}/{CREW_PER_FLEET} Crew)</span>
      </div>
      <form
        className="flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed && trimmed !== fleet.name) onRename(trimmed);
        }}
      >
        <input aria-label={`Flottenname ${fleet.name}`} value={name} onChange={(event) => setName(event.target.value)} className="w-40 border border-swu-border bg-black/30 px-1 py-0.5" />
        <button type="submit" title="Name ändern" aria-label={`Name von ${fleet.name} ändern`} disabled={!trimmed || trimmed === fleet.name} className="disabled:opacity-40">
          <img src="/assets/buttons/knedit2.png" alt="" aria-hidden="true" />
        </button>
      </form>
      <button type="button" title="Schiff hinzufügen" aria-label={`Schiff zu ${fleet.name} hinzufügen`} onClick={onAdd}>
        <img src="/assets/buttons/fl_join2.png" alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
