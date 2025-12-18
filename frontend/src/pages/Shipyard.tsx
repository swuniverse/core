import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Clock, AlertCircle, Coins, Wrench, Gem, Wind, Battery, Sparkles, Heart, Shield, X } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

interface ShipType {
  id: number;
  name: string;
  description: string;
  shipClass: string;
  buildCost: number;
  buildCostDurastahl: number;
  buildCostKristallinesSilizium: number;
  buildCostTibannaGas: number;
  buildCostEnergiemodule: number;
  buildCostKyberKristalle: number;
  buildCostBacta: number;
  buildCostBeskar: number;
  buildTime: number;
  crewRequired: number;
  cargoCapacity: number;
  speed: number;
  attack: number;
  defense: number;
}

interface QueueEntry {
  id: number;
  quantity: number;
  constructionStartedAt: string;
  shipType: ShipType;
}

interface Ship {
  id: number;
  name: string | null;
  health: number;
  crew: number;
  shipType: ShipType;
}

interface ShipyardData {
  planet: {
    id: number;
    name: string;
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    energiemodule: number;
    kyberKristalle: number;
    bacta: number;
    beskar: number;
  };
  availableShips: ShipType[];
  buildQueue: QueueEntry[];
  ships: Ship[];
}

const shipClassNames: Record<string, string> = {
  FIGHTER: 'Jäger',
  BOMBER: 'Bomber',
  CORVETTE: 'Korvette',
  FRIGATE: 'Fregatte',
  CAPITAL: 'Großkampfschiff',
  TRANSPORT: 'Transporter',
};

const shipClassColors: Record<string, string> = {
  FIGHTER: 'bg-cyan-900/20 border-cyan-700',
  BOMBER: 'bg-orange-900/20 border-orange-700',
  CORVETTE: 'bg-blue-900/20 border-blue-700',
  FRIGATE: 'bg-purple-900/20 border-purple-700',
  CAPITAL: 'bg-red-900/20 border-red-700',
  TRANSPORT: 'bg-green-900/20 border-green-700',
};

