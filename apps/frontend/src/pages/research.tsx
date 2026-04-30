import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface TechState {
  id: number;
  name: string;
  category: string;
  duration: number;
  prerequisites: number[];
  status: string;
  progress: number;
  finishesAt: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'border-green-500/50',
  military: 'border-red-500/50',
  weapons: 'border-orange-500/50',
  defense: 'border-blue-500/50',
  navigation: 'border-purple-500/50',
};

const STATUS_STYLES: Record<string, string> = {
  LOCKED: 'opacity-40',
  AVAILABLE: 'border-swu-accent/50',
  IN_PROGRESS: 'border-swu-success animate-pulse',
  COMPLETED: 'border-green-400 bg-green-900/20',
};

export function ResearchPage() {
  const [techs, setTechs] = useState<TechState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await api.get<TechState[]>('/research');
    setTechs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
                  Duration: {tech.duration} ticks
                  {tech.prerequisites.length > 0 && (
                    <> · Requires: {tech.prerequisites.map((p) => techs.find((t) => t.id === p)?.name || `#${p}`).join(', ')}</>
                  )}
                </p>
                {tech.status === 'IN_PROGRESS' && tech.finishesAt && (
                  <p className="text-[10px] text-swu-success mt-1">
                    ETA: {new Date(tech.finishesAt).toLocaleString()}
                  </p>
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
