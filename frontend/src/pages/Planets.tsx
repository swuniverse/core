import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Zap, Box, Coins, Gem, Wind, Battery, Sparkles, Heart, Shield, Wrench } from 'lucide-react';
import api from '../lib/api';
import PlanetImage, { getPlanetTypeLabel } from '../components/PlanetImage';

interface Planet {
  id: number;
  name: string;
  planetType: string;
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
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Lade Planeten...</div>
      </div>
    );
  }

  if (planets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Keine Planeten gefunden</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="text-blue-400" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-white">Meine Planeten</h1>
          <p className="text-gray-400 text-sm">Übersicht deiner kolonisierten Welten</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {planets.map((planet) => (
          <div key={planet.id} className="bg-space-light p-6 rounded-lg border border-gray-700">
            {/* Planet Header */}
            <div className="flex items-start gap-4 mb-4">
              <PlanetImage 
                planetType={planet.planetType}
                alt={planet.name}
                size={100}
                className="rounded-lg"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{planet.name}</h2>
                    <p className="text-gray-400 text-sm">
                      {getPlanetTypeLabel(planet.planetType)} • {planet.orbitRadius}|{planet.orbitAngle}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {planet.system.name} {planet.system.fieldX}|{planet.system.fieldY}
                    </p>
                  </div>
                  <Link
                    to={`/planet/${planet.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Planet verwalten
                  </Link>
                </div>
              </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="text-yellow-400" size={16} />
                  <span className="text-xs text-gray-400">Credits</span>
                </div>
                <div className="text-white font-bold">{planet.resources.credits.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Box className="text-gray-400" size={16} />
                  <span className="text-xs text-gray-400">Durastahl</span>
                </div>
                <div className="text-white font-bold">{planet.resources.durastahl.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Gem className="text-blue-400" size={16} />
                  <span className="text-xs text-gray-400">Kristall</span>
                </div>
                <div className="text-white font-bold">{planet.resources.kristallinesSilizium.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="text-cyan-400" size={16} />
                  <span className="text-xs text-gray-400">Tibanna</span>
                </div>
                <div className="text-white font-bold">{planet.resources.tibannaGas.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Battery className="text-green-400" size={16} />
                  <span className="text-xs text-gray-400">Module</span>
                </div>
                <div className="text-white font-bold">{planet.resources.energiemodule.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-purple-400" size={16} />
                  <span className="text-xs text-gray-400">Kyber</span>
                </div>
                <div className="text-white font-bold">{planet.resources.kyberKristalle.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="text-pink-400" size={16} />
                  <span className="text-xs text-gray-400">Bacta</span>
                </div>
                <div className="text-white font-bold">{planet.resources.bacta.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="text-orange-400" size={16} />
                  <span className="text-xs text-gray-400">Beskar</span>
                </div>
                <div className="text-white font-bold">{planet.resources.beskar.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="text-yellow-400" size={16} />
                  <span className="text-xs text-gray-400">Energie</span>
                </div>
                <div className="text-white font-bold">
                  {planet.resources.energy} / {planet.resources.maxEnergy}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Box className="text-gray-400" size={16} />
                  <span className="text-xs text-gray-400">Lager</span>
                </div>
                <div className="text-white font-bold">{planet.resources.storageCapacity.toLocaleString()}</div>
              </div>
            </div>

            {/* Building Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Wrench size={16} />
                <span>{planet.buildingCount} Gebäude ({planet.activeBuildings} aktiv)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
