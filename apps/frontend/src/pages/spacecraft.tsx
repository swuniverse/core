import { useEffect, useState } from 'react';
import type {
  SpacecraftListDto,
  SpacecraftListSystemDto,
} from '@swuniverse/shared';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { shipImage } from '../lib/assets';

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

  useEffect(() => {
    api.get<SpacecraftListDto[]>('/spacecraft').then((data) => {
      setShips(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-3 text-swu-muted md:p-6">Flotte wird geladen...</div>;

  return (
    <div className="space-y-3 p-3 md:p-6">
      <div className="border border-swu-border bg-black/30 px-3 py-1.5">
        <h1 className="text-xs font-bold text-swu-primary">/ Schiffe / Flotte</h1>
      </div>
      <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
          Einzelschiffe
        </header>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/40 text-center font-bold text-swu-primary">
              {['Klasse', 'Name', 'Alarm', 'Ebene', 'x|y', 'Hülle', 'Schilde', 'EPS', 'Hyperantrieb', 'Reaktor', 'Batterie', 'Crew', 'Systeme', 'Status'].map((heading) => (
                <th key={heading} className={cell}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ships.length === 0 ? (
              <tr><td colSpan={14} className={`${cell} py-4 text-center text-swu-muted`}>Du besitzt derzeit keine Schiffe</td></tr>
            ) : ships.map((ship) => <ShipRow key={ship.id} ship={ship} onOpen={() => navigate(`/spacecraft/${ship.id}`)} />)}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ShipRow({ ship, onOpen }: { ship: SpacecraftListDto; onOpen: () => void }) {
  const alert = ALERT_PRESENTATION[ship.alertState];
  const location = ship.location.scope === 'SYSTEM'
    ? `${ship.location.galaxyX ?? 0}|${ship.location.galaxyY ?? 0} (${ship.location.x}|${ship.location.y})`
    : `${ship.location.x}|${ship.location.y}`;
  const crewOk = ship.crewRequired <= 0 || ship.crew >= ship.crewRequired;
  const crewLabel = `Crew ${ship.crew}/${ship.crewRequired}/${ship.crewMax}: ${crewOk ? 'ausreichend' : 'zu wenig'}`;

  return (
    <tr onClick={onOpen} className="cursor-pointer hover:bg-white/5">
      <td className={cell}><img src={shipImage(ship.shipClassId, ship.shipClassKey)} alt={ship.shipClassName ?? ''} className="h-8 w-auto object-contain" /></td>
      <td className={`${cell} font-medium text-swu-primary`}>{ship.name}</td>
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
      <td className={`${cell} whitespace-nowrap text-center`}>{SYSTEMS.map(([key, short, label]) => <SystemIcon key={key} label={label} short={short} system={ship.systems[key]} />)}</td>
      <td className={`${cell} text-center`}>{ship.specialStatus && <span role="img" title={STATUS[ship.specialStatus]} aria-label={STATUS[ship.specialStatus]} className="inline-block size-3 border border-swu-accent bg-swu-accent/30" />}</td>
    </tr>
  );
}

function Hull({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? current / max : 0;
  const tone = ratio <= 0.25 ? 'text-red-500' : ratio <= 0.5 ? 'text-swu-warning' : ratio < 1 ? 'text-swu-accent' : 'text-swu-text';
  return <span className={tone}>{current}/{max}</span>;
}

function SystemIcon({ label, short, system }: { label: string; short: string; system: SpacecraftListSystemDto }) {
  const state = !system.present ? 'nicht vorhanden' : system.damaged ? 'beschädigt' : system.active ? 'aktiviert' : 'deaktiviert';
  const tone = !system.present ? 'opacity-20' : system.damaged ? 'text-red-500' : system.active ? 'border-swu-primary text-swu-primary' : 'opacity-40';
  return <span role="img" title={`${label} ${state}`} aria-label={`${label} ${state}`} className={`mx-0.5 inline-block min-w-5 border border-swu-border px-0.5 font-mono text-[10px] ${tone}`}>{short}</span>;
}
