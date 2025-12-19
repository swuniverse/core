import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Battery, AlertTriangle, Navigation } from 'lucide-react';
import api from '../lib/api';
import { useGameStore } from '../stores/gameStore';

interface ShipData {
  ship: {
    id: number;
    name: string | null;
    status: string;
    currentSystemId: number | null;
    position: {
      galaxyX: number | null;
      galaxyY: number | null;
      systemX: number | null;
      systemY: number | null;
    };
    destination: {
      x: number | null;
      y: number | null;
    };
    energy: {
      weapons: number;
      drive: number;
      maxWeapons: number;
      maxDrive: number;
    };
    health: number;
    crew: number;
    range: number;
  };
  shipType: {
    name: string;
    sensorRange: number;
    driveEfficiency: number;
    attack: number;
    defense: number;
  };
  sensorView: {
    range: number;
    center: { x: number; y: number };
    ships: Array<{
      id: number;
      currentGalaxyX: number;
      currentGalaxyY: number;
    }>;
    systems: Array<{
      id: number;
      name: string;
      systemType: string;
      galaxyX: number;
      galaxyY: number;
    }>;
    planets: Array<{
      id: number;
      name: string;
      orbitRadius: number;
      orbitAngle: number;
      owner: string | null;
      faction: string | null;
    }>;
    systemGridSize: number;
  };
}

