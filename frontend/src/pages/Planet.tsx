import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, Users, Zap, Trash2, Rocket } from 'lucide-react';
import api from '../lib/api';
import BuildMenu from '../components/BuildMenu';
import { useGameStore } from '../stores/gameStore';

interface Building {
  id: number;
  level: number;
  isActive: boolean;
  completedAt: string | null;
  constructionStartedAt: string;
  buildingType: {
    id: number;
    name: string;
    description: string;
    category: string;
    energyCostPerTick: number;
    energyCostToBuild: number;
    buildTime: number;
  };
}

interface PlanetField {
  id: number;
  x: number;
  y: number;
  fieldType: string;
  buildingId: number | null;
  building: Building | null;
}

interface Planet {
  id: number;
  name: string;
  planetType: string;
  sizeX: number;
  sizeY: number;
  credits: number;
  durastahl: number;
  kristallinesSilizium: number;
  tibannaGas: number;
  energiemodule: number;
  kyberKristalle: number;
  bacta: number;
  beskar: number;
  energyStorage: number;
  energyStorageCapacity: number;
  storageCapacity: number;
  orbitRadius: number;
  orbitAngle: number;
  production?: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    energiemodule: number;
    kyberKristalle: number;
    bacta: number;
    beskar: number;
  };
  system: {
    id: number;
    name: string;
    systemType: string;
    fieldX: number;
    fieldY: number;
    sector: {
      x: number;
      y: number;
    };
  };
  player: {
    user: {
      username: string;
    };
    faction: {
      name: string;
    };
  } | null;
  fields: PlanetField[];
  buildings: Building[];
}

const fieldTypeColors: Record<string, string> = {
  // Orbit layer
  SPACE: 'bg-black hover:bg-gray-900',
  // Surface layer
  LAND: 'bg-green-800 hover:bg-green-700',
  WATER: 'bg-blue-600 hover:bg-blue-500',
  MOUNTAIN: 'bg-gray-600 hover:bg-gray-500',
  // Underground layer
  ROCK: 'bg-stone-800 hover:bg-stone-700',
  CRYSTAL: 'bg-purple-800 hover:bg-purple-700',
  METAL: 'bg-slate-700 hover:bg-slate-600',
};

const buildingColors: Record<string, string> = {
  'Command Center': 'bg-yellow-500',
  'Solar Plant': 'bg-orange-500',
  'Metal Mine': 'bg-gray-400',
  'Crystal Harvester': 'bg-purple-500',
  'Warehouse': 'bg-blue-500',
  'Trade Hub': 'bg-green-500',
  'Shipyard': 'bg-indigo-600',
  'Research Lab': 'bg-cyan-500',
  'Defense Grid': 'bg-red-600',
  'Refinery': 'bg-amber-600',
  'Hangar': 'bg-slate-600',
};

