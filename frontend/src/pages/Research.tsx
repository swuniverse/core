import { useEffect, useState } from 'react';
import { FlaskConical, TrendingUp, CheckCircle, Clock, Lock, Shield, DollarSign, Atom, Zap } from 'lucide-react';
import api from '../lib/api';

interface ResearchType {
  id: number;
  name: string;
  description: string;
  researchLevel: number;
  category: string;
  researchPointCost: number;
  prerequisiteId: number | null;
  requiredLabCount: number;
  status: 'completed' | 'in_progress' | 'available' | 'locked';
  progress: number;
  maxProgress: number;
  productionRequirement?: {
    type: string;
    required: number;
    current: number;
    estimatedTicks: number;
    totalRequired: number;
  };
}

interface PlayerStats {
  labCount: number;
  production: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    energy: number;
  };
}

type Category = 'ALL' | 'MILITARY' | 'ECONOMICS' | 'ENERGY' | 'SCIENCE';

export default function Research() {
  const [researchTypes, setResearchTypes] = useState<ResearchType[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');

  useEffect(() => {
    loadResearch();
  }, []);

  const loadResearch = async () => {
    try {
      const response = await api.get('/research/available');
      setResearchTypes(response.data.research || []);
      setPlayerStats(response.data.playerStats || null);
    } catch (error) {
      console.error('Failed to load research:', error);
    } finally {
      setLoading(false);
    }
  };

  const startResearch = async (researchTypeId: number) => {
    try {
      await api.post('/research/start', { researchTypeId });
      await loadResearch();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Forschung konnte nicht gestartet werden');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MILITARY': return <Shield className="w-5 h-5" />;
      case 'ECONOMICS': return <DollarSign className="w-5 h-5" />;
      case 'ENERGY': return <Zap className="w-5 h-5" />;
      case 'SCIENCE': return <Atom className="w-5 h-5" />;
      default: return <FlaskConical className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'MILITARY': return 'Militär';
      case 'ECONOMICS': return 'Wirtschaft';
      case 'ENERGY': return 'Energie';
      case 'SCIENCE': return 'Wissenschaft';
      default: return category;
    }
  };

  const getPrerequisiteName = (prerequisiteId: number | null) => {
    if (!prerequisiteId) return null;
    const prerequisite = researchTypes.find(r => r.id === prerequisiteId);
    return prerequisite?.name || null;
  };

  const getLevelBadge = (level: number) => {
    const badges = [
      { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Stufe 0 - Basis' },
      { bg: 'bg-blue-700', text: 'text-blue-300', label: 'Stufe 1 - Fortgeschritten' },
      { bg: 'bg-purple-700', text: 'text-purple-300', label: 'Stufe 2 - Elite' },
      { bg: 'bg-yellow-700', text: 'text-yellow-300', label: 'Stufe 3 - Legendär' }
    ];
    return badges[level] || badges[0];
  };

  const filteredResearch = activeCategory === 'ALL' 
    ? researchTypes 
    : researchTypes.filter(r => r.category === activeCategory);

  const groupedByLevel = filteredResearch.reduce((acc, research) => {
    if (!acc[research.researchLevel]) {
      acc[research.researchLevel] = [];
    }
    acc[research.researchLevel].push(research);
    return acc;
  }, {} as Record<number, ResearchType[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-400 text-xl">Lade Forschungen...</div>
      </div>
    );
  }

  const categories: { value: Category; label: string; icon: JSX.Element }[] = [
    { value: 'ALL', label: 'Alle', icon: <FlaskConical className="w-5 h-5" /> },
    { value: 'MILITARY', label: 'Militär', icon: <Shield className="w-5 h-5" /> },
    { value: 'ECONOMICS', label: 'Wirtschaft', icon: <DollarSign className="w-5 h-5" /> },
    { value: 'ENERGY', label: 'Energie', icon: <Zap className="w-5 h-5" /> },
    { value: 'SCIENCE', label: 'Wissenschaft', icon: <Atom className="w-5 h-5" /> }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Forschungsbaum</h1>
        <p className="text-gray-400">Erforsche neue Technologien um dein Imperium zu stärken</p>
      </div>

      {/* Player Stats */}
      {playerStats && (
        <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="font-bold text-white mb-3">Deine Forschungskapazität</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Forschungslabore</div>
              <div className="text-white font-bold">{playerStats.labCount}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Credits/Tick</div>
              <div className="text-yellow-400 font-bold">{playerStats.production.credits}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Durastahl/Tick</div>
              <div className="text-gray-300 font-bold">{playerStats.production.durastahl}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Kristall/Tick</div>
              <div className="text-blue-400 font-bold">{playerStats.production.kristallinesSilizium}</div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Research by Level */}
      {Object.keys(groupedByLevel)
        .map(Number)
        .sort((a, b) => a - b)
        .map(level => {
          const levelBadge = getLevelBadge(level);
          return (
            <div key={level} className="mb-8">
              <div className={`${levelBadge.bg} ${levelBadge.text} px-4 py-2 rounded-lg mb-4 inline-block font-bold`}>
                {levelBadge.label}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByLevel[level].map(research => {
                  const prerequisiteName = getPrerequisiteName(research.prerequisiteId);
                  
                  return (
                    <div
                      key={research.id}
                      className={`border rounded-lg p-4 ${
                        research.status === 'completed'
                          ? 'bg-green-900/20 border-green-700'
                          : research.status === 'in_progress'
                          ? 'bg-blue-900/20 border-blue-700'
                          : research.status === 'available'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-gray-900 border-gray-800 opacity-60'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <div className="mt-1">
                            {getCategoryIcon(research.category)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">{research.name}</h3>
                            <p className="text-sm text-gray-400">{getCategoryName(research.category)}</p>
                          </div>
                        </div>
                        <div className="ml-2">
                          {research.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          ) : research.status === 'in_progress' ? (
                            <Clock className="w-6 h-6 text-blue-400" />
                          ) : research.status === 'locked' ? (
                            <Lock className="w-6 h-6 text-gray-600" />
                          ) : null}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-300 mb-3">{research.description}</p>

                      {/* Prerequisite */}
                      {prerequisiteName && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-400">Benötigt: </span>
                          <span className="text-blue-400">{prerequisiteName}</span>
                        </div>
                      )}

                      {/* Requirements */}
                      {research.requiredLabCount > 0 && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-400">Forschungslabore: </span>
                          <span className={playerStats && playerStats.labCount >= research.requiredLabCount ? 'text-green-400' : 'text-red-400'}>
                            {playerStats?.labCount || 0} / {research.requiredLabCount}
                          </span>
                        </div>
                      )}

                      {/* Costs */}
                      <div className="mb-3 text-sm">
                        <div className="text-gray-400 mb-1">Kosten:</div>
                        {research.productionRequirement ? (
                          <div className="space-y-1">
                            <div className="text-blue-400 font-bold">
                              {research.productionRequirement.totalRequired.toLocaleString()} {research.productionRequirement.type}
                            </div>
                            <div className="text-xs text-gray-400">
                              Deine Produktion: {research.productionRequirement.current} {research.productionRequirement.type}/Tick
                            </div>
                            <div className="text-xs text-blue-400">
                              Dauer: ~{research.productionRequirement.estimatedTicks} Tick{research.productionRequirement.estimatedTicks !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="text-blue-400 font-bold">{research.researchPointCost.toLocaleString()} FP</div>
                        )}
                      </div>

                      {/* Progress Bar for Active Research */}
                      {research.status === 'in_progress' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-blue-400">Fortschritt</span>
                            <span className="text-blue-300">{Math.round((research.progress / research.maxProgress) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                              style={{ width: `${(research.progress / research.maxProgress) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {research.progress} / {research.maxProgress} {research.productionRequirement ? research.productionRequirement.type : 'FP'}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <div>
                        {research.status === 'completed' ? (
                          <button
                            disabled
                            className="w-full py-2 px-4 bg-green-900/50 text-green-400 rounded font-medium cursor-not-allowed"
                          >
                            ✓ Abgeschlossen
                          </button>
                        ) : research.status === 'in_progress' ? (
                          <button
                            disabled
                            className="w-full py-2 px-4 bg-blue-900/50 text-blue-400 rounded font-medium cursor-not-allowed"
                          >
                            <Clock className="inline w-4 h-4 mr-2" />
                            In Arbeit...
                          </button>
                        ) : (
                          <button
                            onClick={() => startResearch(research.id)}
                            disabled={research.status !== 'available'}
                            className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                              research.status === 'available'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {research.status === 'available' ? (
                              <>
                                <TrendingUp className="inline w-4 h-4 mr-2" />
                                Forschen
                              </>
                            ) : (
                              <>
                                <Lock className="inline w-4 h-4 mr-2" />
                                Gesperrt
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {filteredResearch.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Keine Forschungen in dieser Kategorie gefunden</p>
        </div>
      )}
    </div>
  );
}
