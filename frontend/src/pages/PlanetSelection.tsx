import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import api from '../lib/api';
import { Globe, MapPin, Check, RefreshCw, Users } from 'lucide-react';
import PlanetImage, { planetClassColors, getPlanetClassLabel } from '../components/PlanetImage';

interface StartPlanet {
  id: number;
  name: string;
  planetClass: string;
  visualSeed?: number;
  sectorX: number;
  sectorY: number;
  available: boolean;
}

const planetClassDescriptions: Record<string, string> = {
  // STU Planet Classes
  CLASS_M: 'Erdähnlicher Planet - ideal für Kolonisierung mit ausgewogenen Ressourcen',
  CLASS_O: 'Ozeanwelt - reiche Wasservorkommen und marine Ressourcen',
  CLASS_L: 'Bewaldete Welt - dichte Vegetation und organische Materialien',
  CLASS_H: 'Wüstenwelt - extrem heiß mit wertvollen Mineralvorkommen',
  CLASS_P: 'Eiswelt - kalt aber reich an gefrorenen Wasserreserven',
  CLASS_K: 'Marsähnlicher Planet - dünne Atmosphäre mit Erzvorkommen',
  CLASS_G: 'Tundrawelt - kalte Oberfläche mit speziellen Ressourcen',
  CLASS_D: 'Mondähnliche Welt - karger Trabant mit Bergbaupotenziaal',

  // Extreme Classes
  CLASS_Q: 'Dichte Atmosphäre - schwierige aber lohnende Kolonisierung',
  CLASS_X: 'Vulkanwelt - gefährlich aber reich an seltenen Mineralien',

  // Legacy Support
  TERRAN: 'Erdähnlicher Planet mit ausgewogenen Ressourcen',
  DESERT: 'Trockene Welt mit Mineralvorkommen',
  ICE: 'Gefrorener Planet mit Wasserreserven',
  JUNGLE: 'Dichte Vegetation, reich an organischen Materialien',
  FOREST: 'Grüner Planet mit ausgedehnten Wäldern',
  VOLCANIC: 'Geschmolzene Oberfläche mit seltenen Mineralien',
  VOLCANO: 'Geschmolzene Oberfläche mit seltenen Mineralien',
  CITY: 'Urbanisierte Welt mit fortschrittlicher Infrastruktur',
};

