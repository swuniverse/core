import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface TechDependency {
  type: 'REQUIRE' | 'REQUIRE_SOME' | 'EXCLUDE';
  techIds: number[];
}

interface TechState {
  id: number;
  name: string;
  category: string;
  tier: number;
  duration: number;
  dependencies: TechDependency[];
  status: string;
  progress: number;
  pointsRequired: number;
  finishesAt: string | null;
}

interface BuildingDef {
  id: number;
  name: string;
  researchRequired?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'border-green-500/50',
  military: 'border-red-500/50',
  weapons: 'border-orange-500/50',
  defense: 'border-blue-500/50',
  navigation: 'border-purple-500/50',
  special: 'border-cyan-500/50',
  faction_rebellion: 'border-yellow-500/50',
  faction_empire: 'border-red-700/50',
};

const STATUS_STYLES: Record<string, string> = {
  LOCKED: 'opacity-40',
  AVAILABLE: 'border-swu-accent/50',
  IN_PROGRESS: 'border-swu-success animate-pulse',
  COMPLETED: 'border-green-400 bg-green-900/20',
};

export function ResearchPage() {
  const [techs, setTechs] = useState<TechState[]>([]);
  const [buildings, setBuildings] = useState<BuildingDef[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [data, bldgs] = await Promise.all([
      api.get<TechState[]>('/research'),
      api.get<BuildingDef[]>('/colonies/buildings/available'),
    ]);
    setTechs(data);
    setBuildings(bldgs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getUnlocks = (techName: string): string[] =>
    buildings
      .filter((b) => b.researchRequired === techName)
      .map((b) => b.name);

  const startResearch = async (techId: number) => {
    await api.post('/research/start', { techId });
    load();
  };

  if (loading) return <div className="p-6 text-swu-muted">Loading research...</div>;

  const categories = [...new Set(techs.map((t) => t.category))];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Research</h1>

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-2">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {techs.filter((t) => t.category === cat).map((tech) => (
              <div
                key={tech.id}
                className={`bg-swu-surface border rounded-lg p-4 transition-all ${CATEGORY_COLORS[tech.category] || 'border-swu-border'} ${STATUS_STYLES[tech.status] || ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-swu-primary">{tech.name}</h3>
                  <StatusBadge status={tech.status} />
                </div>
                <p className="text-[10px] text-swu-muted">
                  Tier {tech.tier} · {tech.pointsRequired} pts
                  {tech.dependencies.filter((d) => d.type === 'REQUIRE').length > 0 && (
                    <> · Requires: {tech.dependencies.filter((d) => d.type === 'REQUIRE').flatMap((d) => d.techIds).map((p) => techs.find((t) => t.id === p)?.name || `#${p}`).join(', ')}</>
                  )}
                  {tech.dependencies.filter((d) => d.type === 'EXCLUDE').length > 0 && (
                    <> · <span className="text-red-400">Excludes: {tech.dependencies.filter((d) => d.type === 'EXCLUDE').flatMap((d) => d.techIds).map((p) => techs.find((t) => t.id === p)?.name || `#${p}`).join(', ')}</span></>
                  )}
                </p>
                {getUnlocks(tech.name).length > 0 && (
                  <p className="text-[10px] text-cyan-400 mt-1">
                    Schaltet frei: {getUnlocks(tech.name).join(', ')}
                  </p>
                )}
                {tech.status === 'IN_PROGRESS' && (
                  <div className="mt-1">
                    <div className="flex justify-between text-[10px] text-swu-success">
                      <span>Progress</span>
                      <span>{tech.progress}/{tech.pointsRequired}</span>
                    </div>
                    <div className="h-1 bg-swu-bg rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-swu-success" style={{ width: `${(tech.progress / tech.pointsRequired) * 100}%` }} />
                    </div>
                  </div>
                )}
                {tech.status === 'AVAILABLE' && (
                  <button
                    onClick={() => startResearch(tech.id)}
                    className="mt-2 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
                  >
                    Research
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LOCKED: 'bg-gray-700 text-gray-400',
    AVAILABLE: 'bg-swu-accent/20 text-swu-accent',
    IN_PROGRESS: 'bg-swu-success/20 text-swu-success',
    COMPLETED: 'bg-green-900/50 text-green-400',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[status] || ''}`}>
      {status}
    </span>
  );
}
