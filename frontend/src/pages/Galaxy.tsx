import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import SunImage from '../components/SunImage';
import StarmapBackground from '../components/StarmapBackground';

interface System {
  id: number;
  name: string;
  systemType: 'SMALL_BLUE' | 'SMALL_YELLOW' | 'MEDIUM_BLUE' | 'BLUE_GIANT' | 'RED_DWARF' | 'NEUTRON_STAR' | 'BLACK_HOLE' | 'BINARY_SYSTEM';
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
      {/* Imperial Command Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
            <Globe className="text-cyan-300" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">
            {viewMode === 'galaxy' ? 'GALAXIEKARTE' : `SEKTOR ${selectedSector?.x}|${selectedSector?.y}`}
          </h1>
          {viewMode === 'sector' && (
            <button
              onClick={handleBackToGalaxy}
              className="ml-auto flex items-center gap-2 bg-gradient-to-r from-cyan-900/40 to-cyan-800/30 border border-cyan-500/30 text-cyan-100 px-4 py-2 rounded hover:from-cyan-800/50 hover:to-cyan-700/40 transition-all font-mono text-sm"
            >
              <ArrowLeft size={16} />
              ZURÜCK ZUR GALAXIE
            </button>
          )}
        </div>
        <div className="text-cyan-400/70 font-mono text-sm">
          {viewMode === 'galaxy'
            ? `${GALAXY_SIZE}x${GALAXY_SIZE} SEKTOREN (${GALAXY_SIZE * GALAXY_SIZE} TOTAL) • JEDER SEKTOR: ${FIELDS_PER_SECTOR}x${FIELDS_PER_SECTOR} FELDER`
            : (() => {
                const startX = (selectedSector!.x - 1) * FIELDS_PER_SECTOR + 1;
                const endX = selectedSector!.x * FIELDS_PER_SECTOR;
                const startY = (selectedSector!.y - 1) * FIELDS_PER_SECTOR + 1;
                const endY = selectedSector!.y * FIELDS_PER_SECTOR;
                return `${FIELDS_PER_SECTOR}x${FIELDS_PER_SECTOR} FELDER • GALAXIE-KOORDINATEN: ${startX}-${endX} X ${startY}-${endY}`;
              })()
          }
        </div>
      </div>

      {/* Imperial Command Navigation Breadcrumb */}
      <div className="mb-6 bg-gradient-to-r from-cyan-950/30 to-slate-900/40 border border-cyan-500/20 rounded p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-mono">
          <button
            onClick={handleBackToGalaxy}
            className={`px-2 py-1 rounded border transition-all ${
              viewMode === 'galaxy'
                ? 'text-cyan-300 border-cyan-500/40 bg-cyan-900/30'
                : 'text-cyan-400/70 border-transparent hover:text-cyan-300 hover:border-cyan-500/30'
            }`}
          >
            [GALAXIE]
          </button>
          {viewMode === 'sector' && selectedSector && (
            <>
              <span className="text-cyan-500/60">&gt;</span>
              <span className="text-cyan-300 px-2 py-1 rounded border border-cyan-500/40 bg-cyan-900/20">
                [SEKTOR {selectedSector.x}|{selectedSector.y}]
              </span>
            </>
          )}
        </div>
      </div>

      {/* Imperial Command Legend */}
      <div className="mb-6 bg-gradient-to-r from-slate-950/30 to-cyan-950/20 border border-cyan-500/20 rounded p-4 backdrop-blur-sm">
        <div className="flex gap-6 flex-wrap font-mono text-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-black/60 border border-slate-700/50 rounded"></div>
            <span className="text-cyan-300/70">LEER</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-900/40 border border-cyan-600/50 rounded"></div>
            <span className="text-cyan-300/70">UNBESIEDELT</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-900/60 border border-red-600/60 rounded"></div>
            <span className="text-cyan-300/70">IMPERIUM</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-orange-900/60 border border-orange-600/60 rounded"></div>
            <span className="text-cyan-300/70">REBELLEN</span>
          </div>
        </div>
      </div>

