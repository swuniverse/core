import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  SpacecraftListDto,
  SpacecraftListSystemDto,
} from '@swuniverse/shared';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { alertStateImage, shipImage } from '../lib/assets';

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
  IN_FLIGHT: 'Hyperraumflug',
  STANDBY: 'Bereitschaft',
  CARTOGRAPHY_FINALIZATION: 'Kartographie-Finalisierung',
} as const;

const cell = 'border border-swu-border px-1.5 py-1';
const numberCell = `${cell} text-right font-mono whitespace-nowrap`;

export function SpacecraftPage() {
  const navigate = useNavigate();
  const [ships, setShips] = useState<SpacecraftListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fleetName, setFleetName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [fleetAlertFailures, setFleetAlertFailures] = useState<Record<number, string[]>>({});

  const loadShips = useCallback(async () => {
    const data = await api.get<SpacecraftListDto[]>('/spacecraft');
    setShips(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadShips();
  }, [loadShips]);

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
      members: [...members].sort((a, b) =>
        a.id === members[0].fleetLeaderId ? -1 : b.id === members[0].fleetLeaderId ? 1 : a.id - b.id,
      ),
    }));
  }, [ships]);
  const stations = ships.filter((ship) => ship.kind === 'STATION');
  const mobileShips = ships.filter((ship) => ship.kind !== 'STATION');
  const singles = mobileShips.filter((ship) => ship.fleetId == null);

  async function createFleet(event: FormEvent) {
    event.preventDefault();
    if (!fleetName.trim() || !leaderId) return;
    await api.post('/spacecraft/fleets/create', {
      name: fleetName.trim(),
      leaderId: Number(leaderId),
    });
    setFleetName('');
    setLeaderId('');
    await loadShips();
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

  if (loading) return <div className="p-3 text-swu-muted md:p-6">Flotte wird geladen...</div>;

  return (
    <div className="space-y-3 p-3 md:p-6">
      <div className="border border-swu-border bg-black/30 px-3 py-1.5">
        <h1 className="text-xs font-bold text-swu-primary">/ Schiffe / Flotte</h1>
      </div>
      {fleets.map((fleet) => (
        <ShipTable
          key={fleet.id}
          title={fleet.name}
          ships={fleet.members}
          leaderId={fleet.leaderId}
          actions={(
            <>
              <span>{fleet.members.length} {fleet.members.length === 1 ? 'Schiff' : 'Schiffe'}</span>
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
          onOpen={(id) => navigate(`/spacecraft/${id}`)}
        />
      ))}
      <StationTable stations={stations} onOpen={(id) => navigate(`/spacecraft/${id}`)} />
      <ShipTable
        title="Einzelschiffe"
        ships={singles}
        emptyLabel={ships.length === 0 ? 'Du besitzt derzeit keine Schiffe' : 'Alle Schiffe sind einer Flotte zugeordnet'}
        onOpen={(id) => navigate(`/spacecraft/${id}`)}
      />
      <form onSubmit={createFleet} className="border border-swu-border bg-swu-surface/70 text-xs">
        <h2 className="border-b border-swu-border bg-black/30 px-3 py-2 font-bold text-swu-primary">Neue Flotte</h2>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <label className="grid gap-1">Flottenname<input aria-label="Flottenname" value={fleetName} onChange={(event) => setFleetName(event.target.value)} className="border border-swu-border bg-black/30 px-2 py-1" required /></label>
          <label className="grid gap-1">Flottenführer<select aria-label="Flottenführer" value={leaderId} onChange={(event) => setLeaderId(event.target.value)} className="border border-swu-border bg-black/30 px-2 py-1" required><option value="">Schiff auswählen</option>{singles.map((ship) => <option key={ship.id} value={ship.id}>{ship.name}</option>)}</select></label>
          <button type="submit" disabled={singles.length === 0} className="border border-swu-primary px-3 py-1 text-swu-primary disabled:cursor-not-allowed disabled:opacity-40">Flotte anlegen</button>
        </div>
      </form>
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

function ShipTable({ title, ships, leaderId, actions, message, emptyLabel, onOpen }: { title: string; ships: SpacecraftListDto[]; leaderId?: number | null; actions?: ReactNode; message?: string; emptyLabel?: string; onOpen: (id: number) => void }) {
  return (
    <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
      <header className="flex items-center justify-between gap-3 border-b border-swu-border bg-black/30 px-3 py-2 text-xs">
        <h2 className="font-bold text-swu-primary">{title}</h2>
        {actions && <div className="flex items-center gap-3 text-swu-muted">{actions}</div>}
      </header>
      {message && <p className="whitespace-pre-line border-b border-swu-border px-3 py-2 text-xs text-red-400">{message}</p>}
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-black/40 text-center font-bold text-swu-primary">{['Klasse', 'Name', 'Alarm', 'Ebene', 'x|y', 'Hülle', 'Schilde', 'EPS', 'Hyperantrieb', 'Reaktor', 'Batterie', 'Crew', 'Systeme', 'Status'].map((heading) => <th key={heading} className={cell}>{heading}</th>)}</tr></thead>
        <tbody>{ships.length === 0 ? <tr><td colSpan={14} className={`${cell} py-4 text-center text-swu-muted`}>{emptyLabel}</td></tr> : ships.map((ship) => <ShipRow key={ship.id} ship={ship} leader={ship.id === leaderId} onOpen={() => onOpen(ship.id)} />)}</tbody>
      </table>
    </section>
  );
}

function ShipRow({ ship, leader = false, onOpen }: { ship: SpacecraftListDto; leader?: boolean; onOpen: () => void }) {
  const alert = ALERT_PRESENTATION[ship.alertState];
  const location = ship.location.scope === 'SYSTEM'
    ? `${ship.location.galaxyX ?? 0}|${ship.location.galaxyY ?? 0} (${ship.location.x}|${ship.location.y})`
    : `${ship.location.x}|${ship.location.y}`;
  const crewOk = ship.crewRequired <= 0 || ship.crew >= ship.crewRequired;
  const crewLabel = `Crew ${ship.crew}/${ship.crewRequired}/${ship.crewMax}: ${crewOk ? 'ausreichend' : 'zu wenig'}`;

  return (
    <tr onClick={onOpen} className="cursor-pointer hover:bg-white/5">
      <td className={cell}><img src={shipImage(ship.shipClassId, ship.shipClassKey)} alt={ship.shipClassName ?? ''} className="h-8 w-auto object-contain" /></td>
      <td className={`${cell} font-medium text-swu-primary`}>{leader ? <span aria-label={`Flottenführer ${ship.name}`} title="Flottenführer">◆ {ship.name}</span> : ship.name}</td>
      <td className={`${cell} text-center`}><span role="img" title={alert.label} aria-label={alert.label} className={`inline-block size-3 border border-swu-border ${alert.className}`} /></td>
      <td className={`${cell} text-center`}><span title={ship.layer.name} aria-label={`Ebene ${ship.layer.name}`} className="font-mono text-swu-primary">L{ship.layer.id}</span></td>
      <td className={numberCell}>{location}</td>
      <td className={numberCell}><Hull current={ship.hull} max={ship.hullMax} /></td>
      <td className={numberCell}><span className={ship.shieldActive ? 'text-swu-primary font-bold' : ''}>{ship.shields}/{ship.shieldsMax}</span>{ship.shieldRegeneration > 0 && <span className="text-green-500"> +{ship.shieldRegeneration}</span>}</td>
      <td className={numberCell}>{ship.energy}/{ship.energyMax} <span className="text-green-500">+{ship.energyGain}</span> <span className="text-swu-muted">({ship.energyConsumption}/{ship.reactorUsage})</span></td>
      <td className={numberCell}>{ship.warpdrive}/{ship.warpdriveMax} <span className="text-green-500">+{ship.warpdriveGain}</span></td>
      <td className={numberCell}>{ship.reactorFuel}/{ship.reactorFuelMax}</td>
      <td className={numberCell}>{ship.battery}/{ship.batteryMax}</td>
      <td className={`${numberCell} ${crewOk ? 'text-green-500' : 'text-red-500'}`} aria-label={crewLabel}>{ship.crew}/{ship.crewRequired}/{ship.crewMax}</td>
      <td className={`${cell} whitespace-nowrap text-center`}>{SYSTEMS.map(([key, short, label]) => <SystemIcon key={key} label={label} short={short} system={ship.systems[key]} />)}{ship.systems.CLOAK?.present && <CloakIcon system={ship.systems.CLOAK} />}</td>
      <td className={`${cell} text-center`}>{ship.specialStatus && <span role="img" title={STATUS[ship.specialStatus]} aria-label={STATUS[ship.specialStatus]} className="inline-block size-3 border border-swu-accent bg-swu-accent/30" />}</td>
    </tr>
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
