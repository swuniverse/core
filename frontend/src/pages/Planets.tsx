import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Zap, Box, Coins, Gem, Wrench } from 'lucide-react';
import api from '../lib/api';
import PlanetImage, { getPlanetClassLabel } from '../components/PlanetImage';

interface Planet {
  id: number;
  name: string;
  planetClass: string;
  orbitRadius: number;
  orbitAngle: number;
  system: {
    id: number;
    name: string;
    systemType: string;
    fieldX: number;
    fieldY: number;
  };
  sector: { x: number; y: number };
  resources: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    energiemodule: number;
    kyberKristalle: number;
    bacta: number;
    beskar: number;
    energy: number;
    maxEnergy: number;
    storageCapacity: number;
  };
  buildingCount: number;
  activeBuildings: number;
}

export default function Planets() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlanets();
  }, []);

  const loadPlanets = async () => {
    try {
      const response = await api.get('/player/dashboard');
      setPlanets(response.data.planets || []);
    } catch (error) {
      console.error('Failed to load planets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <Globe className="text-cyan-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">PLANETEN-KOMMANDO</h1>
              <p className="text-cyan-400/70 font-mono text-sm">ÜBERSICHT DEINER KOLONISIERTEN WELTEN</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded p-8 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-cyan-200 font-mono tracking-wider">LADE PLANETEN-DATEN...</div>
          </div>
        </div>
      </div>
    );
  }

  if (planets.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <Globe className="text-cyan-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">PLANETEN-KOMMANDO</h1>
              <p className="text-cyan-400/70 font-mono text-sm">ÜBERSICHT DEINER KOLONISIERTEN WELTEN</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-dashed border-cyan-500/30 rounded p-12 text-center backdrop-blur-sm">
          <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-full w-fit mx-auto mb-6">
            <Globe size={48} className="text-cyan-400/60" />
          </div>
          <p className="text-cyan-200 text-lg font-mono tracking-wider">KEINE PLANETEN KOLONISIERT</p>
          <p className="text-cyan-400/60 text-sm font-mono mt-2">
            ERKUNDE DIE GALAXIE UND FINDE NEUE WELTEN ZUM BESIEDELN
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Imperial Command Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
            <Globe className="text-cyan-300" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">PLANETEN-KOMMANDO</h1>
            <p className="text-cyan-400/70 font-mono text-sm">ÜBERSICHT DEINER KOLONISIERTEN WELTEN</p>
          </div>
        </div>
      </div>

      {/* Imperial Command Planet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {planets.map((planet) => (
          <div key={planet.id} className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded backdrop-blur-sm overflow-hidden">
            {/* Minimalist Planet Header */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <PlanetImage
                  planetClass={planet.planetClass}
                  alt={planet.name}
                  size={50}
                  className="rounded-lg border border-cyan-500/20"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-cyan-100 font-mono tracking-wider mb-1">
                        {planet.name.toUpperCase()}
                      </h2>
                      <p className="text-cyan-400/70 text-sm font-mono">
                        {getPlanetClassLabel(planet.planetClass).toUpperCase()}
                      </p>
                      <p className="text-cyan-400/50 text-xs font-mono mt-1">
                        {planet.system.name} • {planet.system.fieldX}|{planet.system.fieldY}
                      </p>
                    </div>
                    <Link
                      to={`/planet/${planet.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-900/40 to-cyan-800/30 border border-cyan-500/30 text-cyan-100 rounded hover:from-cyan-800/50 hover:to-cyan-700/40 transition-all font-mono text-sm tracking-wider"
                    >
                      VERWALTEN
                    </Link>
                  </div>
                </div>
              </div>

              {/* Minimalist Key Resources */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-yellow-950/20 border border-yellow-500/20 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <Coins className="text-yellow-400" size={16} />
                    <span className="text-yellow-100 font-bold font-mono text-sm">
                      {planet.resources.credits > 999999
                        ? `${Math.floor(planet.resources.credits / 1000000)}M`
                        : planet.resources.credits > 999
                        ? `${Math.floor(planet.resources.credits / 1000)}K`
                        : planet.resources.credits}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/20 border border-slate-500/20 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <Wrench className="text-slate-400" size={16} />
                    <span className="text-slate-100 font-bold font-mono text-sm">
                      {planet.resources.durastahl > 999999
                        ? `${Math.floor(planet.resources.durastahl / 1000000)}M`
                        : planet.resources.durastahl > 999
                        ? `${Math.floor(planet.resources.durastahl / 1000)}K`
                        : planet.resources.durastahl}
                    </span>
                  </div>
                </div>

                <div className="bg-purple-950/20 border border-purple-500/20 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <Gem className="text-purple-400" size={16} />
                    <span className="text-purple-100 font-bold font-mono text-sm">
                      {planet.resources.kristallinesSilizium > 999999
                        ? `${Math.floor(planet.resources.kristallinesSilizium / 1000000)}M`
                        : planet.resources.kristallinesSilizium > 999
                        ? `${Math.floor(planet.resources.kristallinesSilizium / 1000)}K`
                        : planet.resources.kristallinesSilizium}
                    </span>
                  </div>
                </div>
              </div>

              {/* Minimalist Status Bar */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Zap className="text-yellow-500" size={14} />
                    <span className="text-cyan-200 font-mono">{planet.resources.energy}/{planet.resources.maxEnergy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Box className="text-cyan-400" size={14} />
                    <span className="text-cyan-200 font-mono">{Math.round((
                      planet.resources.credits +
                      planet.resources.durastahl +
                      planet.resources.kristallinesSilizium +
                      planet.resources.tibannaGas +
                      planet.resources.energiemodule +
                      planet.resources.kyberKristalle +
                      planet.resources.bacta +
                      planet.resources.beskar
                    ) / planet.resources.storageCapacity * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="text-cyan-400" size={14} />
                  <span className="text-cyan-200 font-mono">{planet.activeBuildings}/{planet.buildingCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
