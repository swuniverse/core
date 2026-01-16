import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Users, Star } from 'lucide-react';
import api from '../lib/api';
import PlanetImage, { getPlanetClassLabel } from '../components/PlanetImage';
import MoonImage, { getMoonClassLabel } from '../components/MoonImage';
import AsteroidField, { getAsteroidFieldLabel } from '../components/AsteroidField';
import SunImage from '../components/SunImage';

interface Planet {
  id: string;
  name: string;
  planetClass: string;
  visualSeed?: number;
  orbitRadius: number;
  orbitAngle: number;
  gridX?: number;
  gridY?: number;
  celestialType: 'PLANET' | 'MOON' | 'ASTEROID_FIELD';
  asteroidVariant?: 'NORMAL' | 'GREEN' | 'RED' | 'ICE';  // For ASTEROID_FIELD types
  parentPlanetId?: string;
  player?: {
    id: string;
    username: string;
    faction: {
      id: string;
      name: string;
    };
  };
  moons?: Planet[];  // Nested moons for this planet
  // Resource data for asteroid fields
  durastahl?: number;
  kristallinesSilizium?: number;
}

// SystemObject interface removed - all system objects are now Planet records with celestialType=ASTEROID_FIELD

interface System {
  id: string;
  name: string;
  systemType: 'SMALL_BLUE' | 'SMALL_YELLOW' | 'MEDIUM_BLUE' | 'BLUE_GIANT' | 'RED_DWARF' | 'NEUTRON_STAR' | 'BLACK_HOLE' | 'BINARY_SYSTEM';
  fieldX: number;
  fieldY: number;
  gridSize: number;
  sector: {
    x: number;
    y: number;
  };
  planets: Planet[];  // Now includes all celestial objects (planets, moons, asteroid fields)
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
    const labels: Record<string, string> = {
      'SMALL_BLUE': 'Kleiner Blauer Stern',
      'SMALL_YELLOW': 'Kleiner Gelber Stern',
      'MEDIUM_BLUE': 'Mittlerer Blauer Stern',
      'BLUE_GIANT': 'Blauer Riese',
      'RED_DWARF': 'Roter Zwerg',
      'NEUTRON_STAR': 'Neutronenstern',
      'BLACK_HOLE': 'Schwarzes Loch',
      'BINARY_SYSTEM': 'Doppelsternsystem',
    };
    return labels[type] || type;
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

    // STU-style: Central star takes 3x3 area
    const isInStarArea = (
      x >= center - 1 && x <= center + 1 &&
      y >= center - 1 && y <= center + 1
    );

    if (isInStarArea) {
      // Different parts of the 3x3 star
      if (x === center && y === center) {
        return { type: 'star_center', data: system };
      } else {
        return { type: 'star_outer', data: system };
      }
    }

    // Check for asteroid fields (previously system objects) first
    const asteroidField = system?.planets?.find(planet =>
      planet.celestialType === 'ASTEROID_FIELD' && planet.gridX === x && planet.gridY === y
    );
    if (asteroidField) {
      return { type: 'asteroid_field', data: asteroidField };
    }

    // Check for planets and moons
    const celestialBody = system?.planets?.find(p => {
      // Use gridX/gridY if available, otherwise convert orbital position
      if (p.gridX !== undefined && p.gridY !== undefined) {
        return p.gridX === x && p.gridY === y;
      } else {
        // Fallback to orbital position conversion
        const pos = convertPlanetToGridPosition(p);
        return pos.x === x && pos.y === y;
      }
    });

    if (celestialBody) {
      if (celestialBody.celestialType === 'MOON') {
        return { type: 'moon', data: celestialBody };
      } else {
        return { type: 'planet', data: celestialBody };
      }
    }

