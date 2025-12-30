import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, Users, Zap, Trash2, Rocket, X, Coins, Wrench, Gem, Factory, Clock, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import BuildMenu from '../components/BuildMenu';
import { useGameStore } from '../stores/gameStore';
import logger from '../lib/logger';

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

type LayerTab = 'orbit' | 'surface' | 'underground';

export default function Planet() {
  const { id } = useParams();
  const { socket } = useGameStore();
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [selectedField, setSelectedField] = useState<PlanetField | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [demolishing, setDemolishing] = useState(false);
  const [, setTick] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [newPlanetName, setNewPlanetName] = useState('');
  const [activeTab, setActiveTab] = useState<LayerTab>('surface');
  const [showBottomSheet, setShowBottomSheet] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket || !id) return;

    const handleBuildingCompleted = (data: any) => {
      logger.socket('Building completed event:', data);
      if (data.planetId === parseInt(id)) {
        logger.info('Reloading planet after building completion');
        loadPlanet();
      }
    };

    const handleResourcesUpdated = (data: any) => {
      logger.socket('Resources updated event:', data);
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
    if (!confirm('Gebäude abreißen? Du erhältst 50% der Baukosten zurück.')) {
      return;
    }

    setDemolishing(true);
    try {
      const response = await api.delete(`/planet/${id}/building/${buildingId}`);
      alert(`Gebäude abgerissen! Rückerstattung: ${response.data.refund.credits} Credits, ${response.data.refund.durastahl} Durastahl, ${response.data.refund.kristallinesSilizium} Kristallines Silizium`);
      setSelectedField(null);
      setShowBottomSheet(false);
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

  // Get layers for tab navigation
  const orbitFields = grid.slice(0, 2);
  const surfaceFields = grid.slice(2, 8);
  const undergroundFields = grid.slice(8, 10);

  const handleFieldClick = (field: PlanetField) => {
    setSelectedField(field);
    // Mobile: open bottom sheet
    if (window.innerWidth < 768) {
      setShowBottomSheet(true);
    }
  };

  const closeBottomSheet = () => {
    setShowBottomSheet(false);
    setShowBuildMenu(false);
  };

  const renderGrid = (fields: PlanetField[][], layerName: string, layerColor: string) => {
    return (
      <div className="inline-block border rounded-sm" style={{ borderColor: layerColor }}>
        <div className="text-sm px-2 py-1 font-semibold" style={{ color: layerColor, backgroundColor: `${layerColor}20` }}>
          {layerName}
        </div>
        {fields.map((row, y) => (
          <div key={y} className="flex">
            {row.map((field, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => handleFieldClick(field)}
                className={`
                  w-[44px] h-[44px] md:w-[50px] md:h-[50px] border border-gray-800/30 relative
                  transition-all duration-200 touch-manipulation
                  ${selectedField?.id === field.id ? 'ring-2 ring-yellow-400 scale-105' : ''}
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
                    <div className="text-white text-sm font-bold bg-black/60 rounded-sm px-1.5">
                      {field.building.level}
                    </div>
                  </div>
                )}
                {!field.building?.isActive && field.building && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderBuildingDetails = () => {
    if (!selectedField) return null;

    if (!selectedField.building) {
      return (
        <div className="space-y-4">
          <div className="text-xs md:text-sm">
            <p className="text-gray-400">Geländetyp</p>
            <p className="text-white">{selectedField.fieldType}</p>
          </div>
          <button
            onClick={() => setShowBuildMenu(true)}
            className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
          >
            <Factory size={18} />
            Gebäude errichten
          </button>
        </div>
      );
    }

    const building = selectedField.building;
    const startTime = new Date(building.constructionStartedAt).getTime();
    const totalBuildTime = building.buildingType.buildTime * 60 * 1000;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalBuildTime - elapsed);
    const progress = Math.min(100, (elapsed / totalBuildTime) * 100);
    const remainingMinutes = Math.ceil(remaining / 60000);
    const remainingSeconds = Math.ceil(remaining / 1000);

    return (
      <div className="space-y-3">
        <div className="text-xs md:text-sm">
          <p className="text-gray-400">Gebäude</p>
          <p className="text-white font-semibold text-base md:text-lg">{building.buildingType.name}</p>
          <p className="text-gray-400 mt-1 text-xs">{building.buildingType.description}</p>
        </div>

        <div className="flex justify-between text-xs md:text-sm">
          <span className="text-gray-400">Level</span>
          <span className="text-white font-semibold">{building.level}</span>
        </div>

        <div className="flex justify-between text-xs md:text-sm">
          <span className="text-gray-400">Status</span>
          <span className={`font-semibold ${building.isActive ? 'text-green-400' : 'text-yellow-400'}`}>
            {building.isActive ? 'Aktiv' : 'Im Bau'}
          </span>
        </div>

        {!building.isActive && !building.completedAt && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-yellow-400">Fortschritt</span>
              <span className="text-yellow-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-yellow-400">
              {remainingMinutes > 0 
                ? `Noch ${remainingMinutes} Min ${remainingSeconds % 60} Sek`
                : `Noch ${remainingSeconds} Sek`
              }
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => demolishBuilding(building.id)}
            disabled={demolishing}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-3 py-2 rounded transition flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 size={16} />
            Abreißen
          </button>
        </div>

        {building.buildingType.energyCostPerTick > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <Zap size={14} className="text-yellow-500" />
                Energieverbrauch
              </span>
              <span className="text-red-400">-{building.buildingType.energyCostPerTick}/Tick</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlanetDashboard = () => (
    <div className="space-y-4 transition-all duration-300">
      <h3 className="text-white font-semibold text-lg flex items-center gap-2">
        <TrendingUp size={20} />
        Planeten-Dashboard
      </h3>
      
      {/* Resource Production Overview */}
      <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
        <h4 className="text-gray-300 font-semibold mb-2 text-sm">Produktion pro Runde</h4>
        <div className="space-y-2">
          {planet.production && planet.production.credits > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Coins size={14} className="text-yellow-400" />
                Credits
              </span>
              <span className="text-green-400 font-mono">+{planet.production.credits}</span>
            </div>
          )}
          {planet.production && planet.production.durastahl > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Wrench size={14} className="text-gray-400" />
                Durastahl
              </span>
              <span className="text-green-400 font-mono">+{planet.production.durastahl}</span>
            </div>
          )}
          {planet.production && planet.production.kristallinesSilizium > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Gem size={14} className="text-purple-400" />
                Kristallines Silizium
              </span>
              <span className="text-green-400 font-mono">+{planet.production.kristallinesSilizium}</span>
            </div>
          )}
        </div>
      </div>

      {/* Build Queue */}
      <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
        <h4 className="text-gray-300 font-semibold mb-2 text-sm flex items-center gap-2">
          <Clock size={14} />
          Bau-Queue
        </h4>
        {planet.buildings.filter(b => !b.isActive).length > 0 ? (
          <div className="space-y-2">
            {planet.buildings
              .filter(b => !b.isActive)
              .map(building => {
                const startTime = new Date(building.constructionStartedAt).getTime();
                const totalBuildTime = building.buildingType.buildTime * 60 * 1000;
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, totalBuildTime - elapsed);
                const progress = Math.min(100, (elapsed / totalBuildTime) * 100);
                const remainingMinutes = Math.ceil(remaining / 60000);

                return (
                  <div key={building.id} className="bg-gray-900/50 border border-gray-600 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white text-sm font-medium">{building.buildingType.name}</span>
                      <span className="text-yellow-400 text-xs">{remainingMinutes} Min</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-yellow-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Keine Gebäude im Bau</p>
        )}
      </div>

      {/* Building Statistics */}
      <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
        <h4 className="text-gray-300 font-semibold mb-2 text-sm">Gebäude-Statistik</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-700/50 p-2 rounded">
            <p className="text-white font-bold text-lg">{planet.buildings.length}</p>
            <p className="text-gray-400 text-xs">Gesamt</p>
          </div>
          <div className="bg-gray-700/50 p-2 rounded">
            <p className="text-green-400 font-bold text-lg">{planet.buildings.filter(b => b.isActive).length}</p>
            <p className="text-gray-400 text-xs">Aktiv</p>
          </div>
          <div className="bg-gray-700/50 p-2 rounded">
            <p className="text-yellow-400 font-bold text-lg">{planet.buildings.filter(b => !b.isActive).length}</p>
            <p className="text-gray-400 text-xs">Im Bau</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Link to="/" className="text-gray-400 hover:text-white inline-flex items-center gap-2 text-sm md:text-base">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Zurück zum Dashboard</span>
            <span className="sm:hidden">Zurück</span>
          </Link>
          
          {planet.buildings.some(b => b.buildingType.name === 'Raumschiffwerft' && b.isActive) && (
            <Link
              to={`/shipyard/${planet.id}`}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 md:px-4 rounded flex items-center gap-2 transition text-sm"
            >
              <Rocket size={16} />
              <span className="hidden sm:inline">Zur Raumschiffwerft</span>
              <span className="sm:hidden">Werft</span>
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
                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-xl md:text-2xl font-bold focus:outline-none focus:border-rebel"
                autoFocus
              />
            </div>
          ) : (
            <h1 
              className="text-2xl md:text-3xl font-bold text-white mb-2 cursor-pointer hover:text-rebel transition"
              onClick={() => {
                setNewPlanetName(planet.name);
                setEditingName(true);
              }}
              title="Klicken zum Umbenennen"
            >
              {planet.name}
            </h1>
          )}
        </div>
      </div>

      {/* Desktop: Storage Bar */}
      <div className="hidden md:block mb-4 bg-space-light border border-gray-700 rounded p-3">
        <div className="flex items-center justify-between">
          <div className="text-white text-sm">
            Lager: <span className="font-mono font-bold">{(planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar).toLocaleString()}/{planet.storageCapacity.toLocaleString()}</span>
          </div>
          <div className={`text-sm font-bold ${
            ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 0.9
              ? 'text-green-400' 
              : ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 1
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}>
            {Math.round(((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) * 100)}%
          </div>
        </div>
        <div className="bg-gray-900 rounded-full h-2 mt-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 0.9
                ? 'bg-green-500' 
                : ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 1
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${planet.storageCapacity > 0 ? Math.max(0, Math.min(((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) * 100, 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Desktop: Energy Bar */}
      <div className="hidden md:block mb-4 bg-space-light border border-gray-700 rounded p-3">
        <div className="flex items-center justify-between">
          <div className="text-white text-sm">
            Energie: <span className="font-mono font-bold">{planet.energyStorage}/{planet.energyStorageCapacity}</span>
            {planet.production && (planet.production as any).energyProduction && (planet.production as any).energyConsumption && (
              <span className="text-gray-400 ml-2">
                ({((planet.production as any).energyProduction - (planet.production as any).energyConsumption) >= 0 ? '+' : ''}{(planet.production as any).energyProduction - (planet.production as any).energyConsumption}/Runde)
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
        <div className="bg-gray-900 rounded-full h-2 mt-2">
          <div 
            className="h-2 rounded-full bg-yellow-500 transition-all duration-500"
            style={{ width: `${planet.energyStorageCapacity > 0 ? Math.max(0, Math.min((planet.energyStorage / planet.energyStorageCapacity) * 100, 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-12 gap-4">
        {/* Left: Grid */}
        <div className="col-span-8">
          <div className="bg-space-light p-6 rounded-lg border border-gray-700">
            {/* Centered Grid with fixed aspect ratio */}
            <div className="flex justify-center">
              <div className="space-y-1">
                {renderGrid(orbitFields, 'ORBIT', '#3b82f6')}
                {renderGrid(surfaceFields, 'OBERFLÄCHE', '#10b981')}
                {renderGrid(undergroundFields, 'UNTERGRUND', '#8b5cf6')}
              </div>
            </div>
          </div>

          {/* Desktop Resources Display */}
          <div className="mt-4 bg-space-light p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-semibold mb-3">Ressourcen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-2">
                  <Coins size={18} className="text-yellow-400" />
                  Credits
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{planet.credits.toLocaleString()}</span>
                  {planet.production && planet.production.credits > 0 && (
                    <span className="text-green-400 text-sm">+{planet.production.credits}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-2">
                  <Wrench size={18} className="text-gray-400" />
                  Durastahl
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{planet.durastahl.toLocaleString()}</span>
                  {planet.production && planet.production.durastahl > 0 && (
                    <span className="text-green-400 text-sm">+{planet.production.durastahl}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-2">
                  <Gem size={18} className="text-purple-400" />
                  Kristallines Silizium
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{planet.kristallinesSilizium.toLocaleString()}</span>
                  {planet.production && planet.production.kristallinesSilizium > 0 && (
                    <span className="text-green-400 text-sm">+{planet.production.kristallinesSilizium}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-2">
                  <span className="text-blue-400">☁️</span>
                  Tibanna Gas
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{planet.tibannaGas.toLocaleString()}</span>
                  {planet.production && planet.production.tibannaGas > 0 && (
                    <span className="text-green-400 text-sm">+{planet.production.tibannaGas}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dashboard or Building Details */}
        <div className="col-span-4">
          <div className="bg-space-light p-4 rounded-lg border border-gray-700 sticky top-4">
            <div className="transition-all duration-300 ease-in-out">
              {selectedField ? renderBuildingDetails() : renderPlanetDashboard()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Tab Navigation */}
        <div className="bg-space-light border border-gray-700 rounded-t-lg overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('orbit')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'orbit' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Orbit
            </button>
            <button
              onClick={() => setActiveTab('surface')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'surface' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Oberfläche
            </button>
            <button
              onClick={() => setActiveTab('underground')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'underground' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Untergrund
            </button>
          </div>
        </div>

        {/* Grid Display (based on active tab) */}
        <div className="bg-space-light p-4 rounded-b-lg border-x border-b border-gray-700">
          <div className="flex justify-center overflow-x-auto">
            {activeTab === 'orbit' && renderGrid(orbitFields, 'ORBIT', '#3b82f6')}
            {activeTab === 'surface' && renderGrid(surfaceFields, 'OBERFLÄCHE', '#10b981')}
            {activeTab === 'underground' && renderGrid(undergroundFields, 'UNTERGRUND', '#8b5cf6')}
          </div>
        </div>

        {/* Mobile: Storage Bar */}
        <div className="mt-4 bg-space-light border border-gray-700 rounded p-3">
          <div className="flex items-center justify-between">
            <div className="text-white text-sm">
              Lager: <span className="font-mono font-bold">{(planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar).toLocaleString()}/{planet.storageCapacity.toLocaleString()}</span>
            </div>
            <div className={`text-sm font-bold ${
              ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 0.9
                ? 'text-green-400' 
                : ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 1
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {Math.round(((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) * 100)}%
            </div>
          </div>
          <div className="bg-gray-900 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 0.9
                  ? 'bg-green-500' 
                  : ((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) < 1
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${planet.storageCapacity > 0 ? Math.max(0, Math.min(((planet.credits + planet.durastahl + planet.kristallinesSilizium + planet.tibannaGas + planet.energiemodule + planet.kyberKristalle + planet.bacta + planet.beskar) / planet.storageCapacity) * 100, 100)) : 0}%` }}
            />
          </div>
        </div>

        {/* Resource Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-space-light border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coins size={18} className="text-yellow-400" />
              <span className="text-gray-400 text-xs font-medium">Credits</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono font-bold text-lg">{planet.credits.toLocaleString()}</span>
              {planet.production && planet.production.credits > 0 && (
                <span className="text-green-400 text-xs font-semibold">+{planet.production.credits}</span>
              )}
            </div>
          </div>

          <div className="bg-space-light border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wrench size={18} className="text-gray-400" />
              <span className="text-gray-400 text-xs font-medium">Durastahl</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono font-bold text-lg">{planet.durastahl.toLocaleString()}</span>
              {planet.production && planet.production.durastahl > 0 && (
                <span className="text-green-400 text-xs font-semibold">+{planet.production.durastahl}</span>
              )}
            </div>
          </div>

          <div className="bg-space-light border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gem size={18} className="text-purple-400" />
              <span className="text-gray-400 text-xs font-medium">Kristall</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono font-bold text-lg">{planet.kristallinesSilizium.toLocaleString()}</span>
              {planet.production && planet.production.kristallinesSilizium > 0 && (
                <span className="text-green-400 text-xs font-semibold">+{planet.production.kristallinesSilizium}</span>
              )}
            </div>
          </div>

          <div className="bg-space-light border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-yellow-500" />
              <span className="text-gray-400 text-xs font-medium">Energie</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono font-bold text-lg">{planet.energyStorage}/{planet.energyStorageCapacity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      {showBottomSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={closeBottomSheet}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Sheet */}
          <div 
            className="relative w-full bg-space-dark rounded-t-2xl border-t-2 border-gray-600 shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '80vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 40px)' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-lg">
                  {selectedField?.building ? 'Gebäude-Details' : 'Feld-Details'}
                </h3>
                <button
                  onClick={closeBottomSheet}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {renderBuildingDetails()}
            </div>
          </div>
        </div>
      )}

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
          onClose={() => {
            setShowBuildMenu(false);
            if (window.innerWidth < 768) {
              setShowBottomSheet(false);
            }
          }}
          onBuildStarted={() => {
            setShowBuildMenu(false);
            if (window.innerWidth < 768) {
              setShowBottomSheet(false);
            }
            loadPlanet();
          }}
        />
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
