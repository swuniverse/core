import { useState, useEffect } from 'react';
import { Shield, Zap, Database, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useGameStore } from '../stores/gameStore';

export default function Admin() {
  const { player } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [tickLoading, setTickLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<number | null>(null);
  const [planets, setPlanets] = useState<any[]>([]);
  const [resources, setResources] = useState({
    credits: 1000,
    durastahl: 1000,
    kristall: 1000,
    energy: 1000,
  });

  useEffect(() => {
    loadPlanets();
  }, []);

  const loadPlanets = async () => {
    try {
      const response = await api.get('/player/dashboard');
      setPlanets(response.data.planets || []);
      if (response.data.planets.length > 0) {
        setSelectedPlanetId(response.data.planets[0].id);
      }
    } catch (error) {
      console.error('Failed to load planets:', error);
    }
  };

  const triggerTick = async () => {
    setTickLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/trigger-tick');
      setMessage({ type: 'success', text: response.data.message });
      // Reload planets to show updated resources
      setTimeout(loadPlanets, 1000);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Tick konnte nicht ausgelöst werden' 
      });
    } finally {
      setTickLoading(false);
    }
  };

  const addResources = async () => {
    if (!selectedPlanetId) {
      setMessage({ type: 'error', text: 'Bitte wähle einen Planeten aus' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/add-resources', {
        planetId: selectedPlanetId,
        ...resources,
      });
      setMessage({ type: 'success', text: response.data.message });
      // Reload planets to show updated resources
      setTimeout(loadPlanets, 500);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Ressourcen konnten nicht hinzugefügt werden' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!player?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-700 p-6 rounded-lg text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Zugriff verweigert</h1>
          <p className="text-gray-400">Du hast keine Admin-Rechte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-red-400" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-white">Admin-Menü</h1>
          <p className="text-gray-400 text-sm">Entwickler-Tools für schnellere Tests</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-700 text-green-400' 
            : 'bg-red-900/20 border border-red-700 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tick Trigger */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          Tick System
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Löse manuell einen Tick aus. Dies verarbeitet Ressourcenproduktion, Forschungsfortschritt und Energiebilanz.
        </p>
        <button
          onClick={triggerTick}
          disabled={tickLoading}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {tickLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Tick wird ausgeführt...
            </>
          ) : (
            <>
              <Zap size={20} />
              Tick auslösen
            </>
          )}
        </button>
      </div>

      {/* Add Resources */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Database className="text-blue-400" size={24} />
          Ressourcen hinzufügen
        </h2>

        {/* Planet Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Planet auswählen
          </label>
          <select
            value={selectedPlanetId || ''}
            onChange={(e) => setSelectedPlanetId(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            {planets.map((planet) => (
              <option key={planet.id} value={planet.id}>
                {planet.name} ({planet.coordinates})
              </option>
            ))}
          </select>
        </div>

        {/* Resource Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Credits
            </label>
            <input
              type="number"
              value={resources.credits}
              onChange={(e) => setResources({ ...resources, credits: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="0"
              step="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Durastahl
            </label>
            <input
              type="number"
              value={resources.durastahl}
              onChange={(e) => setResources({ ...resources, durastahl: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="0"
              step="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Kristall
            </label>
            <input
              type="number"
              value={resources.kristall}
              onChange={(e) => setResources({ ...resources, kristall: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="0"
              step="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Energie
            </label>
            <input
              type="number"
              value={resources.energy}
              onChange={(e) => setResources({ ...resources, energy: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              min="0"
              step="100"
            />
          </div>
        </div>

        <button
          onClick={addResources}
          disabled={loading || !selectedPlanetId}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Wird hinzugefügt...
            </>
          ) : (
            <>
              <Database size={20} />
              Ressourcen hinzufügen
            </>
          )}
        </button>
      </div>
    </div>
  );
}