export default function Shipyard() {
  const { planetId } = useParams();
  const navigate = useNavigate();
  const { socket } = useGameStore();
  const [data, setData] = useState<ShipyardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [selectedShip, setSelectedShip] = useState<ShipType | null>(null);
  const [buildQuantity, setBuildQuantity] = useState(1);

  const loadShipyard = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/shipyard/${planetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const shipyardData = await response.json();
        setData(shipyardData);
      } else {
        const error = await response.json();
        alert(error.error);
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load shipyard:', error);
    } finally {
      setLoading(false);
    }
  }, [planetId, navigate]);

  useEffect(() => {
    loadShipyard();
  }, [loadShipyard]);

  useEffect(() => {
    if (!socket) return;

    const handleShipCompleted = () => {
      loadShipyard();
    };

    socket.on('ship:completed', handleShipCompleted);

    return () => {
      socket.off('ship:completed', handleShipCompleted);
    };
  }, [socket, loadShipyard]);

  const buildShip = async () => {
    if (!selectedShip) return;

    setBuilding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/shipyard/${planetId}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipTypeId: selectedShip.id,
          quantity: buildQuantity,
        }),
      });

      if (response.ok) {
        await loadShipyard();
        setSelectedShip(null);
        setBuildQuantity(1);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to build ship:', error);
      alert('Fehler beim Bauen');
    } finally {
      setBuilding(false);
    }
  };

  const cancelBuild = async (queueId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/shipyard/${planetId}/queue/${queueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await loadShipyard();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to cancel build:', error);
    }
  };

  const canAfford = (ship: ShipType) => {
    if (!data) return false;
    const qty = selectedShip?.id === ship.id ? buildQuantity : 1;
    return (
      data.planet.credits >= ship.buildCost * qty &&
      data.planet.durastahl >= ship.buildCostDurastahl * qty &&
      data.planet.kristallinesSilizium >= ship.buildCostKristallinesSilizium * qty &&
      data.planet.tibannaGas >= ship.buildCostTibannaGas * qty &&
      data.planet.energiemodule >= ship.buildCostEnergiemodule * qty &&
      data.planet.kyberKristalle >= ship.buildCostKyberKristalle * qty &&
      data.planet.bacta >= ship.buildCostBacta * qty &&
      data.planet.beskar >= ship.buildCostBeskar * qty
    );
  };

  if (loading) {
    return <div className="text-white text-center py-12">Lade Raumschiffwerft...</div>;
  }

  if (!data) {
    return <div className="text-white text-center py-12">Raumschiffwerft nicht gefunden</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/planet/${planetId}`)}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Zurück zum Planeten
        </button>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Rocket size={32} className="text-cyan-400" />
          Raumschiffwerft - {data.planet.name}
        </h1>
      </div>

      {/* Build Queue */}
      {data.buildQueue.length > 0 && (
        <div className="bg-space-light p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} />
            Bauauträge
          </h2>
          <div className="space-y-3">
            {data.buildQueue.map((queue) => {
              const startTime = new Date(queue.constructionStartedAt).getTime();
              const buildTimeMs = queue.shipType.buildTime * 60 * 1000;
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, buildTimeMs - elapsed);
              const progress = Math.min(100, (elapsed / buildTimeMs) * 100);
              const remainingMinutes = Math.ceil(remaining / 60000);

              return (
                <div key={queue.id} className="bg-yellow-900/20 border border-yellow-700 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-yellow-300 font-semibold">
                        {queue.quantity}x {queue.shipType.name}
                      </p>
                      <p className="text-xs text-gray-400">{shipClassNames[queue.shipType.shipClass]}</p>
                    </div>
                    <button
                      onClick={() => cancelBuild(queue.id)}
                      className="text-red-400 hover:text-red-300 transition"
                      title="Abbrechen (50% Rückerstattung)"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-yellow-300 text-xs">
                    {Math.round(progress)}% - ~{remainingMinutes}m verbleibend
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Available Ships */}
        <div className="col-span-2">
          <div className="bg-space-light p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Verfügbare Schiffe</h2>
            <div className="grid grid-cols-2 gap-4">
              {data.availableShips.map((ship) => {
                const affordable = canAfford(ship);
                const isSelected = selectedShip?.id === ship.id;

                return (
                  <div
                    key={ship.id}
                    onClick={() => setSelectedShip(ship)}
                    className={`border rounded p-4 cursor-pointer transition ${
                      isSelected
                        ? 'ring-2 ring-cyan-500 border-cyan-500'
                        : affordable
                        ? shipClassColors[ship.shipClass]
                        : 'bg-gray-900/20 border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-semibold">{ship.name}</p>
                        <p className="text-xs text-gray-400">{shipClassNames[ship.shipClass]}</p>
                      </div>
                      {!affordable && (
                        <AlertCircle size={16} className="text-red-400" title="Nicht genug Ressourcen" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{ship.description}</p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div className="text-center">
                        <p className="text-gray-400">Angriff</p>
                        <p className="text-red-400 font-bold">{ship.attack}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400">Verteidigung</p>
                        <p className="text-blue-400 font-bold">{ship.defense}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400">Geschw.</p>
                        <p className="text-green-400 font-bold">{ship.speed}</p>
                      </div>
                    </div>

                    {/* Costs */}
                    <div className="space-y-1 text-xs">
                      {ship.buildCost > 0 && (
                        <div className="flex items-center gap-1">
                          <Coins size={12} className="text-yellow-400" />
                          <span className={data.planet.credits >= ship.buildCost ? 'text-gray-300' : 'text-red-400'}>
                            {ship.buildCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {ship.buildCostDurastahl > 0 && (
                        <div className="flex items-center gap-1">
                          <Wrench size={12} className="text-gray-400" />
                          <span className={data.planet.durastahl >= ship.buildCostDurastahl ? 'text-gray-300' : 'text-red-400'}>
                            {ship.buildCostDurastahl}
                          </span>
                        </div>
                      )}
                      {ship.buildCostKristallinesSilizium > 0 && (
                        <div className="flex items-center gap-1">
                          <Gem size={12} className="text-purple-400" />
                          <span className={data.planet.kristallinesSilizium >= ship.buildCostKristallinesSilizium ? 'text-gray-300' : 'text-red-400'}>
                            {ship.buildCostKristallinesSilizium}
                          </span>
                        </div>
                      )}
                      <p className="text-gray-400 mt-2">
                        <Clock size={12} className="inline mr-1" />
                        {ship.buildTime}m Bauzeit
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Build Panel */}
        <div className="col-span-1">
          {selectedShip ? (
            <div className="bg-space-light p-6 rounded-lg border border-cyan-700 sticky top-4">
              <h3 className="text-lg font-bold text-white mb-4">{selectedShip.name} bauen</h3>
              
              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Anzahl</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={buildQuantity}
                  onChange={(e) => setBuildQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Gesamtkosten</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Coins size={14} className="text-yellow-400" />
                      Credits
                    </span>
                    <span className={data.planet.credits >= selectedShip.buildCost * buildQuantity ? 'text-white' : 'text-red-400'}>
                      {(selectedShip.buildCost * buildQuantity).toLocaleString()}
                    </span>
                  </div>
                  {selectedShip.buildCostDurastahl > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wrench size={14} className="text-gray-400" />
                        Durastahl
                      </span>
                      <span className={data.planet.durastahl >= selectedShip.buildCostDurastahl * buildQuantity ? 'text-white' : 'text-red-400'}>
                        {selectedShip.buildCostDurastahl * buildQuantity}
                      </span>
                    </div>
                  )}
                  {selectedShip.buildCostKristallinesSilizium > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Gem size={14} className="text-purple-400" />
                        Krist. Silizium
                      </span>
                      <span className={data.planet.kristallinesSilizium >= selectedShip.buildCostKristallinesSilizium * buildQuantity ? 'text-white' : 'text-red-400'}>
                        {selectedShip.buildCostKristallinesSilizium * buildQuantity}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={buildShip}
                disabled={!canAfford(selectedShip) || building}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded transition"
              >
                {building ? 'Baue...' : `${buildQuantity}x ${selectedShip.name} bauen`}
              </button>
            </div>
          ) : (
            <div className="bg-space-light p-6 rounded-lg border border-gray-700 text-center text-gray-400">
              <Rocket size={48} className="mx-auto mb-4 opacity-50" />
              <p>Wähle ein Schiff aus</p>
            </div>
          )}
        </div>
      </div>

      {/* Ships at Planet */}
      {data.ships.length > 0 && (
        <div className="bg-space-light p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Schiffe am Planeten</h2>
          <div className="grid grid-cols-4 gap-3">
            {data.ships.map((ship) => (
              <div key={ship.id} className={`border rounded p-3 ${shipClassColors[ship.shipType.shipClass]}`}>
                <p className="text-white font-semibold text-sm">{ship.shipType.name}</p>
                <p className="text-xs text-gray-400">{shipClassNames[ship.shipType.shipClass]}</p>
                <div className="mt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hülle</span>
                    <span className="text-green-400">{ship.health}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
