import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import api from '../lib/api';
import { Globe, MapPin, Check } from 'lucide-react';

interface StartPlanet {
  id: number;
  name: string;
  planetType: string;
  sectorX: number;
  sectorY: number;
  available: boolean;
}

const planetTypeColors: Record<string, string> = {
  TERRAN: 'bg-green-600',
  DESERT: 'bg-yellow-600',
  ICE: 'bg-blue-400',
  JUNGLE: 'bg-green-700',
  VOLCANIC: 'bg-red-600',
};

const planetTypeDescriptions: Record<string, string> = {
  TERRAN: 'Erdähnlicher Planet mit ausgewogenen Ressourcen',
  DESERT: 'Trockene Welt mit Mineralvorkommen',
  ICE: 'Gefrorener Planet mit Wasserreserven',
  JUNGLE: 'Dichte Vegetation, reich an organischen Materialien',
  VOLCANIC: 'Geschmolzene Oberfläche mit seltenen Mineralien',
};

export default function PlanetSelection() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const checkAuth = useGameStore((state) => state.checkAuth);
  
  const [planets, setPlanets] = useState<StartPlanet[]>([]);
  const [selectedPlanet, setSelectedPlanet] = useState<StartPlanet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStartPlanets();
  }, []);

  const loadStartPlanets = async () => {
    try {
      const response = await api.get('/galaxy/start-planets');
      setPlanets(response.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load planets');
      setIsLoading(false);
    }
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
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="text-blue-400" />
                Verfügbare Planeten
              </h2>
              
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {planet.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded text-white text-sm ${planetTypeColors[planet.planetType]}`}>
                          {planet.planetType}
                        </span>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <MapPin size={14} />
                          Sector {planet.sectorX}:{planet.sectorY}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {planetTypeDescriptions[planet.planetType]}
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
                      <div className={`w-full h-32 rounded-lg ${planetTypeColors[selectedPlanet.planetType]} flex items-center justify-center`}>
                        <Globe size={64} className="text-white/50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 p-3 rounded">
                        <p className="text-gray-400 text-sm">Typ</p>
                        <p className="text-white font-semibold">{selectedPlanet.planetType}</p>
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
    </div>
  );
}
