import { shipImage } from '../../lib/assets';

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
    warpSpeed: number;
    warpCooldown: number;
    crew: number;
    crewMax: number;
    posX: number;
    posY: number;
    locationLabel?: string;
  };
}

const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Grün',
  YELLOW: 'Gelb',
  RED: 'Rot',
};

export function ShipHeaderTable({ ship }: ShipHeaderTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-swu-border bg-swu-surface">
      <table className="w-full border-collapse text-center text-xs">
        <thead className="bg-black/50 text-swu-muted">
          <tr>
            <th className="border border-swu-border px-2 py-1">Typ</th>
            <th className="border border-swu-border px-2 py-1">Koordinaten</th>
            <th className="border border-swu-border px-2 py-1">Hülle</th>
            <th className="border border-swu-border px-2 py-1">Schilde</th>
            <th className="border border-swu-border px-2 py-1">Warpdrive</th>
            <th className="border border-swu-border px-2 py-1">Energie</th>
            <th className="border border-swu-border px-2 py-1">Crew</th>
            <th className="border border-swu-border px-2 py-1">Name</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-swu-border px-2 py-2">
              <div className="flex items-center justify-center gap-2">
                <img
                  src={shipImage(ship.shipClassId, ship.shipClassKey)}
                  alt=""
                  className="h-8 w-14 object-contain"
                />
                <span className="text-swu-primary">
                  {ship.shipClassName ?? `Klasse ${ship.shipClassId}`}
                </span>
              </div>
            </td>
            <td className="border border-swu-border px-2 py-2 font-mono text-swu-primary">
              {ship.posX}|{ship.posY}
            </td>
            <td className="border border-swu-border px-2 py-2">
              {ship.hull}/{ship.hullMax}
            </td>
            <td className="border border-swu-border px-2 py-2">
              {ship.shields}/{ship.shieldsMax}
            </td>
            <td className="border border-swu-border px-2 py-2">
              {ship.warpSpeed}
              {ship.warpCooldown > 0 ? ` (${ship.warpCooldown})` : ''}
            </td>
            <td className="border border-swu-border px-2 py-2">
              {ship.energy}/{ship.energyMax}
            </td>
            <td className="border border-swu-border px-2 py-2">
              {ship.crew}/{ship.crewMax}
            </td>
            <td className="border border-swu-border px-2 py-2 text-left">
              <div className="font-bold text-swu-primary">{ship.name}</div>
              <div className="text-[10px] text-swu-muted">
                {ship.status} · Alarm{' '}
                {ALERT_LABELS[ship.alertState] ?? ship.alertState}
              </div>
              {ship.locationLabel && (
                <div className="text-[10px] text-swu-muted">
                  {ship.locationLabel}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