export default function Planet() {
  const { id } = useParams();
  const { socket } = useGameStore();
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [selectedField, setSelectedField] = useState<PlanetField | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [demolishing, setDemolishing] = useState(false);
  const [, setTick] = useState(0); // Force re-render for timer updates
  const [editingName, setEditingName] = useState(false);
  const [newPlanetName, setNewPlanetName] = useState('');

  const loadPlanet = useCallback(async () => {
    try {
      const response = await api.get(`/planet/${id}`);
      setPlanet(response.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load planet');
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPlanet();
  }, [loadPlanet]);

  // Update timer every second for construction progress
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for building completion events
  useEffect(() => {
    if (!socket || !id) return;

    const handleBuildingCompleted = (data: any) => {
      // Reload planet if this building belongs to our planet
      if (data.planetId === parseInt(id)) {
        loadPlanet();
      }
    };

    const handleResourcesUpdated = (data: any) => {
      // Update planet resources in real-time if this is our planet
      if (data.planetId === parseInt(id)) {
        setPlanet(prev => prev ? {
          ...prev,
          credits: data.credits,
          durastahl: data.durastahl,
          kristallinesSilizium: data.kristallinesSilizium,
          tibannaGas: data.tibannaGas,
          energiemodule: data.energiemodule,
          kyberKristalle: data.kyberKristalle,
          bacta: data.bacta,
          beskar: data.beskar,
        } : null);
      }
    };

    socket.on('building:completed', handleBuildingCompleted);
    socket.on('resources:updated', handleResourcesUpdated);

    return () => {
      socket.off('building:completed', handleBuildingCompleted);
      socket.off('resources:updated', handleResourcesUpdated);
    };
  }, [socket, id, loadPlanet]);

  const demolishBuilding = async (buildingId: number) => {
    if (!confirm('Demolish this building? You will receive 50% of the build costs back.')) {
      return;
    }

    setDemolishing(true);
    try {
      const response = await api.delete(`/planet/${id}/building/${buildingId}`);
      alert(`Gebäude abgerissen! Rückerstattung: ${response.data.refund.credits} Credits, ${response.data.refund.durastahl} Durastahl, ${response.data.refund.kristallinesSilizium} Kristallines Silizium`);
      setSelectedField(null);
      await loadPlanet();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to demolish building');
    } finally {
      setDemolishing(false);
    }
  };

  const renamePlanet = async () => {
    if (!newPlanetName.trim() || newPlanetName === planet?.name) {
      setEditingName(false);
      return;
    }

    try {
      await api.patch(`/planet/${id}/rename`, { name: newPlanetName });
      await loadPlanet();
      setEditingName(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Umbenennen des Planeten');
      setEditingName(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Lade Planet...</div>
      </div>
    );
  }

  if (error || !planet) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
        <p className="text-red-200">{error || 'Planet nicht gefunden'}</p>
        <Link to="/" className="text-rebel hover:underline mt-2 inline-block">
          ← Zurück zum Dashboard
        </Link>
      </div>
    );
  }

  // Create 2D grid from flat fields array
  const grid: PlanetField[][] = [];
  for (let y = 0; y < planet.sizeY; y++) {
    grid[y] = [];
    for (let x = 0; x < planet.sizeX; x++) {
      const field = planet.fields.find(f => f.x === x && f.y === y);
      if (field) {
        grid[y][x] = field;
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Link to="/" className="text-gray-400 hover:text-white inline-flex items-center gap-2">
            <ArrowLeft size={20} />
            Zurück zum Dashboard
          </Link>
          
          {/* Check if planet has active shipyard */}
          {planet.buildings.some(b => b.buildingType.name === 'Raumschiffwerft' && b.isActive) && (
            <Link
              to={`/shipyard/${planet.id}`}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded flex items-center gap-2 transition"
            >
              <Rocket size={18} />
              Zur Raumschiffwerft
            </Link>
          )}
        </div>
        
        {/* Planet Name */}
        <div className="mt-4">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPlanetName}
                onChange={(e) => setNewPlanetName(e.target.value)}
                onBlur={renamePlanet}
                onKeyDown={(e) => e.key === 'Enter' && renamePlanet()}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-2xl font-bold focus:outline-none focus:border-rebel"
                autoFocus
              />
            </div>
          ) : (
            <h1 
              className="text-3xl font-bold text-white mb-2 cursor-pointer hover:text-rebel transition"
              onClick={() => {
                setNewPlanetName(planet.name);
                setEditingName(true);
              }}
              title="Click to rename planet"
            >
              {planet.name}
            </h1>
          )}
        </div>
      </div>

      {/* STU-Style Compact Energy Bar at Top */}
      <div className="mb-4 bg-space-light border border-gray-700 rounded p-2">
        <div className="flex items-center justify-between">
          <div className="text-white text-sm">
            Energie: <span className="font-mono font-bold">{planet.energyStorage}/{planet.energyStorageCapacity}</span>
            {planet.production && (planet.production as any).energyProduction && (planet.production as any).energyConsumption && (
              <span className="text-gray-400 ml-1">
                ({((planet.production as any).energyProduction - (planet.production as any).energyConsumption) >= 0 ? '+' : ''}{(planet.production as any).energyProduction - (planet.production as any).energyConsumption}/Runde = {planet.energyStorage + ((planet.production as any).energyProduction - (planet.production as any).energyConsumption)})
              </span>
            )}
          </div>
          <div className={`text-sm font-bold ${
            (planet.production as any).energyProduction && (planet.production as any).energyConsumption
              ? ((planet.production as any).energyProduction - (planet.production as any).energyConsumption) >= 0 ? 'text-green-400' : 'text-red-400'
              : 'text-gray-400'
          }`}>
            {(planet.production as any).energyProduction && (planet.production as any).energyConsumption
              ? `${((planet.production as any).energyProduction - (planet.production as any).energyConsumption) >= 0 ? '+' : ''}${(planet.production as any).energyProduction - (planet.production as any).energyConsumption}`
              : '-'
            }
          </div>
        </div>
        <div className="bg-gray-900 rounded h-1.5 mt-1">
          <div 
            className="h-1.5 rounded bg-yellow-500 transition-all"
            style={{ width: `${planet.energyStorageCapacity > 0 ? Math.max(0, Math.min((planet.energyStorage / planet.energyStorageCapacity) * 100, 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Planet Grid + Resources - Left Side */}
        <div className="lg:col-span-3">
          <div className="bg-space-light p-4 rounded-lg border border-gray-700">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                {/* Grid - STU Style Compact */}
                <div className="space-y-0.5">
                  {/* ORBIT Layer (rows 0-1) - STU Style */}
                  <div className="inline-block border border-blue-500/50 rounded-sm bg-blue-900/20">
                    <div className="text-xs text-blue-400 px-1.5 py-0.5 font-semibold bg-blue-900/40">ORBIT</div>
                    {grid.slice(0, 2).map((row, y) => (
                      <div key={y} className="flex">
                        {row.map((field, x) => (
                          <button
                            key={`${x}-${y}`}
                            onClick={() => setSelectedField(field)}
                            className={`
                              w-[40px] h-[40px] border border-gray-800/30 relative
                              transition-all duration-150
                              ${selectedField?.id === field.id ? 'ring-1 ring-yellow-400' : ''}
                              ${field.building 
                                ? buildingColors[field.building.buildingType.name] || 'bg-gray-500'
                                : fieldTypeColors[field.fieldType]
                              }
                            `}
                            title={field.building 
                              ? `${field.building.buildingType.name} (Lvl ${field.building.level})`
                              : field.fieldType
                            }
                          >
                            {field.building && field.building.isActive && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-xs font-bold bg-black/60 rounded-sm px-1">
                                  {field.building.level}
                                </div>
                              </div>
                            )}
                            {!field.building?.isActive && field.building && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* SURFACE Layer (rows 2-7) - STU Style */}
                  <div className="inline-block border border-green-500/50 rounded-sm bg-green-900/20">
                    <div className="text-xs text-green-400 px-1.5 py-0.5 font-semibold bg-green-900/40">OBERFLÄCHE</div>
                    {grid.slice(2, 8).map((row, y) => (
                      <div key={y + 2} className="flex">
                        {row.map((field, x) => (
                          <button
                            key={`${x}-${y + 2}`}
                            onClick={() => setSelectedField(field)}
                            className={`
                              w-[40px] h-[40px] border border-gray-800/30 relative
                              transition-all duration-150
                              ${selectedField?.id === field.id ? 'ring-1 ring-yellow-400' : ''}
                              ${field.building 
                                ? buildingColors[field.building.buildingType.name] || 'bg-gray-500'
                                : fieldTypeColors[field.fieldType]
                              }
                            `}
                            title={field.building 
                              ? `${field.building.buildingType.name} (Lvl ${field.building.level})`
                              : field.fieldType
                            }
                          >
                            {field.building && field.building.isActive && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-xs font-bold bg-black/60 rounded-sm px-1">
                                  {field.building.level}
                                </div>
                              </div>
                            )}
                            {!field.building?.isActive && field.building && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* UNDERGROUND Layer (rows 8-9) - STU Style */}
                  <div className="inline-block border border-amber-500/50 rounded-sm bg-amber-900/20">
                    <div className="text-xs text-amber-400 px-1.5 py-0.5 font-semibold bg-amber-900/40">UNTERGRUND</div>
                    {grid.slice(8, 10).map((row, y) => (
                      <div key={y + 8} className="flex">
                        {row.map((field, x) => (
                          <button
                            key={`${x}-${y + 8}`}
                            onClick={() => setSelectedField(field)}
                            className={`
                              w-[40px] h-[40px] border border-gray-800/30 relative
                              transition-all duration-150
                              ${selectedField?.id === field.id ? 'ring-1 ring-yellow-400' : ''}
                              ${field.building 
                                ? buildingColors[field.building.buildingType.name] || 'bg-gray-500'
                                : fieldTypeColors[field.fieldType]
                              }
                            `}
                            title={field.building 
                              ? `${field.building.buildingType.name} (Lvl ${field.building.level})`
                              : field.fieldType
                            }
                          >
                            {field.building && field.building.isActive && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-xs font-bold bg-black/60 rounded-sm px-1">
                                  {field.building.level}
                                </div>
                              </div>
                            )}
                            {!field.building?.isActive && field.building && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* STU-Style Resources (Lager) below grid */}
                <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-base">
                      Lager: <span className="font-mono">{(planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas).toLocaleString()}/{planet.storageCapacity.toLocaleString()}</span>
                      <span className="text-gray-400 ml-1">
                        ({Math.round(((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas) / planet.storageCapacity) * 100)}%)
                      </span>
                    </span>
                    {planet.production && (
                      <span className="text-green-400 text-base">
                        +{(planet.production.credits + planet.production.durastahl + planet.production.kristallinesSilizium + planet.production.tibannaGas)}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 flex items-center gap-1">
                        <span className="text-yellow-400">💰</span> Credits
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{planet.credits.toLocaleString()}</span>
                        {planet.production && planet.production.credits > 0 && (
                          <span className="text-green-400">+{planet.production.credits}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 flex items-center gap-1">
                        <span className="text-gray-400">⚙️</span> Durastahl
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{planet.durastahl.toLocaleString()}</span>
                        {planet.production && planet.production.durastahl > 0 && (
                          <span className="text-green-400">+{planet.production.durastahl}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 flex items-center gap-1">
                        <span className="text-purple-400">💎</span> Kristallines Silizium
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{planet.kristallinesSilizium.toLocaleString()}</span>
                        {planet.production && planet.production.kristallinesSilizium > 0 && (
                          <span className="text-green-400">+{planet.production.kristallinesSilizium}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 flex items-center gap-1">
                        <span className="text-blue-400">☁️</span> Tibanna Gas
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{planet.tibannaGas.toLocaleString()}</span>
                        {planet.production && planet.production.tibannaGas > 0 && (
                          <span className="text-green-400">+{planet.production.tibannaGas}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Details - Right Side (compact) */}
              <div className="w-72 bg-gray-900/50 border border-gray-700 rounded p-4 flex-shrink-0">
                {selectedField ? (
                  <>
                    <h3 className="text-white font-semibold mb-3 text-sm">Ausgewähltes Feld</h3>

                    <div className="space-y-2.5">
                      <div className="text-xs">
                        <p className="text-gray-400">Geländetyp</p>
                        <p className="text-white">{selectedField.fieldType}</p>
                      </div>

                      {selectedField.building ? (
                        <>
                          <div className="text-xs">
                            <p className="text-gray-400">Gebäude</p>
                            <p className="text-white font-semibold">
                              {selectedField.building.buildingType.name}
                            </p>
                            <p className="text-gray-400 mt-0.5">
                              {selectedField.building.buildingType.description}
                            </p>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Level</span>
                            <span className="text-white font-semibold">
                              {selectedField.building.level}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Status</span>
                            <span className={`font-semibold ${
                              selectedField.building.isActive 
                                ? 'text-green-400' 
                                : 'text-yellow-400'
                            }`}>
                              {selectedField.building.isActive 
                                ? 'Aktiv' 
                                : 'Im Bau'
                              }
                            </span>
                          </div>

                          {!selectedField.building.isActive && !selectedField.building.completedAt && (
                            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-1.5">
                              {(() => {
                                const startTime = new Date(selectedField.building.constructionStartedAt).getTime();
                                const totalBuildTime = selectedField.building.buildingType.buildTime * 60 * 1000;
                                const elapsed = Date.now() - startTime;
                                const remaining = Math.max(0, totalBuildTime - elapsed);
                                const progress = Math.min(100, (elapsed / totalBuildTime) * 100);
                                const remainingMinutes = Math.ceil(remaining / 60000);
                                const remainingSeconds = Math.ceil(remaining / 1000);

                                return (
                                  <>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-yellow-400">Fortschritt</span>
                                      <span className="text-yellow-400">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1 mb-0.5">
                                      <div 
                                        className="bg-yellow-400 h-1 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                    <p className="text-yellow-300 text-xs">
                                      ~{remainingMinutes > 0 ? `${remainingMinutes}m` : `${remainingSeconds}s`} verbleibend
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {selectedField.building.buildingType.energyCostPerTick > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400 flex items-center gap-0.5">
                                <Zap size={10} />
                                Energie
                              </span>
                              <span className="text-white">
                                {selectedField.building.buildingType.energyCostPerTick}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => demolishBuilding(selectedField.building!.id)}
                            disabled={demolishing}
                            className="w-full bg-red-900 hover:bg-red-800 text-white py-2 px-3 rounded transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                          >
                            <Trash2 size={12} />
                            {demolishing ? 'Verarbeite...' : 
                              selectedField.building.isActive ? 'Abreißen (50%)' : 'Abbrechen (50%)'}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-400 text-xs">Kein Gebäude auf diesem Feld</p>
                          {selectedField.fieldType === 'LAND' && (
                            <button
                              onClick={() => setShowBuildMenu(true)}
                              className="w-full bg-rebel hover:bg-rebel-light text-white py-2 px-3 rounded transition text-xs"
                            >
                              Hier bauen
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    <p className="text-xs">Wähle ein Feld aus</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Planet Info & Effects */}
        <div className="space-y-4">
          {/* Planet Info Box */}
          <div className="bg-space-light p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-semibold mb-3 text-base">Planeteninformationen</h3>
            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-gray-400">System-Koordinaten</p>
                <p className="text-white font-mono flex items-center gap-1">
                  <MapPin size={12} />
                  {(planet.system.sector.x - 1) * 20 + planet.system.fieldX}|{(planet.system.sector.y - 1) * 20 + planet.system.fieldY}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Planet-Position</p>
                <p className="text-white font-mono">
                  {(() => {
                    const systemCenter = 5;
                    const angleRad = (planet.orbitAngle * Math.PI) / 180;
                    const planetX = Math.round(systemCenter + planet.orbitRadius * Math.cos(angleRad));
                    const planetY = Math.round(systemCenter + planet.orbitRadius * Math.sin(angleRad));
                    return `${planetX}|${planetY}`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-gray-400">System</p>
                <p className="text-white">{planet.system.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Planetentyp</p>
                <p className="text-white">{planet.planetType}</p>
              </div>
              {planet.player && (
                <div>
                  <p className="text-gray-400">Besitzer</p>
                  <p className="text-white flex items-center gap-1">
                    <Users size={12} />
                    {planet.player.user.username}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t border-gray-700">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <p className="text-white font-bold">{planet.buildings.length}</p>
                    <p className="text-gray-400 text-xs">Gesamt</p>
                  </div>
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <p className="text-green-400 font-bold">{planet.buildings.filter(b => b.isActive).length}</p>
                    <p className="text-gray-400 text-xs">Aktiv</p>
                  </div>
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <p className="text-yellow-400 font-bold">{planet.buildings.filter(b => !b.completedAt).length}</p>
                    <p className="text-gray-400 text-xs">Im Bau</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STU-Style Effects (Produktionsboni) */}
          <div className="bg-space-light p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-semibold mb-3 text-base">Effekte</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {planet.production && planet.production.credits > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">💰 Credits</span>
                  <span className="text-green-400">+{planet.production.credits}</span>
                </div>
              )}
              {planet.production && planet.production.durastahl > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">⚙️ Durastahl</span>
                  <span className="text-green-400">+{planet.production.durastahl}</span>
                </div>
              )}
              {planet.production && planet.production.kristallinesSilizium > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">💎 Kristall</span>
                  <span className="text-green-400">+{planet.production.kristallinesSilizium}</span>
                </div>
              )}
              {planet.production && planet.production.tibannaGas > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">☁️ Tibanna</span>
                  <span className="text-green-400">+{planet.production.tibannaGas}</span>
                </div>
              )}
              {planet.production && (planet.production as any).energyProduction > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">⚡ Energie-Prod.</span>
                  <span className="text-green-400">+{(planet.production as any).energyProduction}</span>
                </div>
              )}
              {planet.production && (planet.production as any).energyConsumption > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">⚡ Energie-Konsum</span>
                  <span className="text-red-400">-{(planet.production as any).energyConsumption}</span>
                </div>
              )}
              {planet.buildings.some(b => b.buildingType.name === 'Handelsstation' && b.isActive) && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">🛒 Handelsbonus</span>
                  <span className="text-green-400">+10%</span>
                </div>
              )}
              {planet.buildings.some(b => b.buildingType.name === 'Forschungslabor' && b.isActive) && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">🔬 Forschung</span>
                  <span className="text-green-400">+{planet.buildings.filter(b => b.buildingType.name === 'Forschungslabor' && b.isActive).length * 2}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Build Menu Modal */}
      {showBuildMenu && selectedField && (
        <BuildMenu
          planetId={planet.id}
          fieldId={selectedField.id}
          existingBuildings={planet.buildings}
          planetResources={{
            credits: planet.credits,
            durastahl: planet.durastahl,
            kristallinesSilizium: planet.kristallinesSilizium,
            tibannaGas: planet.tibannaGas,
            energiemodule: planet.energiemodule,
            kyberKristalle: planet.kyberKristalle,
            bacta: planet.bacta,
            beskar: planet.beskar,
            energyStorage: planet.energyStorage,
          }}
          onClose={() => setShowBuildMenu(false)}
          onBuildStarted={() => {
            setShowBuildMenu(false);
            loadPlanet();
          }}
        />
      )}
    </div>
  );
}
