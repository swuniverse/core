import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Globe, Users, ZoomIn, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

interface System {
  id: number;
  name: string;
  systemType: string;
  fieldX: number;
  fieldY: number;
  planetCount: number;
  hasPlayerPlanets: boolean;
  hasOwnPlanets: boolean;
  factionName?: string;
}

interface Sector {
  x: number;
  y: number;
  systems: System[];
}

interface SectorField {
  x: number;
  y: number;
  system: System | null;
}

type ViewMode = 'galaxy' | 'sector';

export default function Galaxy() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<Map<string, Sector>>(new Map());
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [sectorFields, setSectorFields] = useState<SectorField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredSector, setHoveredSector] = useState<{x: number, y: number} | null>(null);
  const [hoveredField, setHoveredField] = useState<{x: number, y: number} | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('galaxy');

  const GALAXY_SIZE = 6; // 6x6 sectors (STU-style: 36 sectors total)
  const FIELDS_PER_SECTOR = 20; // Each sector has 20x20 fields (total 120x120 galaxy)

  useEffect(() => {
    loadGalaxy();
  }, []);

  const loadGalaxy = async () => {
    try {
      const response = await api.get('/galaxy');
      const sectorMap = new Map<string, Sector>();
      
      response.data.sectors.forEach((sector: Sector) => {
        const key = `${sector.x},${sector.y}`;
        sectorMap.set(key, sector);
      });
      
      setSectors(sectorMap);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load galaxy:', err);
      setIsLoading(false);
    }
  };

  const loadSectorFields = async (sectorX: number, sectorY: number) => {
    const sector = sectors.get(`${sectorX},${sectorY}`);
    if (!sector) return;

    // Create 20x20 field grid - optimized to only store system data
    const fields: SectorField[] = [];
    const systemMap = new Map<string, System>();

    // Map systems to their field positions
    sector.systems.forEach((system: System) => {
      systemMap.set(`${system.fieldX},${system.fieldY}`, system);
    });

    // Generate field grid - only 400 objects instead of DOM nodes
    for (let y = 1; y <= FIELDS_PER_SECTOR; y++) {
      for (let x = 1; x <= FIELDS_PER_SECTOR; x++) {
        const system = systemMap.get(`${x},${y}`) || null;
        fields.push({ x, y, system });
      }
    }

    setSectorFields(fields);
  };

  const getSectorKey = (x: number, y: number) => `${x},${y}`;

  const handleSectorClick = (sectorX: number, sectorY: number) => {
    const sector = sectors.get(getSectorKey(sectorX, sectorY));
    if (sector) {
      setSelectedSector(sector);
      loadSectorFields(sectorX, sectorY);
      setViewMode('sector');
    }
  };

  const handleBackToGalaxy = () => {
    setViewMode('galaxy');
    setSelectedSector(null);
    setSectorFields([]);
    setHoveredField(null);
  };

  const handleFieldClick = useCallback((field: SectorField) => {
    if (field.system) {
      console.log('Navigating to system:', field.system.id, field.system);
      navigate(`/system/${field.system.id}`);
    } else {
      console.log('No system on this field');
    }
  }, [navigate]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    setHoveredField({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredField(null);
  }, []);

  const getSectorColor = (sector?: Sector) => {
    if (!sector || sector.systems.length === 0) return 'bg-gray-900';
    
    const ownedSystems = sector.systems.filter(s => s.hasPlayerPlanets);
    if (ownedSystems.length === 0) return 'bg-blue-900';
    
    const factionName = ownedSystems[0].factionName;
    if (factionName?.includes('Imperium') || factionName?.includes('Empire')) return 'bg-red-700';
    if (factionName?.includes('Rebellen') || factionName?.includes('Rebel')) return 'bg-orange-700';
    
    return 'bg-blue-900';
  };

  // getFieldColor removed - now using system-based visualization

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Lade Galaxiekarte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="text-blue-400" size={32} />
          <h1 className="text-3xl font-bold text-white">
            {viewMode === 'galaxy' ? 'Galaxiekarte' : `Sektor ${selectedSector?.x}|${selectedSector?.y}`}
          </h1>
          {viewMode === 'sector' && (
            <button
              onClick={handleBackToGalaxy}
              className="ml-auto flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              <ArrowLeft size={18} />
              Zurück zur Galaxie
            </button>
          )}
        </div>
        <p className="text-gray-400">
          {viewMode === 'galaxy' 
            ? `${GALAXY_SIZE}x${GALAXY_SIZE} Sektoren (${GALAXY_SIZE * GALAXY_SIZE} total), jeder Sektor hat ${FIELDS_PER_SECTOR}x${FIELDS_PER_SECTOR} Felder`
            : (() => {
                const startX = (selectedSector!.x - 1) * FIELDS_PER_SECTOR + 1;
                const endX = selectedSector!.x * FIELDS_PER_SECTOR;
                const startY = (selectedSector!.y - 1) * FIELDS_PER_SECTOR + 1;
                const endY = selectedSector!.y * FIELDS_PER_SECTOR;
                return `${FIELDS_PER_SECTOR}x${FIELDS_PER_SECTOR} Felder | Galaxie-Koordinaten: ${startX}-${endX} x ${startY}-${endY}`;
              })()
          }
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
        <button
          onClick={handleBackToGalaxy}
          className={`hover:text-white ${viewMode === 'galaxy' ? 'text-blue-400' : ''}`}
        >
          Galaxie
        </button>
        {viewMode === 'sector' && selectedSector && (
          <>
            <span>&gt;</span>
            <span className="text-blue-400">Sektor {selectedSector.x}|{selectedSector.y}</span>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-900 border border-gray-700"></div>
          <span className="text-sm text-gray-400">Leer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-900 border border-gray-700"></div>
          <span className="text-sm text-gray-400">Unbesiedelt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-700 border border-gray-700"></div>
          <span className="text-sm text-gray-400">Imperium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-700 border border-gray-700"></div>
          <span className="text-sm text-gray-400">Rebellen</span>
        </div>
      </div>

      {/* Hover Info - Fixed Height */}
      <div className="mb-4 bg-gray-800 rounded-lg p-3 border border-blue-500 min-h-[60px] flex items-center">
        {viewMode === 'galaxy' && hoveredSector ? (
          <>
            <span className="text-blue-400 font-semibold">Sektor {hoveredSector.x},{hoveredSector.y}</span>
            {(() => {
              const sector = sectors.get(`${hoveredSector.x},${hoveredSector.y}`);
              if (!sector || sector.systems.length === 0) {
                return <span className="text-gray-400 ml-3">Leer</span>;
              }
              const ownedSystems = sector.systems.filter(s => s.hasPlayerPlanets);
              if (ownedSystems.length === 0) {
                return <span className="text-blue-300 ml-3">{sector.systems.length} unbesiedelte(s) System(e)</span>;
              }
              return (
                <span className="text-green-300 ml-3">
                  {sector.systems.length} System(e) - {ownedSystems[0].factionName}
                </span>
              );
            })()}
          </>
        ) : viewMode === 'sector' && hoveredField && selectedSector ? (
          <>
            {(() => {
              // Calculate galaxy coordinates
              const galaxyX = (selectedSector.x - 1) * FIELDS_PER_SECTOR + hoveredField.x;
              const galaxyY = (selectedSector.y - 1) * FIELDS_PER_SECTOR + hoveredField.y;
              const field = sectorFields.find(f => f.x === hoveredField.x && f.y === hoveredField.y);
              
              return (
                <>
                  <span className="text-blue-400 font-semibold">Position {galaxyX}|{galaxyY}</span>
                  {field?.system ? (
                    <span className="text-green-300 ml-3">
                      {field.system.name} ({field.system.systemType}) - {field.system.planetCount} Planet(en)
                      {field.system.hasPlayerPlanets && ` - ${field.system.factionName}`}
                    </span>
                  ) : (
                    <span className="text-gray-400 ml-3">Leerer Raum</span>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <span className="text-gray-500 italic">Bewege die Maus über {viewMode === 'galaxy' ? 'einen Sektor' : 'ein Feld'} für Details</span>
        )}
      </div>
      {/* Galaxy View - Sector Grid (6x6) */}
      {viewMode === 'galaxy' && (
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
          <div 
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${GALAXY_SIZE}, minmax(0, 1fr))`,
              maxWidth: '800px',
              margin: '0 auto'
            }}
          >
            {Array.from({ length: GALAXY_SIZE * GALAXY_SIZE }, (_, index) => {
              const sectorX = Math.floor(index / GALAXY_SIZE) + 1;
              const sectorY = (index % GALAXY_SIZE) + 1;
              const sector = sectors.get(`${sectorX},${sectorY}`);
              const isHovered = hoveredSector?.x === sectorX && hoveredSector?.y === sectorY;
              const hasOwnPlanets = sector?.systems.some(s => s.hasOwnPlanets) || false;

              return (
                <div
                  key={`${sectorX}-${sectorY}`}
                  className={`aspect-square ${getSectorColor(sector)} hover:bg-opacity-80 border-2 cursor-pointer transition-all relative group ${
                    hasOwnPlanets ? 'border-yellow-500' : 'border-gray-800'
                  } ${
                    isHovered ? 'ring-2 ring-blue-400 z-10' : ''
                  }`}
                  onClick={() => handleSectorClick(sectorX, sectorY)}
                  onMouseEnter={() => setHoveredSector({ x: sectorX, y: sectorY })}
                  onMouseLeave={() => setHoveredSector(null)}
                >
                  {sector && sector.systems.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm text-white font-bold">{sector.systems.length}</span>
                      <ZoomIn className="text-white/50 group-hover:text-white/80 transition" size={16} />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 text-xs text-gray-500 font-mono">
                    {sectorX},{sectorY}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector View - Field Grid (20x20) STU-Style - Memory Optimized */}
      {viewMode === 'sector' && selectedSector && (
        <div className="bg-black rounded-lg p-2 overflow-auto">
          <div 
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${FIELDS_PER_SECTOR}, minmax(0, 1fr))`,
              gap: 0,
              maxWidth: '1000px',
              margin: '0 auto',
              backgroundColor: '#000'
            }}
          >
            {sectorFields.map((field) => {
              const isHovered = hoveredField?.x === field.x && hoveredField?.y === field.y;
              const galaxyX = (selectedSector.x - 1) * FIELDS_PER_SECTOR + field.x;
              const galaxyY = (selectedSector.y - 1) * FIELDS_PER_SECTOR + field.y;
              const hasSystem = !!field.system;
              const planetCount = field.system?.planetCount || 0;
              const hasOwnPlanets = field.system?.hasOwnPlanets || false;

              return (
                <div
                  key={`${field.x}-${field.y}`}
                  className={`aspect-square cursor-pointer relative ${
                    hasSystem ? 'bg-blue-900/20' : 'bg-gray-950'
                  } ${
                    hasOwnPlanets ? 'border-2 border-yellow-500' : 'border border-gray-800'
                  } ${isHovered ? 'ring-1 ring-yellow-400' : ''}`}
                  onClick={() => handleFieldClick(field)}
                  onMouseEnter={() => handleMouseEnter(field.x, field.y)}
                  onMouseLeave={handleMouseLeave}
                  title={hasSystem ? `${field.system.name} (${galaxyX}|${galaxyY})` : undefined}
                >
                  {hasSystem && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* System type visualization */}
                        {field.system.systemType === 'SINGLE_STAR' && (
                          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg"></div>
                        )}
                        {field.system.systemType === 'BINARY_STAR' && (
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          </div>
                        )}
                        {field.system.systemType === 'NEUTRON_STAR' && (
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        )}
                        {field.system.systemType === 'BLACK_HOLE' && (
                          <div className="w-3 h-3 bg-purple-900 rounded-full border border-purple-400"></div>
                        )}
                      </div>
                      {/* Planet count indicator */}
                      {planetCount > 0 && (
                        <div className="absolute top-0 right-0 text-xs text-yellow-400 bg-black/70 px-1 rounded">
                          {planetCount}
                        </div>
                      )}
                    </>
                  )}
                  {isHovered && (
                    <div className="absolute bottom-0 left-0 text-xs text-yellow-400 bg-black px-1 font-mono z-10">
                      {galaxyX}|{galaxyY}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Planet List Modal - Shows when clicking on a sector in galaxy view */}
      {/* Modal removed - navigation now goes directly from galaxy → sector → system → planet */}
    </div>
  );
}
