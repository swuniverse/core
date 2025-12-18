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
  const [hoveredPlanet, setHoveredPlanet] = useState<Planet | null>(null);

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
      <div className="bg-gray-800 rounded-lg p-4">
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
                {getSystemTypeLabel(system.systemType)} • Sektor {system.sector.x}|{system.sector.y} • Position {system.fieldX}|{system.fieldY}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Visualization */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="relative w-full" style={{ paddingBottom: '100%' }}>
          <div className="absolute inset-0 bg-black rounded-lg overflow-hidden">
            {/* Orbits */}
            {Array.from(new Set(system.planets.map(p => p.orbitRadius))).map(radius => (
              <div
                key={radius}
                className="absolute border border-gray-700/30 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  width: `${radius * 12}%`,
                  height: `${radius * 12}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}

            {/* Central Star(s) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {system.systemType === 'SINGLE_STAR' && (
                <div className="w-12 h-12 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse" />
              )}
              {system.systemType === 'BINARY_STAR' && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse" />
                  <div className="w-10 h-10 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50 animate-pulse" />
                </div>
              )}
              {system.systemType === 'NEUTRON_STAR' && (
                <div className="w-8 h-8 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse" />
              )}
              {system.systemType === 'BLACK_HOLE' && (
                <div className="w-12 h-12 bg-purple-900 rounded-full border-2 border-purple-400 shadow-lg shadow-purple-400/50" />
              )}
            </div>

            {/* Planets */}
            {system.planets.map(planet => {
              const pos = getPlanetPosition(planet);
              const isHovered = hoveredPlanet?.id === planet.id;
              
              return (
                <div
                  key={planet.id}
                  className="absolute cursor-pointer transition-transform hover:scale-125"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onMouseEnter={() => setHoveredPlanet(planet)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                  onClick={() => navigate(`/planet/${planet.id}`)}
                >
                  <div className={`w-6 h-6 rounded-full ${
                    planet.player ? 'bg-green-500' : 'bg-blue-500'
                  } shadow-lg ${isHovered ? 'ring-2 ring-white' : ''}`} />
                  {planet.player && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-black" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Planet Info Panel */}
      <div className="bg-gray-800 rounded-lg p-4 min-h-[80px]">
        {hoveredPlanet ? (
          <div>
            <h3 className="text-lg font-semibold text-white">{hoveredPlanet.name}</h3>
            <p className="text-sm text-gray-400">{getPlanetTypeLabel(hoveredPlanet.planetType)}</p>
            {hoveredPlanet.player ? (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Users size={14} className="text-blue-400" />
                <span className="text-gray-300">{hoveredPlanet.player.username}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{hoveredPlanet.player.faction.name}</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-green-400">Besiedlung möglich</p>
            )}
          </div>
        ) : (
          <p className="text-gray-400">Bewege die Maus über einen Planeten für Details</p>
        )}
      </div>

      {/* Planet List */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MapPin className="text-blue-400" />
          Planeten ({system.planets.length})
        </h2>
        <div className="space-y-2">
          {system.planets.map(planet => (
            <div
              key={planet.id}
              className="bg-gray-700 rounded p-3 hover:bg-gray-600 cursor-pointer transition"
              onClick={() => navigate(`/planet/${planet.id}`)}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-white">{planet.name}</h3>
                <span className="text-xs text-gray-400">{getPlanetTypeLabel(planet.planetType)}</span>
              </div>
              {planet.player ? (
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-blue-400" />
                  <span className="text-gray-300">{planet.player.username}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{planet.player.faction.name}</span>
                </div>
              ) : (
                <p className="text-sm text-green-400">Unbesiedelt</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
