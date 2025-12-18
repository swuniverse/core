import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Users, Star } from 'lucide-react';
import api from '../lib/api';

interface Planet {
  id: string;
  name: string;
  planetType: string;
  orbitRadius: number;
  orbitAngle: number;
  fieldX: number;
  fieldY: number;
  player?: {
    id: string;
    username: string;
    faction: {
      id: string;
      name: string;
    };
  };
}

interface System {
  id: string;
  name: string;
  systemType: 'SINGLE_STAR' | 'BINARY_STAR' | 'NEUTRON_STAR' | 'BLACK_HOLE';
  fieldX: number;
  fieldY: number;
  gridSize: number;
  sector: {
    x: number;
    y: number;
  };
  planets: Planet[];
}

export default function SystemView() {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<System | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadSystemData();
  }, [systemId]);

  const loadSystemData = async () => {
    if (!systemId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/galaxy/system/${systemId}`);
      setSystem(response.data);
    } catch (err: any) {
      console.error('Failed to load system:', err);
      setError(err.response?.data?.error || 'Fehler beim Laden des Systems');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemTypeLabel = (type: System['systemType']) => {
    switch (type) {
      case 'SINGLE_STAR': return 'Einzelstern';
      case 'BINARY_STAR': return 'Doppelsternsystem';
      case 'NEUTRON_STAR': return 'Neutronenstern';
      case 'BLACK_HOLE': return 'Schwarzes Loch';
      default: return type;
    }
  };

  const getPlanetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DESERT: 'Wüstenplanet',
      OCEAN: 'Ozeanplanet',
      JUNGLE: 'Dschungelplanet',
      ICE: 'Eisplanet',
      VOLCANIC: 'Vulkanplanet',
      TERRAN: 'Erdähnlich',
      BARREN: 'Öde',
      GAS_GIANT: 'Gasriese'
    };
    return labels[type] || type;
  };

  const getPlanetColor = (type: string) => {
    const colors: Record<string, string> = {
      DESERT: '#d4a574',
      OCEAN: '#4a9eff',
      JUNGLE: '#4a9e4a',
      ICE: '#a3d4ff',
      VOLCANIC: '#ff6b4a',
      TERRAN: '#6ba3ff',
      BARREN: '#8b7355',
      GAS_GIANT: '#ffa366'
    };
    return colors[type] || '#888888';
  };

  const convertPlanetToGridPosition = (planet: Planet) => {
    if (!system) return { x: 0, y: 0 };
    // Convert orbital position (radius/angle) to grid coordinates
    const center = Math.floor(system.gridSize / 2);
    const angleRad = (planet.orbitAngle * Math.PI) / 180;
    const x = Math.round(center + planet.orbitRadius * Math.cos(angleRad));
    const y = Math.round(center + planet.orbitRadius * Math.sin(angleRad));
    return { x: Math.max(1, Math.min(system.gridSize, x)), y: Math.max(1, Math.min(system.gridSize, y)) };
  };

  const getCellContent = (x: number, y: number) => {
    if (!system) return { type: 'empty' };
    const center = Math.floor(system.gridSize / 2);
    
    // Check if this is the star position (center of grid)
    if (x === center && y === center) {
      return { type: 'star', data: system };
    }

    // For binary stars, also show second star offset
    if (system?.systemType === 'BINARY_STAR' && x === center + 1 && y === center) {
      return { type: 'star2', data: system };
    }

    // Check for planets
    const planet = system?.planets.find(p => {
      const pos = convertPlanetToGridPosition(p);
      return pos.x === x && pos.y === y;
    });

    if (planet) {
      return { type: 'planet', data: planet };
    }

    // Random asteroid fields for visual interest
    const asteroidSeed = (x * 1000 + y) % 100;
    if (asteroidSeed < 3 && Math.abs(x - center) > 3 && Math.abs(y - center) > 3) {
      return { type: 'asteroid', data: null };
    }

    return { type: 'empty', data: null };
  };

  const getPlanetPosition = (planet: Planet) => {
    // Calculate position on orbit based on angle and radius
    // Center is at 50%, radius is relative to container size
    const centerX = 50;
    const centerY = 50;
    const radiusPercent = planet.orbitRadius * 6; // Scale factor for visual appeal
    const angleRad = (planet.orbitAngle * Math.PI) / 180;
    
    const x = centerX + radiusPercent * Math.cos(angleRad);
    const y = centerY + radiusPercent * Math.sin(angleRad);
    
    return { x, y };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Lade System...</p>
        </div>
      </div>
    );
  }

  if (error || !system) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-red-400">{error || 'System nicht gefunden'}</p>
        <button
          onClick={() => navigate('/galaxy')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Zurück zur Galaxie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-space-light rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/galaxy')}
              className="p-2 hover:bg-gray-700 rounded transition"
            >
              <ArrowLeft className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="text-yellow-400" />
                {system.name}
              </h1>
              <p className="text-sm text-gray-400">
                {getSystemTypeLabel(system.systemType)} • Koordinaten: {system.fieldX}|{system.fieldY}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grid View */}
        <div className="flex-1 bg-space-light rounded-lg p-4">
          <div className="overflow-auto">
            <table className="border-collapse" style={{ minWidth: '800px' }}>
              {/* Column headers */}
              <thead>
                <tr>
                  <th className="w-6 h-6"></th>
                  {Array.from({ length: system.gridSize }, (_, i) => i + 1).map(x => (
                    <th key={x} className="w-6 h-6 text-xs text-gray-400 font-normal">{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: system.gridSize }, (_, y) => {
                  const row = y + 1;
                  return (
                    <tr key={row}>
                      {/* Row header */}
                      <td className="w-6 h-6 text-xs text-gray-400 text-right pr-1">{row}</td>
                      {/* Grid cells */}
                      {Array.from({ length: system.gridSize }, (_, x) => {
                        const col = x + 1;
                        const cell = getCellContent(col, row);
                        const isHovered = hoveredCell?.x === col && hoveredCell?.y === row;

                        return (
                          <td
                            key={col}
                            className="w-6 h-6 border border-gray-800 relative group cursor-pointer"
                            onMouseEnter={() => setHoveredCell({ x: col, y: row })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => cell.type === 'planet' && navigate(`/planet/${cell.data.id}`)}
                          >
                            {/* Star */}
                            {cell.type === 'star' && (
                              <div className="w-full h-full bg-yellow-400 shadow-lg shadow-yellow-400/50" />
                            )}
                            {cell.type === 'star2' && (
                              <div className="w-full h-full bg-orange-400 shadow-lg shadow-orange-400/50" />
                            )}

                            {/* Planet */}
                            {cell.type === 'planet' && (
                              <div 
                                className="w-full h-full rounded-full transition-transform hover:scale-150"
                                style={{ backgroundColor: getPlanetColor(cell.data.planetType) }}
                              />
                            )}

                            {/* Asteroid */}
                            {cell.type === 'asteroid' && (
                              <div className="w-full h-full bg-gray-600" style={{ 
                                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                              }} />
                            )}

                            {/* Hover highlight */}
                            {isHovered && cell.type !== 'empty' && (
                              <div className="absolute inset-0 border-2 border-white pointer-events-none" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 space-y-4">
          {/* System Info */}
          <div className="bg-space-light rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">{system.name}</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-400">Typ: <span className="text-white">{getSystemTypeLabel(system.systemType)}</span></p>
              <p className="text-gray-400">Koordinaten: <span className="text-white">{system.fieldX}|{system.fieldY}</span></p>
            </div>
          </div>

          {/* Hovered Cell Info */}
          {hoveredCell && (() => {
            const cell = getCellContent(hoveredCell.x, hoveredCell.y);
            if (cell.type === 'planet') {
              const planet = cell.data as Planet;
              return (
                <div className="bg-space-light rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white">{planet.name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{getPlanetTypeLabel(planet.planetType)}</p>
                  <p className="text-xs text-gray-500 mb-2">Position: {hoveredCell.x}|{hoveredCell.y}</p>
                  {planet.player ? (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Users size={14} className="text-blue-400" />
                      <span className="text-gray-300">{planet.player.username}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">{planet.player.faction.name}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-green-400">Unbesiedelt</p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Planet List */}
          <div className="bg-space-light rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MapPin className="text-blue-400" />
              Planeten ({system.planets.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {system.planets.map(planet => {
                const pos = convertPlanetToGridPosition(planet);
                return (
                  <div
                    key={planet.id}
                    className="bg-gray-700 rounded p-2 hover:bg-gray-600 cursor-pointer transition text-sm"
                    onClick={() => navigate(`/planet/${planet.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white text-sm">{planet.name}</h3>
                      <span className="text-xs text-gray-400">{pos.x}|{pos.y}</span>
                    </div>
                    <p className="text-xs text-gray-400">{getPlanetTypeLabel(planet.planetType)}</p>
                    {planet.player && (
                      <p className="text-xs text-blue-400 mt-1">{planet.player.username}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