    return { type: 'empty', data: null };
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
    <div className="space-y-6">
      {/* Imperial Command System Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/galaxy')}
            className="flex items-center gap-2 text-cyan-400/70 hover:text-cyan-300 transition-all font-mono"
          >
            <div className="p-1 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <ArrowLeft size={16} />
            </div>
            <span className="tracking-wider">GALAXIE</span>
          </button>
          <div className="flex items-center gap-4 flex-1">
            <div className="p-2 bg-yellow-900/40 border border-yellow-500/40 rounded">
              <Star className="text-yellow-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">{system.name.toUpperCase()}</h1>
              <div className="flex items-center gap-4 text-sm font-mono">
                <span className="text-cyan-400/70">TYP: {getSystemTypeLabel(system.systemType).toUpperCase()}</span>
                <span className="text-cyan-400/70">KOORDINATEN: {system.sector.x * 20 + system.fieldX}|{system.sector.y * 20 + system.fieldY}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Imperial Command Grid View */}
        <div className="flex-1 bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded p-6 backdrop-blur-sm">
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
                            className="border border-gray-800 relative group cursor-pointer"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            onMouseEnter={() => setHoveredCell({ x: col, y: row })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => (cell.type === 'planet' || cell.type === 'moon') && cell.data && navigate(`/planet/${cell.data.id}`)}
                          >
                            {/* STU-style 3x3 Central Star */}
                            {cell.type === 'star_center' && (
                              <div className="w-full h-full flex items-center justify-center">
                                <SunImage
                                  systemType={system.systemType}
                                  size={24}
                                  alt={system.name}
                                  className="drop-shadow-lg"
                                />
                              </div>
                            )}
                            {cell.type === 'star_outer' && (
                              <div className="w-full h-full" style={{
                                background: `radial-gradient(circle, rgba(255,255,200,0.1) 0%, rgba(255,255,100,0.05) 70%, transparent 100%)`
                              }} />
                            )}

                            {/* Planets */}
                            {cell.type === 'planet' && cell.data && 'planetClass' in cell.data && (
                              <div className="w-full h-full flex items-center justify-center">
                                <PlanetImage
                                  planetClass={cell.data.planetClass}
                                  visualSeed={cell.data.visualSeed || 1}
                                  alt={cell.data.name || 'Planet'}
                                  size={20}
                                  className="transition-transform hover:scale-125"
                                />
                              </div>
                            )}

                            {/* Moons */}
                            {cell.type === 'moon' && cell.data && 'planetClass' in cell.data && (
                              <div className="w-full h-full flex items-center justify-center">
                                <MoonImage
                                  planetClass={cell.data.planetClass}
                                  visualSeed={cell.data.visualSeed || 1}
                                  alt={cell.data.name || 'Mond'}
                                  size={16}
                                  className="transition-transform hover:scale-125 opacity-90"
                                />
                              </div>
                            )}

