import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Link } from 'react-router-dom';
import { Rocket, Wrench, Clock, FlaskConical, X, Radio } from 'lucide-react';
import api from '../lib/api';
import { InlinePlotBadge } from '../components/PlotBadge';

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

interface HoloNetMessage {
  id: number;
  title?: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  player: {
    id: number;
    username: string;
    factionName: string;
  };
  plot?: {
    id: number;
    title: string;
    description?: string;
  } | null;
}

export default function Dashboard() {
  const { user } = useGameStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextTickTime, setNextTickTime] = useState<Date | null>(null);
  const [timeUntilTick, setTimeUntilTick] = useState<string>('');
  const [tickProgress, setTickProgress] = useState<number>(0);
  const [holoNetMessages, setHoloNetMessages] = useState<HoloNetMessage[]>([]);

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
        const response = await fetch('/api/player/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
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

  useEffect(() => {
    const fetchHoloNetMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/holonet/messages', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Take only the last 3 messages
          setHoloNetMessages(data.slice(-3).reverse());
        } else {
          console.error('HoloNet error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Failed to load HoloNet messages:', error);
      }
    };

    fetchHoloNetMessages();
    const interval = setInterval(fetchHoloNetMessages, 60000); // Refresh every 60s
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
      const response = await fetch('/api/player/dashboard', {
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

  const activeResearch = dashboardData?.activeResearch ?? [];
  const hasActiveResearch = activeResearch.length > 0;

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
      {/* Imperial Command Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg p-6 mb-8 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider mb-2">
              WILLKOMMEN ZURÜCK, COMMANDER {user?.username?.toUpperCase()}
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-cyan-400/70 font-mono">
                FRAKTION: {user?.player?.faction?.name}
              </span>
              <span className="text-cyan-400/70 font-mono">
                PLANETEN: {dashboardData?.planets.length || 0}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-cyan-400/60 font-mono">STATUS</div>
            <div className="text-sm text-cyan-300 font-mono">AKTIV</div>
          </div>
        </div>
      </div>

      {/* Tick Timer - Imperial Command Terminal */}
      <div className="bg-gradient-to-r from-cyan-950/30 to-slate-900/50 border border-cyan-500/30 rounded-lg p-6 mb-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <Clock size={20} className="text-cyan-300" />
            </div>
            <div>
              <h3 className="text-cyan-100 font-mono font-semibold tracking-wider">NÄCHSTER TICK</h3>
              <p className="text-xs text-cyan-400/60 font-mono">TICKS: 00:00, 12:00, 15:00, 18:00, 21:00 UHR</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-200 font-mono">{timeUntilTick}</div>
            {nextTickTime && (
              <div className="text-xs text-cyan-400/60 font-mono">
                {nextTickTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/60 border border-slate-700/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 transition-all duration-1000"
            style={{ width: `${tickProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-cyan-400/60 font-mono mt-2">
          <span>LETZTER TICK</span>
          <span>{tickProgress.toFixed(1)}%</span>
          <span>NÄCHSTER TICK</span>
        </div>
      </div>

      {/* Imperial Command HoloNet Terminal */}
      <div className="bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border border-blue-500/30 p-6 rounded backdrop-blur-sm mb-8">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-blue-500/20">
          <div className="p-2 bg-blue-900/40 border border-blue-500/40 rounded">
            <Radio size={18} className="text-blue-300" />
          </div>
          <h3 className="text-lg font-mono font-semibold text-blue-100 tracking-wider">HOLONET-NACHRICHTEN</h3>
        </div>

        <div className="space-y-4">
          {holoNetMessages.length > 0 ? (
            holoNetMessages.map((message) => (
              <div key={message.id} className="bg-blue-950/20 border border-blue-500/20 p-4 rounded">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {message.title && (
                      <h4 className="text-blue-100 font-mono font-semibold text-sm mb-2">{message.title}</h4>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs px-2 py-1 rounded border border-blue-500/40 bg-blue-900/30 text-blue-300 font-mono">
                        {message.player.factionName}
                      </span>
                      <span className="text-xs text-blue-400 font-mono">
                        {message.player.username}
                      </span>
                      {message.plot && (
                        <InlinePlotBadge plot={message.plot} />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-blue-400/60 font-mono">
                    {new Date(message.createdAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <p className="text-blue-200/90 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                  {message.message}
                </p>
                {message.updatedAt && (
                  <div className="mt-2 text-xs text-blue-500/50 font-mono">
                    Bearbeitet: {new Date(message.updatedAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-blue-400/60 text-sm font-mono text-center py-8">
              KEINE HOLONET-NACHRICHTEN VERFÜGBAR
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Imperial Command Construction Terminal */}
        <div className="bg-gradient-to-r from-orange-950/30 to-red-950/20 border border-orange-500/30 p-6 rounded backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-orange-500/20">
            <div className="p-2 bg-orange-900/40 border border-orange-500/40 rounded">
              <Wrench size={18} className="text-orange-300" />
            </div>
            <h3 className="text-lg font-mono font-semibold text-orange-100 tracking-wider">BAUAUFTRÄGE</h3>
          </div>

          {dashboardData && dashboardData.activeConstructions.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.activeConstructions.map((construction) => (
                <Link
                  key={construction.id}
                  to={`/planet/${construction.planetId}`}
                  className="block p-4 bg-orange-950/20 border border-orange-500/20 rounded hover:border-orange-500/40 hover:bg-orange-950/30 transition-all"
                >
                  <div className="text-sm">
                    <p className="text-orange-100 font-mono font-semibold mb-2">{construction.buildingName}</p>
                    <p className="text-orange-300/60 text-xs font-mono mb-3">PLANET: {construction.planetName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-300 font-mono">
                        VERBLEIBEND: {getRemainingTime(construction.completesAt)}
                      </span>
                      <Rocket size={14} className="text-orange-400 animate-pulse" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-orange-400/60 text-sm font-mono">KEINE AKTIVEN BAUAUFTRÄGE</p>
          )}
        </div>

        {/* Imperial Command Research Terminal */}
        <div className="bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border border-cyan-500/30 p-6 rounded backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-cyan-500/20">
            <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <FlaskConical size={18} className="text-cyan-300" />
            </div>
            <h3 className="text-lg font-mono font-semibold text-cyan-100 tracking-wider">LAUFENDE FORSCHUNGEN</h3>
          </div>

          <div className="space-y-4">
            {hasActiveResearch ? (
              <div className="space-y-4">
                {activeResearch.map((research) => (
                  <div key={research.id} className="bg-cyan-950/20 border border-cyan-500/20 p-4 rounded">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <h4 className="text-cyan-100 font-mono font-semibold text-sm">{research.researchTypeName}</h4>
                        <span className="text-xs px-2 py-1 rounded border border-cyan-500/40 bg-cyan-900/30 text-cyan-300 font-mono">
                          {research.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-300 text-xs font-mono">
                          {research.progress} / {research.maxProgress} {research.resourceType}
                        </span>
                        <button
                          onClick={cancelResearch}
                          className="p-1.5 bg-red-900/60 border border-red-500/40 hover:bg-red-900/80 hover:border-red-500/60 rounded transition-all"
                          title="Forschung abbrechen"
                        >
                          <X size={12} className="text-red-300" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${(research.progress / research.maxProgress) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-cyan-400/60 font-mono flex items-center justify-between">
                      <span>{Math.round((research.progress / research.maxProgress) * 100)}% ABGESCHLOSSEN</span>
                      <FlaskConical size={12} className="text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cyan-400/60 text-sm font-mono">KEINE AKTIVEN FORSCHUNGEN</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
