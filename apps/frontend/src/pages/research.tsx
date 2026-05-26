import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

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
  pointsPerTick?: number;
  ticksRemaining?: number | null;
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
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const focusTechId = Number(searchParams.get('focus')) || null;
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

  useEffect(() => {
    load();
  }, []);

  const getUnlocks = (techName: string): string[] =>
    buildings.filter((b) => b.researchRequired === techName).map((b) => b.name);

  const startResearch = async (techId: number) => {
    await api.post('/research/start', { techId });
    load();
  };

  const triggerTick = async () => {
    await api.post('/admin/tick/trigger', {});
    load();
  };

  if (loading)
    return <div className="p-6 text-swu-muted">Forschung wird geladen...</div>;

  const categories = [...new Set(techs.map((t) => t.category))];
  const basicEngineering = techs.find((tech) => tech.id === 1);
  const shipyardOperations = techs.find((tech) => tech.id === 4);
  const activeResearch = techs.find((tech) => tech.status === 'IN_PROGRESS');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-swu-accent">Forschung</h1>
        {user?.isAdmin && (
          <button
            onClick={triggerTick}
            className="px-3 py-1.5 bg-swu-primary/20 border border-swu-primary text-swu-primary text-xs font-bold rounded hover:bg-swu-primary/30 transition-colors"
          >
            Tick ausfuehren
          </button>
        )}
      </div>

      {activeResearch && <ActiveResearchPanel tech={activeResearch} />}

      <section className="mb-6 bg-swu-accent/10 border border-swu-accent rounded-lg p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
          Frueher Werftpfad
        </p>
        <h2 className="text-lg font-bold text-swu-accent">
          Forschung fuer dein erstes Schiff
        </h2>
        <p className="text-sm text-swu-muted mt-1">
          Starte mit Grundlegender Ingenieurswissenschaft und erforsche danach
          Werftbetrieb, um den Werfthub bauen zu koennen.
        </p>
        <div className="grid gap-3 md:grid-cols-2 mt-4">
          {[basicEngineering, shipyardOperations]
            .filter(Boolean)
            .map((tech) => (
              <EarlyResearchGoal
                key={tech!.id}
                tech={tech!}
                isFocused={focusTechId === tech!.id}
                onStart={() => startResearch(tech!.id)}
              />
            ))}
        </div>
      </section>

      {categories.map((cat) => {
        const visible = techs.filter(
          (t) => t.category === cat && t.status !== 'LOCKED',
        );
        if (visible.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-2">
              {cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map((tech) => (
                <div
                  key={tech.id}
                  className={`bg-swu-surface border rounded-lg p-4 transition-all ${CATEGORY_COLORS[tech.category] || 'border-swu-border'} ${STATUS_STYLES[tech.status] || ''} ${focusTechId === tech.id ? 'ring-2 ring-swu-accent' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-swu-primary">
                      {tech.name}
                    </h3>
                    <StatusBadge status={tech.status} />
                  </div>
                  <p className="text-[10px] text-swu-muted">
                    Stufe {tech.tier} · {tech.pointsRequired} Pkt
                    {tech.dependencies.filter((d) => d.type === 'REQUIRE')
                      .length > 0 && (
                      <>
                        {' '}
                        · Erfordert:{' '}
                        {tech.dependencies
                          .filter((d) => d.type === 'REQUIRE')
                          .flatMap((d) => d.techIds)
                          .map(
                            (p) =>
                              techs.find((t) => t.id === p)?.name || `#${p}`,
                          )
                          .join(', ')}
                      </>
                    )}
                    {tech.dependencies.filter((d) => d.type === 'EXCLUDE')
                      .length > 0 && (
                      <>
                        {' '}
                        ·{' '}
                        <span className="text-red-400">
                          Schliesst aus:{' '}
                          {tech.dependencies
                            .filter((d) => d.type === 'EXCLUDE')
                            .flatMap((d) => d.techIds)
                            .map(
                              (p) =>
                                techs.find((t) => t.id === p)?.name || `#${p}`,
                            )
                            .join(', ')}
                        </span>
                      </>
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
                        <span>
                          Fortschritt · {tech.pointsPerTick ?? 1} Pkt/Tick
                        </span>
                        <span>
                          {tech.progress}/{tech.pointsRequired}
                          {tech.ticksRemaining != null &&
                            ` · ${tech.ticksRemaining} Tick(s)`}
                        </span>
                      </div>
                      <div className="h-1 bg-swu-bg rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-swu-success"
                          style={{
                            width: `${(tech.progress / tech.pointsRequired) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {tech.status === 'AVAILABLE' && (
                    <button
                      onClick={() => startResearch(tech.id)}
                      className="mt-2 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
                    >
                      Erforschen
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveResearchPanel({ tech }: { tech: TechState }) {
  const progressPercent =
    tech.pointsRequired > 0 ? (tech.progress / tech.pointsRequired) * 100 : 0;
  return (
    <section className="mb-6 bg-swu-surface border border-swu-success rounded-lg p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
        Aktive Forschung
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-swu-success">{tech.name}</h2>
          <p className="text-sm text-swu-muted mt-1">
            {tech.progress}/{tech.pointsRequired} Punkte ·{' '}
            {tech.pointsPerTick ?? 1} Punkt(e) pro Tick
            {tech.ticksRemaining != null &&
              ` · ca. ${tech.ticksRemaining} Tick(s) verbleibend`}
          </p>
        </div>
        <StatusBadge status={tech.status} />
      </div>
      <div className="h-2 bg-swu-bg rounded-full overflow-hidden mt-3 border border-swu-border/60">
        <div
          className="h-full bg-swu-success transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </section>
  );
}

function EarlyResearchGoal({
  tech,
  isFocused,
  onStart,
}: {
  tech: TechState;
  isFocused: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`rounded border p-3 bg-swu-surface ${
        isFocused
          ? 'border-swu-accent ring-2 ring-swu-accent/50'
          : 'border-swu-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-swu-primary">{tech.name}</h3>
          <p className="text-[10px] text-swu-muted mt-0.5">
            {tech.id === 1
              ? 'Grundlage fuer den fruehen Aufbau.'
              : 'Schaltet den Weg zum Werfthub frei.'}
          </p>
        </div>
        <StatusBadge status={tech.status} />
      </div>
      {tech.status === 'IN_PROGRESS' && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-swu-success">
            <span>Fortschritt</span>
            <span>
              {tech.progress}/{tech.pointsRequired}
            </span>
          </div>
          <div className="h-1 bg-swu-bg rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-swu-success"
              style={{
                width: `${(tech.progress / tech.pointsRequired) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {tech.status === 'AVAILABLE' && (
        <button
          onClick={onStart}
          className="mt-2 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
        >
          Jetzt erforschen
        </button>
      )}
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
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded ${styles[status] || ''}`}
    >
      {status}
    </span>
  );
}