                            {/* Asteroid Fields */}
                            {cell.type === 'asteroid_field' && cell.data && (
                              <div className="w-full h-full flex items-center justify-center">
                                <AsteroidField
                                  asteroidVariant={(cell.data as Planet).asteroidVariant || 'NORMAL'}
                                  visualSeed={(cell.data as Planet).visualSeed || 1}
                                  alt={(cell.data as Planet).name || 'Asteroidenfeld'}
                                  size={18}
                                  className="transition-transform hover:scale-110"
                                  resources={{
                                    durastahl: (cell.data as Planet).durastahl,
                                    kristallinesSilizium: (cell.data as Planet).kristallinesSilizium
                                  }}
                                />
                              </div>
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

        {/* Imperial Command Info Panel */}
        <div className="w-80 space-y-6">
          {/* System Info */}
          <div className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded p-4 backdrop-blur-sm">
            <div className="mb-3 pb-2 border-b border-cyan-500/20">
              <h3 className="text-cyan-100 font-semibold font-mono tracking-wider">{system.name.toUpperCase()}</h3>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-cyan-400/70">TYP:</span>
                <span className="text-cyan-100">{getSystemTypeLabel(system.systemType).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-400/70">KOORDINATEN:</span>
                <span className="text-cyan-100">{system.sector.x * 20 + system.fieldX}|{system.sector.y * 20 + system.fieldY}</span>
              </div>
            </div>
          </div>

          {/* STU-style Hover Info */}
          {hoveredCell && (() => {
            const cell = getCellContent(hoveredCell.x, hoveredCell.y);

            if (cell.type === 'star_center' || cell.type === 'star_outer') {
              return (
                <div className="bg-gradient-to-br from-yellow-950/40 to-orange-950/40 border border-yellow-500/30 rounded p-4 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-yellow-100">{system.name}</h3>
                  <p className="text-sm text-yellow-400/70">{getSystemTypeLabel(system.systemType)}</p>
                  <p className="text-xs text-yellow-600/60 mb-2">Position: {hoveredCell.x}|{hoveredCell.y}</p>
                  <p className="text-xs text-yellow-400/80">Zentrales Sternsystem</p>
                </div>
              );
            }

            if (cell.type === 'planet') {
              const planet = cell.data as Planet;
              return (
                <div className="bg-gradient-to-br from-blue-950/40 to-cyan-950/40 border border-cyan-500/30 rounded p-4 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-cyan-100">{planet.name}</h3>
                  <p className="text-sm text-cyan-400/70">{getPlanetClassLabel(planet.planetClass)}</p>
                  <p className="text-xs text-cyan-600/60 mb-2">Position: {hoveredCell.x}|{hoveredCell.y}</p>
                  {planet.player ? (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Users size={14} className="text-blue-400" />
                      <span className="text-cyan-300">{planet.player.username}</span>
                      <span className="text-cyan-600">•</span>
                      <span className="text-cyan-400/70">{planet.player.faction.name}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-green-400">Unbesiedelt</p>
                  )}
                </div>
              );
            }

            if (cell.type === 'moon') {
              const moon = cell.data as Planet;
              return (
                <div className="bg-gradient-to-br from-gray-950/40 to-slate-950/40 border border-gray-500/30 rounded p-4 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-gray-100">{moon.name}</h3>
                  <p className="text-sm text-gray-400/70">{getMoonClassLabel(moon.planetClass)}</p>
                  <p className="text-xs text-gray-600/60 mb-2">Position: {hoveredCell.x}|{hoveredCell.y}</p>
                  <p className="text-xs text-gray-400/80">Mond - Orbitalkörper</p>
                  {moon.player ? (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Users size={14} className="text-blue-400" />
                      <span className="text-gray-300">{moon.player.username}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400/70">{moon.player.faction.name}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-green-400">Unbesiedelt</p>
                  )}
                </div>
              );
            }

            if (cell.type === 'asteroid_field') {
              const asteroidField = cell.data as Planet;
              const hasResources = asteroidField.durastahl || asteroidField.kristallinesSilizium;

              return (
                <div className="bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/30 rounded p-4 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-purple-100">{asteroidField.name}</h3>
                  <p className="text-sm text-purple-400/70">{getAsteroidFieldLabel(asteroidField.asteroidVariant || 'NORMAL')}</p>
                  <p className="text-xs text-purple-600/60 mb-2">Position: {hoveredCell.x}|{hoveredCell.y}</p>

                  {hasResources && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-purple-400/80 font-mono">RESSOURCEN:</p>
                      {asteroidField.durastahl && (
                        <div className="flex justify-between text-xs">
                          <span className="text-yellow-400">Durastahl:</span>
                          <span className="text-yellow-300 font-mono">{asteroidField.durastahl.toLocaleString()}</span>
                        </div>
                      )}
                      {asteroidField.kristallinesSilizium && (
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-400">Kristallines Silizium:</span>
                          <span className="text-blue-300 font-mono">{asteroidField.kristallinesSilizium.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })()}

          {/* Imperial Command Object List - STU-style comprehensive listing */}
          <div className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded p-4 backdrop-blur-sm">
            <div className="mb-4 pb-2 border-b border-cyan-500/20">
              <h2 className="text-lg font-semibold text-cyan-100 flex items-center gap-2 font-mono tracking-wider">
                <MapPin className="text-cyan-400" size={18} />
                OBJEKTE ({system.planets.length})
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Planets */}
              {system.planets.filter(p => p.celestialType === 'PLANET').map(planet => {
                const pos = planet.gridX && planet.gridY
                  ? { x: planet.gridX, y: planet.gridY }
                  : convertPlanetToGridPosition(planet);
                return (
                  <div
                    key={planet.id}
                    className="bg-slate-950/30 border border-slate-700/40 rounded p-3 hover:border-cyan-500/40 hover:bg-slate-950/40 cursor-pointer transition-all text-sm"
                    onClick={() => navigate(`/planet/${planet.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-cyan-100 font-mono">{planet.name}</h3>
                      <span className="text-xs text-cyan-400/60 font-mono">{pos.x}|{pos.y}</span>
                    </div>
                    <p className="text-xs text-cyan-400/70 font-mono">{getPlanetClassLabel(planet.planetClass).toUpperCase()}</p>
                    {planet.player && (
                      <p className="text-xs text-blue-400 mt-2 font-mono">{planet.player.username.toUpperCase()}</p>
                    )}
                  </div>
                );
              })}

              {/* Moons */}
              {system.planets.filter(p => p.celestialType === 'MOON').map(moon => {
                const pos = moon.gridX && moon.gridY
                  ? { x: moon.gridX, y: moon.gridY }
                  : convertPlanetToGridPosition(moon);
                return (
                  <div
                    key={moon.id}
                    className="bg-gray-950/30 border border-gray-700/40 rounded p-3 hover:border-gray-500/40 hover:bg-gray-950/40 cursor-pointer transition-all text-sm"
                    onClick={() => navigate(`/planet/${moon.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-100 font-mono">{moon.name}</h3>
                      <span className="text-xs text-gray-400/60 font-mono">{pos.x}|{pos.y}</span>
                    </div>
                    <p className="text-xs text-gray-400/70 font-mono">{getMoonClassLabel(moon.planetClass).toUpperCase()}</p>
                    {moon.player && (
                      <p className="text-xs text-blue-400 mt-2 font-mono">{moon.player.username.toUpperCase()}</p>
                    )}
                  </div>
                );
              })}

              {/* Asteroid Fields */}
              {system.planets?.filter(planet => planet.celestialType === 'ASTEROID_FIELD').map(asteroidField => (
                <div
                  key={asteroidField.id}
                  className="bg-purple-950/30 border border-purple-700/40 rounded p-3 hover:border-purple-500/40 hover:bg-purple-950/40 transition-all text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-purple-100 font-mono">{asteroidField.name}</h3>
                    <span className="text-xs text-purple-400/60 font-mono">{asteroidField.gridX}|{asteroidField.gridY}</span>
                  </div>
                  <p className="text-xs text-purple-400/70 font-mono">{getAsteroidFieldLabel(asteroidField.asteroidVariant || 'NORMAL').toUpperCase()}</p>
                  {(asteroidField.durastahl || asteroidField.kristallinesSilizium) && (
                    <div className="mt-2 text-xs space-y-1">
                      {asteroidField.durastahl && (
                        <div className="flex justify-between">
                          <span className="text-yellow-400 font-mono">DURASTAHL:</span>
                          <span className="text-yellow-300 font-mono">{asteroidField.durastahl.toLocaleString()}</span>
                        </div>
                      )}
                      {asteroidField.kristallinesSilizium && (
                        <div className="flex justify-between">
                          <span className="text-blue-400 font-mono">KRISTALLIN:</span>
                          <span className="text-blue-300 font-mono">{asteroidField.kristallinesSilizium.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )) || []}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