export default function Ship() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useGameStore();
  const [shipData, setShipData] = useState<ShipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [charging, setCharging] = useState(false);
  const [viewMode, setViewMode] = useState<'galaxy' | 'system'>('galaxy');

  const loadShipData = useCallback(async () => {
    try {
      const response = await api.get(`/ship/${id}`);
      setShipData(response.data);
      
      // Set initial view mode based on ship location
      if (response.data.ship.currentSystemId) {
        setViewMode('system');
      } else {
        setViewMode('galaxy');
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden des Schiffs');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadShipData();
  }, [loadShipData]);

  // Listen for real-time ship updates
  useEffect(() => {
    if (!socket || !id) return;

    const handleShipMoved = (data: any) => {
      if (data.shipId === parseInt(id)) {
        loadShipData();
      }
    };

    const handleShipArrived = (data: any) => {
      if (data.shipId === parseInt(id)) {
        loadShipData();
      }
    };

    const handleShipStranded = (data: any) => {
      if (data.shipId === parseInt(id)) {
        loadShipData();
      }
    };

    socket.on('ship:moved', handleShipMoved);
    socket.on('ship:arrived', handleShipArrived);
    socket.on('ship:stranded', handleShipStranded);

    return () => {
      socket.off('ship:moved', handleShipMoved);
      socket.off('ship:arrived', handleShipArrived);
      socket.off('ship:stranded', handleShipStranded);
    };
  }, [socket, id, loadShipData]);

  const chargeEnergy = async (type: 'weapons' | 'drive', amount: number) => {
    if (!shipData) return;
    setCharging(true);

    try {
      await api.post(`/ship/${id}/charge`, { type, amount });
      await loadShipData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Aufladen');
    } finally {
      setCharging(false);
    }
  };

  const setDestination = async (targetX: number, targetY: number) => {
    if (!shipData) return;

    try {
      if (viewMode === 'system') {
        // System-internal navigation
        await api.post(`/ship/${id}/move-system`, { targetX, targetY });
        await loadShipData();
      } else {
        // Galaxy (hyperspace) navigation - just fly there
        await api.post(`/ship/${id}/move`, { targetX, targetY });
        await loadShipData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Flug');
    }
  };

  const enterSystem = async () => {
    try {
      const response = await api.post(`/ship/${id}/enter-system`);
      alert(response.data.message);
      await loadShipData();
      setViewMode('system');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim System-Eintritt');
    }
  };

  const leaveSystem = async () => {
    try {
      const response = await api.post(`/ship/${id}/leave-system`);
      alert(response.data.message);
      await loadShipData();
      setViewMode('galaxy');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim System-Verlassen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Lade Schiffsdaten...</div>
      </div>
    );
  }

  if (error || !shipData) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
        <p className="text-red-200">{error || 'Schiff nicht gefunden'}</p>
        <button
          onClick={() => navigate('/fleet')}
          className="text-rebel hover:underline mt-2 inline-block"
        >
          ← Zurück zu Schiffe
        </button>
      </div>
    );
  }

  const { ship, shipType, sensorView } = shipData;

  // Determine if ship is in a system or in hyperspace
  const isInSystem = ship.currentSystemId !== null;
  
  // Check if ship is at a system position (in galaxy mode)
  const systemAtShipPosition = sensorView.systems.find(
    s => s.galaxyX === ship.position.galaxyX && s.galaxyY === ship.position.galaxyY
  );

  // Build sensor grid based on mode
  const sensorGrid: Array<Array<any>> = [];
  const gridSize = sensorView.range * 2 + 1;
  
  for (let y = 0; y < gridSize; y++) {
    sensorGrid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      if (viewMode === 'galaxy') {
        // Galaxy mode: show galaxy coordinates
        const actualX = sensorView.center.x - sensorView.range + x;
        const actualY = sensorView.center.y - sensorView.range + y;
        
        sensorGrid[y][x] = {
          x: actualX,
          y: actualY,
          mode: 'galaxy',
          ships: sensorView.ships.filter(s => s.currentGalaxyX === actualX && s.currentGalaxyY === actualY),
          system: sensorView.systems.find(sys => sys.galaxyX === actualX && sys.galaxyY === actualY),
          planets: [],
        };
      } else {
        // System mode: show system-internal coordinates
        const actualX = (ship.position.systemX || 0) - sensorView.range + x;
        const actualY = (ship.position.systemY || 0) - sensorView.range + y;
        
        // Calculate planet positions (orbit-based)
        // System center is at gridSize/2
        const systemCenter = Math.floor(sensorView.systemGridSize / 2);
        const planetsAtPosition = sensorView.planets.filter(p => {
          // Convert orbit to cartesian coordinates
          const angleRad = (p.orbitAngle * Math.PI) / 180;
          const planetX = Math.round(systemCenter + p.orbitRadius * Math.cos(angleRad));
          const planetY = Math.round(systemCenter + p.orbitRadius * Math.sin(angleRad));
          return planetX === actualX && planetY === actualY;
        });
        
        sensorGrid[y][x] = {
          x: actualX,
          y: actualY,
          mode: 'system',
          ships: [],
          system: null,
          planets: planetsAtPosition,
        };
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/fleet')}
          className="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-2"
        >
          <ArrowLeft size={20} />
          Zurück zu Schiffe
        </button>
        <h1 className="text-3xl font-bold text-white">
          {ship.name || `${shipType.name} ${ship.id}`}
        </h1>
        <p className="text-gray-400">{shipType.name} • Status: {ship.status === 'DOCKED' ? 'Angedockt' : ship.status === 'IN_FLIGHT' ? 'Im Flug' : 'Gestrandet'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* LEFT: Sensor View (STU-Style) */}
        <div className="bg-space-light p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Sensoren (Reichweite: {sensorView.range})</h2>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('galaxy')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'galaxy' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Hyperraum
              </button>
              <button
                onClick={() => setViewMode('system')}
                disabled={!isInSystem}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'system' 
                    ? 'bg-blue-600 text-white' 
                    : isInSystem
                      ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                System
              </button>
            </div>
          </div>
          
          <div className="overflow-auto">
            <table className="border-collapse mx-auto">
              <tbody>
                {sensorGrid.map((row, y) => (
                  <tr key={y}>
                    {row.map((cell, x) => {
                      const isCenterGalaxy = viewMode === 'galaxy' && cell.x === sensorView.center.x && cell.y === sensorView.center.y;
                      const isCenterSystem = viewMode === 'system' && cell.x === ship.position.systemX && cell.y === ship.position.systemY;
                      const isCenter = isCenterGalaxy || isCenterSystem;
                      const hasShips = cell.ships.length > 0;
                      const hasSystem = !!cell.system;
                      const hasPlanets = cell.planets && cell.planets.length > 0;

                      return (
                        <td
                          key={x}
                          onClick={() => !isCenter && setDestination(cell.x, cell.y)}
                          className={`w-12 h-12 border-2 cursor-pointer relative text-center transition-all ${
                            isCenter 
                              ? 'bg-yellow-500 border-yellow-400 ring-2 ring-yellow-300' 
                              : hasSystem && viewMode === 'galaxy' 
                                ? 'bg-blue-800 border-blue-600 hover:bg-blue-700' 
                                : hasPlanets && viewMode === 'system'
                                  ? 'bg-green-800 border-green-600 hover:bg-green-700'
                                  : 'bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                          }`}
                          title={`${cell.x}|${cell.y}${hasSystem ? ` - ${cell.system.name}` : ''}${hasPlanets ? ` - ${cell.planets[0].name}` : ''}`}
                        >
                          <div className="flex items-center justify-center h-full">
                            {hasShips && !isCenter && (
                              <span className="text-red-400 font-bold text-sm">{cell.ships.length}</span>
                            )}
                            {isCenter && (
                              <span className="text-white font-bold text-2xl">●</span>
                            )}
                            {hasSystem && viewMode === 'galaxy' && !isCenter && (
                              <span className="text-yellow-400 text-xl">★</span>
                            )}
                            {hasPlanets && viewMode === 'system' && !isCenter && (
                              <span className="text-green-400 text-xl">◉</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-white mb-1">{viewMode === 'galaxy' ? 'Hyperraum-Modus' : 'System-Modus'}</p>
            {viewMode === 'galaxy' ? (
              <>
                <p>Galaxy-Position: {ship.position.galaxyX || '?'}|{ship.position.galaxyY || '?'}</p>
                {ship.destination.x && (
                  <p className="text-blue-400">→ Ziel: {ship.destination.x}|{ship.destination.y}</p>
                )}
                <p className="text-gray-500 italic mt-2">Klicke auf ein Feld zum Hyperraum-Sprung</p>
              </>
            ) : (
              <>
                <p>System-Position: {ship.position.systemX || '?'}|{ship.position.systemY || '?'}</p>
                <p className="text-gray-500 italic mt-2">Klicke auf ein Feld um zu fliegen (1 Energie/Feld)</p>
              </>
            )}
            
            {/* System Enter/Leave Buttons */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              {!isInSystem && ship.status === 'DOCKED' && systemAtShipPosition && (
                <button
                  onClick={enterSystem}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-semibold"
                >
                  System betreten: {systemAtShipPosition.name}
                </button>
              )}
              {isInSystem && (
                <button
                  onClick={leaveSystem}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded text-sm font-semibold"
                >
                  System verlassen (Hyperraum)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Ship Control Panel */}
        <div className="space-y-4">
          {/* Energy Status */}
          <div className="bg-space-light p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Energiesysteme</h3>
            
            {/* Drive Energy */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-300 text-sm flex items-center gap-1">
                  <Battery size={16} />
                  Antriebsenergie
                </span>
                <span className="text-white text-sm">{ship.energy.drive} / {ship.energy.maxDrive}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(ship.energy.drive / ship.energy.maxDrive) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Reichweite: {ship.range} Felder (1 Energie = 1 Feld)</p>
              
              {ship.status === 'DOCKED' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => chargeEnergy('drive', 100)}
                    disabled={charging}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    +100
                  </button>
                  <button
                    onClick={() => chargeEnergy('drive', ship.energy.maxDrive)}
                    disabled={charging}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              )}
            </div>

            {/* Weapons Energy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-yellow-300 text-sm flex items-center gap-1">
                  <Zap size={16} />
                  Waffenenergie
                </span>
                <span className="text-white text-sm">{ship.energy.weapons} / {ship.energy.maxWeapons}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${(ship.energy.weapons / ship.energy.maxWeapons) * 100}%` }}
                />
              </div>
              
              {ship.status === 'DOCKED' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => chargeEnergy('weapons', 50)}
                    disabled={charging}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    +50
                  </button>
                  <button
                    onClick={() => chargeEnergy('weapons', ship.energy.maxWeapons)}
                    disabled={charging}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ship Stats */}
          <div className="bg-space-light p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Schiffsdaten</h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Angriff</p>
                <p className="text-white">{shipType.attack}</p>
              </div>
              <div>
                <p className="text-gray-400">Verteidigung</p>
                <p className="text-white">{shipType.defense}</p>
              </div>
              <div>
                <p className="text-gray-400">Hülle</p>
                <p className="text-white">{ship.health}%</p>
              </div>
              <div>
                <p className="text-gray-400">Besatzung</p>
                <p className="text-white">{ship.crew}</p>
              </div>
              <div>
                <p className="text-gray-400">Verbrauch</p>
                <p className="text-white">1 Energie/Feld</p>
              </div>
              <div>
                <p className="text-gray-400">Sensoren</p>
                <p className="text-white">{shipType.sensorRange} Felder</p>
              </div>
            </div>
          </div>

          {/* Status Warnings */}
          {ship.status === 'STRANDED' && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <span className="font-semibold">Schiff gestrandet!</span>
              </div>
              <p className="text-red-300 text-sm mt-2">
                Keine Antriebsenergie mehr verfügbar. Schiff kann nicht weiterfliegen.
              </p>
            </div>
          )}

          {ship.status === 'IN_FLIGHT' && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Navigation size={20} />
                <span className="font-semibold">Im Flug</span>
              </div>
              <p className="text-blue-300 text-sm mt-2">
                Ziel: {ship.destination.x}|{ship.destination.y}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
