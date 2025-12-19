import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, MapPin, Battery, Zap } from 'lucide-react';
import api from '../lib/api';

interface Ship {
  id: number;
  name: string | null;
  status: string;
  health: number;
  energyWeapons: number;
  energyDrive: number;
  currentGalaxyX: number | null;
  currentGalaxyY: number | null;
  shipType: {
    name: string;
    maxEnergyWeapons: number;
    maxEnergyDrive: number;
  };
  planet: {
    id: number;
    name: string;
  } | null;
}

export default function Fleet() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShips();
  }, []);

  const loadShips = async () => {
    try {
      const response = await api.get('/player/ships');
      setShips(response.data.ships || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load ships:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-400">Lade Schiffe...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Schiffe</h1>
      
      {ships.length === 0 ? (
        <div className="bg-space-light p-6 rounded-lg border border-gray-700">
          <p className="text-gray-400">Keine Schiffe vorhanden. Baue Schiffe in der Raumschiffwerft!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ships.map((ship) => (
            <Link
              key={ship.id}
              to={`/ship/${ship.id}`}
              className="bg-space-light p-4 rounded-lg border border-gray-700 hover:border-rebel transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">
                    {ship.name || `${ship.shipType.name} ${ship.id}`}
                  </h3>
                  <p className="text-gray-400 text-sm">{ship.shipType.name}</p>
                </div>
                <Rocket className={`${
                  ship.status === 'DOCKED' ? 'text-green-400' :
                  ship.status === 'IN_FLIGHT' ? 'text-blue-400' :
                  'text-red-400'
                }`} size={20} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-white">
                    {ship.status === 'DOCKED' ? 'Angedockt' :
                     ship.status === 'IN_FLIGHT' ? 'Im Flug' :
                     'Gestrandet'}
                  </span>
                </div>

                {ship.planet && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <MapPin size={12} />
                      Position
                    </span>
                    <span className="text-white">{ship.planet.name}</span>
                  </div>
                )}

                {ship.currentGalaxyX && ship.currentGalaxyY && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Koordinaten</span>
                    <span className="text-white">{ship.currentGalaxyX}|{ship.currentGalaxyY}</span>
                  </div>
                )}

                <div className="mt-3 space-y-1">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-blue-300 flex items-center gap-1">
                        <Battery size={12} />
                        Antrieb
                      </span>
                      <span className="text-white">{ship.energyDrive}/{ship.shipType.maxEnergyDrive}</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full"
                        style={{ width: `${(ship.energyDrive / ship.shipType.maxEnergyDrive) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-yellow-300 flex items-center gap-1">
                        <Zap size={12} />
                        Waffen
                      </span>
                      <span className="text-white">{ship.energyWeapons}/{ship.shipType.maxEnergyWeapons}</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-yellow-500 h-1 rounded-full"
                        style={{ width: `${(ship.energyWeapons / ship.shipType.maxEnergyWeapons) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