export default function PlanetSelection() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const checkAuth = useGameStore((state) => state.checkAuth);
  
  const [planets, setPlanets] = useState<StartPlanet[]>([]);
  const [selectedPlanet, setSelectedPlanet] = useState<StartPlanet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showCoopModal, setShowCoopModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStartPlanets();
  }, []);

  const loadStartPlanets = async (options?: { nearSystem?: string, refresh?: number }) => {
    try {
      setError(''); // Clear previous errors

      // Build query parameters
      const params = new URLSearchParams();
      if (options?.nearSystem) params.append('nearSystem', options.nearSystem);
      if (options?.refresh) params.append('refresh', options.refresh.toString());

      const url = `/galaxy/start-planets${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      setPlanets(response.data);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load planets');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSelectedPlanet(null); // Clear selection when refreshing
    const newRefreshCount = refreshCount + 1;
    setRefreshCount(newRefreshCount);
    await loadStartPlanets({ refresh: newRefreshCount });
  };

  const handleCoopSearch = async (systemName: string) => {
    setIsLoading(true);
    setSelectedPlanet(null); // Clear selection when searching
    await loadStartPlanets({ nearSystem: systemName });
    setShowCoopModal(false);
  };

  const handleClaimPlanet = async () => {
    if (!selectedPlanet) return;

    setIsClaiming(true);
    setError('');

    try {
      await api.post(`/galaxy/claim-planet/${selectedPlanet.id}`);

      // Refresh user data to get the new planet
      await checkAuth();

      // Navigate to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to claim planet');
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="text-white text-xl">Lade Planeten...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Wähle deinen Startplaneten</h1>
          <p className="text-gray-300 text-lg">
            Kommandant {user?.username}, wähle einen Planeten für deine {user?.player?.faction?.name} Basis
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        {planets.length === 0 ? (
          <div className="bg-space-light p-8 rounded-lg border border-gray-700 text-center">
            <p className="text-gray-300 text-lg">Momentan sind keine Planeten verfügbar.</p>
            <p className="text-gray-500 mt-2">Bitte kontaktiere einen Administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Planet List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Globe className="text-blue-400" />
                  Verfügbare Planeten
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCoopModal(true)}
                    disabled={isLoading || isRefreshing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Mit Freund starten - Suche nach Planeten in der Nähe eines bestimmten Systems"
                  >
                    <Users size={16} />
                    Co-op
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading || isRefreshing}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Laden...' : 'Neue Planeten'}
                  </button>
                </div>
              </div>
              
              {planets.map((planet) => (
                <div
                  key={planet.id}
                  onClick={() => setSelectedPlanet(planet)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedPlanet?.id === planet.id
                      ? 'border-rebel bg-rebel/20'
                      : 'border-gray-700 bg-space-light hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <PlanetImage
                      planetClass={planet.planetClass}
                      visualSeed={planet.visualSeed}
                      alt={planet.name}
                      size={80}
                      className="rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {planet.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded text-white text-sm ${planetClassColors[planet.planetClass]}`}>
                          {getPlanetClassLabel(planet.planetClass)}
                        </span>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <MapPin size={14} />
                          Sector {planet.sectorX}:{planet.sectorY}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {planetClassDescriptions[planet.planetClass]}
                      </p>
                    </div>
                    {selectedPlanet?.id === planet.id && (
                      <Check className="text-rebel" size={24} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Planet Details & Claim */}
            <div className="lg:sticky lg:top-8 h-fit">
              {selectedPlanet ? (
                <div className="bg-space-light p-6 rounded-lg border border-gray-700">
                  <h2 className="text-2xl font-bold text-white mb-4">Planeten-Details</h2>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{selectedPlanet.name}</h3>
                      <div className="flex justify-center bg-black/30 rounded-lg p-4">
                        <PlanetImage
                          planetClass={selectedPlanet.planetClass}
                          visualSeed={selectedPlanet.visualSeed}
                          alt={selectedPlanet.name}
                          size={200}
                          className="rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 p-3 rounded">
                        <p className="text-gray-400 text-sm">Klasse</p>
                        <p className="text-white font-semibold">{getPlanetClassLabel(selectedPlanet.planetClass)}</p>
                      </div>
                      <div className="bg-gray-700/50 p-3 rounded">
                        <p className="text-gray-400 text-sm">Standort</p>
                        <p className="text-white font-semibold">
                          {selectedPlanet.sectorX}:{selectedPlanet.sectorY}
                        </p>
                      </div>
                      <div className="bg-gray-700/50 p-3 rounded">
                        <p className="text-gray-400 text-sm">Start-Credits</p>
                        <p className="text-yellow-400 font-semibold">10.000</p>
                      </div>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-700 p-4 rounded">
                      <h4 className="text-white font-semibold mb-2">Start-Ressourcen</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Kommandozentrale (Stufe 1)</li>
                        <li>• Basis-Energiegenerator</li>
                        <li>• Ressourcen-Extraktor</li>
                        <li>• 100 Bevölkerungskapazität</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={handleClaimPlanet}
                    disabled={isClaiming}
                    className="w-full bg-rebel hover:bg-rebel-light text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isClaiming ? 'Beanspruche Planet...' : 'Diesen Planeten beanspruchen'}
                  </button>
                </div>
              ) : (
                <div className="bg-space-light p-8 rounded-lg border border-gray-700 text-center">
                  <Globe size={64} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Wähle einen Planeten, um Details zu sehen</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Co-op Modal */}
      {showCoopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-space-light rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="text-blue-400" />
              Co-op Start
            </h3>
            <p className="text-gray-300 mb-4 text-sm">
              Gib den Namen eines Systems ein, um Startplaneten in der Nähe zu finden.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const systemName = formData.get('systemName') as string;
              if (systemName.trim()) {
                handleCoopSearch(systemName.trim());
              }
            }}>
              <input
                type="text"
                name="systemName"
                placeholder="System-Name eingeben..."
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 mb-4 focus:border-blue-400 focus:outline-none"
                autoFocus
                required
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCoopModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Suchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
