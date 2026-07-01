import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { shipImage } from '../lib/assets';

interface Spacecraft {
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
}

const ALERT_COLORS: Record<string, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
};

export function SpacecraftPage() {
  const navigate = useNavigate();
  const [ships, setShips] = useState<Spacecraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Spacecraft[]>('/spacecraft').then((data) => {
      setShips(data);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="p-3 text-swu-muted md:p-6">Flotte wird geladen...</div>
    );

  return (
    <div className="p-3 md:p-6">
      <h1 className="text-lg font-bold text-swu-accent border-b border-swu-border pb-1 mb-4">
        / Schiffe
      </h1>

      <div className="border border-swu-border rounded bg-swu-surface">
        <h2 className="text-xs font-bold text-swu-text px-3 py-2 border-b border-swu-border bg-swu-bg/50">
          Einzelschiffe
        </h2>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-swu-border text-swu-muted">
              <th className="text-left px-3 py-2 font-semibold w-20">Klasse</th>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-center px-3 py-2 font-semibold w-24">x|y</th>
              <th className="text-center px-3 py-2 font-semibold w-24">
                Hülle
              </th>
              <th className="text-center px-3 py-2 font-semibold w-24">
                Schilde
              </th>
              <th className="text-center px-3 py-2 font-semibold w-32">
                Energie
              </th>
              <th className="text-center px-3 py-2 font-semibold w-16">Crew</th>
            </tr>
          </thead>
          <tbody>
            {ships.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-swu-muted text-center"
                >
                  Du besitzt derzeit keine Schiffe
                </td>
              </tr>
            ) : (
              ships.map((ship) => (
                <tr
                  key={ship.id}
                  onClick={() => navigate(`/spacecraft/${ship.id}`)}
                  className="border-b border-swu-border/50 hover:bg-swu-accent/5 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-1.5">
                    <img
                      src={shipImage(ship.shipClassId, ship.shipClassKey)}
                      alt={ship.shipClassName ?? ''}
                      className="h-8 w-auto object-contain"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-sm ${ALERT_COLORS[ship.alertState] ?? 'bg-gray-500'}`}
                      />
                      <span className="text-swu-primary font-medium">
                        {ship.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center text-swu-muted font-mono">
                    {ship.posX}|{ship.posY}
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono">
                    <StatValue
                      current={ship.hull}
                      max={ship.hullMax}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono">
                    <StatValue
                      current={ship.shields}
                      max={ship.shieldsMax}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono">
                    <StatValue
                      current={ship.energy}
                      max={ship.energyMax}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono text-swu-text">
                    {ship.crew}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatValue({ current, max }: { current: number; max: number }) {
  const damaged = current < max;
  return (
    <span className={damaged ? 'text-yellow-400' : 'text-swu-text'}>
      {current}/{max}
    </span>
  );
}
