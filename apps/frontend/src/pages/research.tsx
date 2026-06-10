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
  rawName?: string;
  key?: string;
  category: string;
  tier: number;
  duration: number;
  dependencies: TechDependency[];
  status: string;
  progress: number;
  pointsRequired: number;
  finishesAt: string | null;
  effort?: number;
  spentPoints?: number;
  remainingPoints?: number;
  pointsPerTick?: number;
  ticksRemaining?: number | null;
  commodity?: { id: number; name: string } | null;
  blockedReason?: string | null;
}

interface BuildingDef {
  id: number;
  name: string;
  rawName?: string;
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

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[´'`’]/g, '')
    .replace(/\s+/g, ' ');

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

  const getUnlocks = (tech: TechState): string[] => {
    const techNames = new Set([
      normalize(tech.name),
      ...(tech.rawName ? [normalize(tech.rawName)] : []),
      ...(tech.key ? [normalize(tech.key)] : []),
    ]);

    return buildings
      .filter((building) => {
        const req = building.researchRequired;
        return req ? techNames.has(normalize(req)) : false;
      })
      .map((building) => building.name);
  };

  const startResearch = async (techId: number) => {
    await api.post('/research/start', { techId });
    load();
  };

  const cancelResearch = async () => {
    await api.post('/research/cancel', {});
    load();
  };

  const triggerTick = async () => {
    await api.post('/admin/tick/trigger', {});
    load();
  };

  if (loading)
    return <div className="p-6 text-swu-muted">Forschung wird geladen...</div>;

  const categories = [
    ...new Set(techs.map((t) => t.category ?? 'uncategorized')),
  ];
  const activeResearch = techs.find((tech) => tech.status === 'IN_PROGRESS');

  const availableTechs = techs.filter((t) => t.status === 'AVAILABLE');
  const completedTechs = techs.filter((t) => t.status === 'COMPLETED');

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

      {activeResearch && <ActiveResearchPanel tech={activeResearch} onCancel={cancelResearch} />}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-3">
          Verfügbare Forschungen
        </h2>
        {categories.map((cat) => {
          const visible = availableTechs.filter(
            (t) => (t.category ?? 'uncategorized') === cat,
          );
          if (visible.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-bold text-swu-muted/60 uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visible.map((tech) => (
                  <TechCard
                    key={tech.id}
                    tech={tech}
                    techs={techs}
                    unlocks={getUnlocks(tech)}
                    isFocused={focusTechId === tech.id}
                    onStart={() => startResearch(tech.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {availableTechs.length === 0 && (
          <p className="text-sm text-swu-muted">Keine Forschungen verfügbar.</p>
        )}
      </section>

      {completedTechs.length > 0 && (
        <section className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <h2 className="text-sm font-bold text-swu-muted uppercase tracking-wider mb-3">
            Abgeschlossene Forschungen
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {completedTechs.map((tech) => (
              <div
                key={tech.id}
                className="rounded border border-green-500/30 bg-green-900/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-swu-primary">
                    {tech.name}
                  </span>
                  <StatusBadge status={tech.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatResearchCost(tech: TechState): string {
  if (!tech.commodity) return 'Keine Kosten';
  return `${tech.commodity.name}: ${tech.pointsRequired}`;
}

function formatResearchProgress(tech: TechState): string {
  return `${tech.progress}/${tech.pointsRequired}`;
}

const STATUS_LABELS: Record<string, string> = {
  LOCKED: 'Gesperrt',
  AVAILABLE: 'Verfügbar',
  IN_PROGRESS: 'In Arbeit',
  COMPLETED: 'Abgeschlossen',
};

function StatusBadge({ status }: { status: string }) {
  return <span className="text-[10px] uppercase text-swu-muted">{STATUS_LABELS[status] ?? status}</span>;
}

function ActiveResearchPanel({ tech, onCancel }: { tech: TechState; onCancel: () => void }) {
  const pct = tech.pointsRequired > 0 ? (tech.progress / tech.pointsRequired) * 100 : 0;
  return (
    <div className="mb-6 rounded-lg border border-swu-success/30 bg-swu-success/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm text-swu-primary">Aktive Forschung</strong>
        <button
          onClick={onCancel}
          className="px-2 py-0.5 text-[10px] font-bold uppercase border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors"
        >
          Abbrechen
        </button>
      </div>
      <p className="mt-2 text-base font-bold text-swu-primary">{tech.name}</p>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-swu-muted mb-1">
          <span>{tech.progress} / {tech.pointsRequired} Punkte</span>
          <span>
            {tech.ticksRemaining != null && `${tech.ticksRemaining} Tick(s) verbleibend`}
          </span>
        </div>
        <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
          <div
            className="h-full bg-swu-success transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-swu-muted">
        {tech.commodity && <span>Ressource: {tech.commodity.name}</span>}
        {tech.blockedReason && (
          <span className="text-red-400 font-bold">Blockiert: Ressource fehlt</span>
        )}
      </div>
    </div>
  );
}

function TechCard({
  tech,
  techs,
  unlocks,
  isFocused,
  onStart,
}: {
  tech: TechState;
  techs: TechState[];
  unlocks: string[];
  isFocused: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`bg-swu-surface border rounded-lg p-4 transition-all ${CATEGORY_COLORS[tech.category] || 'border-swu-border'} ${STATUS_STYLES[tech.status] || ''} ${isFocused ? 'ring-2 ring-swu-accent' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-swu-primary">{tech.name}</h3>
        <StatusBadge status={tech.status} />
      </div>
      <p className="text-[10px] text-swu-muted">
        {formatResearchCost(tech)}
        {tech.dependencies.filter((d) => d.type === 'REQUIRE').length > 0 && (
          <>
            {' '}· Erfordert:{' '}
            {tech.dependencies
              .filter((d) => d.type === 'REQUIRE')
              .flatMap((d) => d.techIds)
              .map((p) => techs.find((t) => t.id === p)?.name || `#${p}`)
              .join(', ')}
          </>
        )}
        {tech.dependencies.filter((d) => d.type === 'EXCLUDE').length > 0 && (
          <>
            {' '}·{' '}
            <span className="text-red-400">
              Schließt aus:{' '}
              {tech.dependencies
                .filter((d) => d.type === 'EXCLUDE')
                .flatMap((d) => d.techIds)
                .map((p) => techs.find((t) => t.id === p)?.name || `#${p}`)
                .join(', ')}
            </span>
          </>
        )}
      </p>
      {unlocks.length > 0 && (
        <p className="text-[10px] text-cyan-400 mt-1">
          Schaltet frei: {unlocks.join(', ')}
        </p>
      )}
      {tech.status === 'AVAILABLE' && (
        <button
          onClick={onStart}
          className="mt-2 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
        >
          Erforschen
        </button>
      )}
    </div>
  );
}