      {/* Galaxy View - Sector Grid (6x6) - STU Style */}
      {viewMode === 'galaxy' && (
        <div className="relative rounded-lg p-6 overflow-auto border border-cyan-900/30" style={{ background: 'radial-gradient(ellipse at center, #000810 0%, #000205 100%)' }}>
          {/* Star overlay for galaxy view */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `
              radial-gradient(1px 1px at 5% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),
              radial-gradient(1px 1px at 20% 35%, rgba(255,255,255,0.4) 0%, transparent 100%),
              radial-gradient(1px 1px at 35% 60%, rgba(255,255,255,0.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 55% 20%, rgba(255,255,255,0.5) 0%, transparent 100%),
              radial-gradient(1px 1px at 75% 45%, rgba(255,255,255,0.4) 0%, transparent 100%),
              radial-gradient(1px 1px at 90% 75%, rgba(255,255,255,0.3) 0%, transparent 100%)
            `
          }} />
          <table className="border-collapse mx-auto relative z-10">
            <thead>
              <tr>
                <th className="text-cyan-600/50 text-sm p-2 font-mono">x|y</th>
                {Array.from({ length: GALAXY_SIZE }, (_, i) => (
                  <th key={i} className="text-cyan-600/50 text-sm p-2 w-32 font-mono">
                    {(i + 1) * FIELDS_PER_SECTOR}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: GALAXY_SIZE }, (_, y) => (
                <tr key={y}>
                  <td className="text-cyan-600/50 text-sm p-2 text-right font-mono">
                    {(y + 1) * FIELDS_PER_SECTOR}
                  </td>
                  {Array.from({ length: GALAXY_SIZE }, (_, x) => {
                    const sectorY = y + 1;  // Y = row (vertical)
                    const sectorX = x + 1;  // X = column (horizontal)
                    const sectorNum = y * GALAXY_SIZE + x + 1;
                    const sector = sectors.get(`${sectorX},${sectorY}`);
                    const isHovered = hoveredSector?.x === sectorX && hoveredSector?.y === sectorY;
                    const hasOwnPlanets = sector?.systems.some(s => s.hasOwnPlanets) || false;

                    return (
                      <td
                        key={x}
                        className={`border border-cyan-900/30 cursor-pointer transition-all ${
                          isHovered ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-black/30 hover:bg-cyan-900/20'
                        }`}
                        onClick={() => handleSectorClick(sectorX, sectorY)}
                        onMouseEnter={() => setHoveredSector({ x: sectorX, y: sectorY })}
                        onMouseLeave={() => setHoveredSector(null)}
                      >
                        <div className="h-24 w-32 flex items-center justify-center relative">
                          <div className="text-center">
                            <div className="text-cyan-400 font-semibold font-mono text-sm">SEKTOR {sectorNum}</div>
                            {hasOwnPlanets && (
                              <div className="absolute top-1 right-1">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sector View - Field Grid (20x20) STU-Style Table */}
      {viewMode === 'sector' && selectedSector && (
        <div className="flex gap-4">
          <div className="relative rounded-lg p-4 overflow-auto flex-1 border border-cyan-900/30" style={{ background: 'radial-gradient(ellipse at center, #000810 0%, #000205 100%)' }}>
            {/* Subtle star overlay for the map */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
              backgroundImage: `
                radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.4) 0%, transparent 100%),
                radial-gradient(1px 1px at 30% 45%, rgba(255,255,255,0.3) 0%, transparent 100%),
                radial-gradient(1px 1px at 50% 25%, rgba(255,255,255,0.5) 0%, transparent 100%),
                radial-gradient(1px 1px at 70% 65%, rgba(255,255,255,0.3) 0%, transparent 100%),
                radial-gradient(1px 1px at 90% 35%, rgba(255,255,255,0.4) 0%, transparent 100%),
                radial-gradient(1px 1px at 20% 85%, rgba(255,255,255,0.3) 0%, transparent 100%),
                radial-gradient(1px 1px at 60% 95%, rgba(255,255,255,0.4) 0%, transparent 100%),
                radial-gradient(1px 1px at 80% 5%, rgba(255,255,255,0.5) 0%, transparent 100%)
              `
            }} />
            <table className="border-collapse mx-auto relative z-10">
            <thead>
              <tr>
                <th className="text-cyan-600/50 text-xs p-1 font-mono">x|y</th>
                {Array.from({ length: FIELDS_PER_SECTOR }, (_, i) => {
                  const galaxyX = (selectedSector.x - 1) * FIELDS_PER_SECTOR + i + 1;
                  return (
                    <th key={i} className="text-cyan-600/50 text-xs p-1 w-8 font-mono">
                      {galaxyX}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: FIELDS_PER_SECTOR }, (_, y) => {
                const galaxyY = (selectedSector.y - 1) * FIELDS_PER_SECTOR + y + 1;
                return (
                  <tr key={y}>
                    <td className="text-cyan-600/50 text-xs p-1 text-right font-mono">
                      {galaxyY}
                    </td>
                    {Array.from({ length: FIELDS_PER_SECTOR }, (_, x) => {
                      const field = sectorFields.find(f => f.x === x + 1 && f.y === y + 1);
                      const isHovered = hoveredField?.x === x + 1 && hoveredField?.y === y + 1;
                      const hasSystem = !!field?.system;
                      const hasOwnPlanets = field?.system?.hasOwnPlanets || false;

                      return (
                        <td
                          key={x}
                          className={`border border-cyan-900/20 cursor-pointer transition-all relative ${
                            isHovered ? 'bg-cyan-500/30 border-cyan-500/50' : 'bg-black/30 hover:bg-cyan-900/20'
                          }`}
                          onClick={() => field && handleFieldClick(field)}
                          onMouseEnter={() => handleMouseEnter(x + 1, y + 1)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <div className="h-8 w-8 flex items-center justify-center relative">
                            {/* Starmap background for ALL fields */}
                            {selectedSector && (
                              <StarmapBackground
                                sectorX={selectedSector.x}
                                sectorY={selectedSector.y}
                                fieldX={x + 1}
                                fieldY={y + 1}
                              />
                            )}

                            {hasSystem && field?.system && (
                              <>
                                {/* System type visualization */}
                                <SunImage
                                  systemType={field.system.systemType}
                                  size={18}
                                  alt={field.system.name}
                                  className="relative z-10"
                                />
                                {/* Own planets indicator */}
                                {hasOwnPlanets && (
                                  <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full z-20"></div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* STU-Style Navigation Panel - Right Side */}
        <div className="rounded-lg p-4 w-24 flex flex-col items-center justify-start gap-2 border border-cyan-900/30" style={{ background: 'linear-gradient(180deg, rgba(0,20,40,0.8) 0%, rgba(0,10,20,0.9) 100%)' }}>
          {/* Up Arrow */}
          <button
            onClick={() => selectedSector.y > 1 && handleSectorClick(selectedSector.x, selectedSector.y - 1)}
            disabled={selectedSector.y <= 1}
            className={`w-12 h-12 flex items-center justify-center text-2xl rounded border transition font-mono ${
              selectedSector.y > 1
                ? 'bg-cyan-900/30 hover:bg-cyan-700/40 text-cyan-400 border-cyan-700/50 cursor-pointer hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/20'
                : 'bg-black/30 text-cyan-900/50 border-cyan-900/20 cursor-not-allowed'
            }`}
            title={selectedSector.y > 1 ? `Sektor ${selectedSector.x}|${selectedSector.y - 1}` : ''}
          >
            ∧
          </button>

          {/* Left Arrow */}
          <button
            onClick={() => selectedSector.x > 1 && handleSectorClick(selectedSector.x - 1, selectedSector.y)}
            disabled={selectedSector.x <= 1}
            className={`w-12 h-12 flex items-center justify-center text-2xl rounded border transition font-mono ${
              selectedSector.x > 1
                ? 'bg-cyan-900/30 hover:bg-cyan-700/40 text-cyan-400 border-cyan-700/50 cursor-pointer hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/20'
                : 'bg-black/30 text-cyan-900/50 border-cyan-900/20 cursor-not-allowed'
            }`}
            title={selectedSector.x > 1 ? `Sektor ${selectedSector.x - 1}|${selectedSector.y}` : ''}
          >
            &lt;
          </button>

          {/* Current Sector Number */}
          <div className="w-12 h-12 flex items-center justify-center bg-black/50 text-cyan-400 font-bold text-lg rounded border border-cyan-500/50 font-mono" style={{ boxShadow: '0 0 10px rgba(0,255,255,0.2)' }}>
            {(selectedSector.y - 1) * GALAXY_SIZE + selectedSector.x}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => selectedSector.x < GALAXY_SIZE && handleSectorClick(selectedSector.x + 1, selectedSector.y)}
            disabled={selectedSector.x >= GALAXY_SIZE}
            className={`w-12 h-12 flex items-center justify-center text-2xl rounded border transition font-mono ${
              selectedSector.x < GALAXY_SIZE
                ? 'bg-cyan-900/30 hover:bg-cyan-700/40 text-cyan-400 border-cyan-700/50 cursor-pointer hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/20'
                : 'bg-black/30 text-cyan-900/50 border-cyan-900/20 cursor-not-allowed'
            }`}
            title={selectedSector.x < GALAXY_SIZE ? `Sektor ${selectedSector.x + 1}|${selectedSector.y}` : ''}
          >
            &gt;
          </button>

          {/* Down Arrow */}
          <button
            onClick={() => selectedSector.y < GALAXY_SIZE && handleSectorClick(selectedSector.x, selectedSector.y + 1)}
            disabled={selectedSector.y >= GALAXY_SIZE}
            className={`w-12 h-12 flex items-center justify-center text-2xl rounded border transition font-mono ${
              selectedSector.y < GALAXY_SIZE
                ? 'bg-cyan-900/30 hover:bg-cyan-700/40 text-cyan-400 border-cyan-700/50 cursor-pointer hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/20'
                : 'bg-black/30 text-cyan-900/50 border-cyan-900/20 cursor-not-allowed'
            }`}
            title={selectedSector.y < GALAXY_SIZE ? `Sektor ${selectedSector.x}|${selectedSector.y + 1}` : ''}
          >
            ∨
          </button>
        </div>
      </div>
      )}

      {/* Planet List Modal - Shows when clicking on a sector in galaxy view */}
      {/* Modal removed - navigation now goes directly from galaxy → sector → system → planet */}
    </div>
  );
}
