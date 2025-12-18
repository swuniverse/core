import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Link } from 'react-router-dom';
import { Globe, Rocket, Wrench, TrendingUp, Zap, Box, Coins, Clock, Gem, Wind, Battery, Sparkles, Heart, Shield, FlaskConical, X } from 'lucide-react';
import api from '../lib/api';

interface DashboardData {
  planets: Array<{
    id: number;
    name: string;
    planetType: string;
    system: {
      id: number;
      name: string;
      systemType: string;
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
  }>;
  activeConstructions: Array<{
    id: number;
    buildingName: string;
    planetId: number;
    planetName: string;
    startedAt: string;
    completesAt: string;
  }>;
  activeResearch: Array<{
    id: number;
    researchTypeName: string;
    category: string;
    progress: number;
    maxProgress: number;
    resourceType: string;
  }>;
  totals: {
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
    storage: number;
  };
  production: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    energiemodule: number;
    kyberKristalle: number;
    bacta: number;
    beskar: number;
    energy: number;
  };
}

export default function Dashboard() {
  const { user } = useGameStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextTickTime, setNextTickTime] = useState<Date | null>(null);
  const [timeUntilTick, setTimeUntilTick] = useState<string>('');
  const [tickProgress, setTickProgress] = useState<number>(0);

  // Calculate next tick time (12:00, 15:00, 18:00, 21:00, 00:00)
  useEffect(() => {
    const calculateNextTick = () => {
      const now = new Date();
      const tickHours = [0, 12, 15, 18, 21];
      const currentHour = now.getHours();
      
      let nextHour = tickHours.find(h => h > currentHour);
      
      if (!nextHour) {
        // Next tick is tomorrow at 00:00
        nextHour = 0;
        now.setDate(now.getDate() + 1);
      }
      
      const next = new Date(now);
      next.setHours(nextHour, 0, 0, 0);
      
      setNextTickTime(next);
    };

    calculateNextTick();
    const interval = setInterval(calculateNextTick, 60000); // Recalculate every minute
    return () => clearInterval(interval);
  }, []);

  // Update countdown and progress bar
  useEffect(() => {
    if (!nextTickTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diffMs = nextTickTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeUntilTick('Tick läuft...');
        setTickProgress(100);
        // Recalculate next tick
        const tickHours = [0, 12, 15, 18, 21];
        const nextHour = tickHours.find(h => h > now.getHours()) || 0;
        const next = new Date(now);
        if (nextHour === 0) next.setDate(next.getDate() + 1);
        next.setHours(nextHour, 0, 0, 0);
        setNextTickTime(next);
        return;
      }

      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      if (hours > 0) {
        setTimeUntilTick(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilTick(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilTick(`${seconds}s`);
      }

      // Calculate progress (time passed since last tick)
      const tickHours = [0, 12, 15, 18, 21];
      const currentHour = now.getHours();
      let lastTickHour = [...tickHours].reverse().find(h => h <= currentHour);
      if (lastTickHour === undefined) lastTickHour = 21; // Yesterday 21:00
      
      const lastTick = new Date(now);
      if (lastTickHour > currentHour) {
        lastTick.setDate(lastTick.getDate() - 1);
      }
      lastTick.setHours(lastTickHour, 0, 0, 0);
      
      const totalInterval = nextTickTime.getTime() - lastTick.getTime();
      const elapsed = now.getTime() - lastTick.getTime();
      const progress = (elapsed / totalInterval) * 100;
      
      setTickProgress(Math.min(progress, 100));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextTickTime]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/player/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard data:', data);
          setDashboardData(data);
        } else {
          console.error('Dashboard error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const cancelResearch = async () => {
    if (!confirm('Forschung wirklich abbrechen? Der Fortschritt geht verloren.')) {
      return;
    }
    
    try {
      await api.post('/research/cancel');
      // Reload dashboard after cancel
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/player/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setDashboardData(await response.json());
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Forschung konnte nicht abgebrochen werden');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Lade Dashboard...</div>
      </div>
    );
  }

  const getRemainingTime = (completesAt: string) => {
    const now = new Date();
    const completes = new Date(completesAt);
    const diffMs = completes.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Fertig';
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Willkommen zurück, Commander {user?.username}!
        </h1>
        <p className="text-gray-400">
          {user?.player?.faction?.name} • {dashboardData?.planets.length || 0} Planet(en)
        </p>
      </div>

      {/* Tick Timer */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-purple-400" />
            <div>
              <h3 className="text-white font-semibold">Nächster Tick</h3>
              <p className="text-xs text-gray-400">Ticks: 00:00, 12:00, 15:00, 18:00, 21:00 Uhr</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-300">{timeUntilTick}</div>
            {nextTickTime && (
              <div className="text-xs text-gray-400">
                {nextTickTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${tickProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Letzter Tick</span>
          <span>{tickProgress.toFixed(1)}%</span>
          <span>Nächster Tick</span>
        </div>
      </div>

      {/* Total Resources Overview - 2x4 Grid für 8 Ressourcen */}
      {dashboardData && (
        <div className="space-y-4 mb-6">
          {/* Erste Reihe: Credits, Durastahl, Kristallines Silizium, Tibanna-Gas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-300 text-sm font-semibold">Credits Gesamt</span>
                <Coins size={20} className="text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.credits.toLocaleString()}</p>
              <p className="text-xs text-yellow-400 mt-1">+{dashboardData.production.credits}/Tick</p>
            </div>

            <div className="bg-gray-900/20 border border-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm font-semibold">Durastahl Gesamt</span>
                <Wrench size={20} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.durastahl.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">+{dashboardData.production.durastahl}/Tick</p>
            </div>

            <div className="bg-purple-900/20 border border-purple-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 text-sm font-semibold">Kristallines Silizium</span>
                <Gem size={20} className="text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.kristallinesSilizium.toLocaleString()}</p>
              <p className="text-xs text-purple-400 mt-1">+{dashboardData.production.kristallinesSilizium}/Tick</p>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-300 text-sm font-semibold">Tibanna-Gas</span>
                <Wind size={20} className="text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.tibannaGas.toLocaleString()}</p>
              <p className="text-xs text-cyan-400 mt-1">+{dashboardData.production.tibannaGas}/Tick</p>
            </div>
          </div>

          {/* Zweite Reihe: Energiemodule, Kyber-Kristalle, Bacta, Beskar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-300 text-sm font-semibold">Energiemodule</span>
                <Battery size={20} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.energiemodule.toLocaleString()}</p>
              <p className="text-xs text-blue-400 mt-1">+{dashboardData.production.energiemodule}/Tick</p>
            </div>

            <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-300 text-sm font-semibold">Kyber-Kristalle</span>
                <Sparkles size={20} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.kyberKristalle.toLocaleString()}</p>
              <p className="text-xs text-green-400 mt-1">+{dashboardData.production.kyberKristalle}/Tick</p>
            </div>

            <div className="bg-rose-900/20 border border-rose-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-rose-300 text-sm font-semibold">Bacta</span>
                <Heart size={20} className="text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.bacta.toLocaleString()}</p>
              <p className="text-xs text-rose-400 mt-1">+{dashboardData.production.bacta}/Tick</p>
            </div>

            <div className="bg-slate-900/20 border border-slate-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm font-semibold">Beskar</span>
                <Shield size={20} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-white">{dashboardData.totals.beskar.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">+{dashboardData.production.beskar}/Tick</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planets List */}
        <div className="lg:col-span-2 bg-space-light p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Deine Planeten</h3>
          </div>
          
          {dashboardData && dashboardData.planets.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.planets.map((planet) => (
                <Link
                  key={planet.id}
                  to={`/planet/${planet.id}`}
                  className="block p-4 bg-gray-700 hover:bg-gray-600 rounded transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">{planet.name}</h4>
                        <span className="text-xs text-gray-400">
                          [{planet.sector.x}:{planet.sector.y}]
                        </span>
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
                          {planet.planetType}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-gray-400">Credits:</span>
                          <span className="text-yellow-400 ml-1 font-mono">
                            {planet.resources.credits.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Durastahl:</span>
                          <span className="text-gray-400 ml-1 font-mono">
                            {planet.resources.durastahl.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Krist. Silizium:</span>
                          <span className="text-purple-400 ml-1 font-mono">
                            {planet.resources.kristallinesSilizium.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Tibanna-Gas:</span>
                          <span className="text-cyan-400 ml-1 font-mono">
                            {planet.resources.tibannaGas.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Energiemodule:</span>
                          <span className="text-blue-400 ml-1 font-mono">
                            {planet.resources.energiemodule.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Kyber:</span>
                          <span className="text-green-400 ml-1 font-mono">
                            {planet.resources.kyberKristalle.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Bacta:</span>
                          <span className="text-rose-400 ml-1 font-mono">
                            {planet.resources.bacta.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Beskar:</span>
                          <span className="text-slate-400 ml-1 font-mono">
                            {planet.resources.beskar.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Energie:</span>
                          <span className={`ml-1 font-mono ${
                            planet.resources.energy < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {planet.resources.energy}/{planet.resources.maxEnergy}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-400">
                        {planet.buildingCount} Gebäude
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Noch keine Planeten. Beginne zu erkunden!</p>
          )}
        </div>

        {/* Active Constructions */}
        <div className="bg-space-light p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={20} className="text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Bauaufträge</h3>
          </div>
          
          {dashboardData && dashboardData.activeConstructions.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.activeConstructions.map((construction) => (
                <Link
                  key={construction.id}
                  to={`/planet/${construction.planetId}`}
                  className="block p-3 bg-gray-700 hover:bg-gray-600 rounded transition"
                >
                  <div className="text-sm">
                    <p className="text-white font-semibold mb-1">{construction.buildingName}</p>
                    <p className="text-gray-400 text-xs mb-2">{construction.planetName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-400">
                        {getRemainingTime(construction.completesAt)}
                      </span>
                      <Rocket size={14} className="text-orange-400 animate-pulse" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine aktiven Bauaufträge</p>
          )}
        </div>
      </div>

      {/* Active Research */}
      <div className="bg-space-light p-6 rounded-lg border border-gray-700 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FlaskConical className="text-cyan-400" size={20} />
          Laufende Forschungen
        </h3>
        <div className="space-y-2">
          {dashboardData.activeResearch && dashboardData.activeResearch.length > 0 ? (
            <div className="space-y-2">
              {dashboardData.activeResearch.map((research) => (
                <div key={research.id} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <h4 className="text-white font-semibold text-sm">{research.researchTypeName}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300">
                        {research.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 text-xs font-mono">
                        {research.progress} / {research.maxProgress} {research.resourceType}
                      </span>
                      <button
                        onClick={cancelResearch}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        title="Forschung abbrechen"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-1.5 bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                      style={{ width: `${(research.progress / research.maxProgress) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-400 flex items-center justify-between">
                    <span>{Math.round((research.progress / research.maxProgress) * 100)}% abgeschlossen</span>
                    <FlaskConical size={12} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine aktiven Forschungen</p>
          )}
        </div>
      </div>
    </div>
  );
}
