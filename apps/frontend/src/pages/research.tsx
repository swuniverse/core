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
  researchId?: number | null;
  researchRequired?: string;
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/[´'`']/g, '').replace(/\s+/g, ' ');

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

  useEffect(() => { load(); }, []);

  const getUnlocks = (tech: TechState): string[] =>
    buildings
      .filter((building) =>
        building.researchId != null
          ? building.researchId === tech.id
          : !!building.researchRequired &&
            [tech.name, tech.rawName, tech.key]
              .filter(Boolean)
              .some((candidate) => normalize(candidate as string) === normalize(building.researchRequired!)),
      )
      .map((building) => building.name);

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
    return <div className="p-4 text-swu-muted text-xs">Forschung wird geladen...</div>;

  const categories = [...new Set(techs.map((t) => t.category ?? 'uncategorized'))];
  const activeResearch = techs.find((tech) => tech.status === 'IN_PROGRESS');
  const availableTechs = techs.filter((t) => t.status === 'AVAILABLE');
  const completedTechs = techs.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-3">
      {/* Breadcrumb + Admin */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-swu-muted">/ Forschung</div>
        {user?.isAdmin && (
          <button
            onClick={triggerTick}
            className="px-2 py-1 bg-swu-primary/20 border border-swu-primary text-swu-primary text-[10px] font-bold rounded hover:bg-swu-primary/30 transition-colors"
          >
            Tick ausfuehren
          </button>
        )}
      </div>

      {/* Active Research */}
      {activeResearch && (
        <div className="bg-swu-surface border border-swu-success/30 rounded px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10px] text-swu-muted shrink-0">Aktiv:</span>
              <span className="text-xs font-bold text-swu-primary truncate">{activeResearch.name}</span>
              <div className="w-20 h-1.5 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50 shrink-0">
                <div
                  className="h-full bg-swu-success transition-all"
                  style={{ width: `${activeResearch.pointsRequired > 0 ? (activeResearch.progress / activeResearch.pointsRequired) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-swu-muted shrink-0">
                {activeResearch.progress}/{activeResearch.pointsRequired} {activeResearch.commodity?.name ?? 'Punkte'}
              </span>
              {activeResearch.ticksRemaining != null && (
                <span className="text-[10px] text-swu-muted shrink-0">
                  ({activeResearch.ticksRemaining} Ticks)
                </span>
              )}
              {activeResearch.blockedReason && (
                <span className="text-[10px] text-red-400 font-bold shrink-0">Blockiert</span>
              )}
            </div>
            <button
              onClick={cancelResearch}
              className="px-2 py-0.5 text-[10px] font-bold border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors shrink-0"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Available Research — List */}
      <div className="bg-swu-surface border border-swu-border rounded">
        <div className="px-3 py-2 border-b border-swu-border/50">
          <span className="text-xs font-bold text-swu-muted">Verfügbare Forschungen</span>
        </div>
        {categories.map((cat) => {
          const visible = availableTechs.filter((t) => (t.category ?? 'uncategorized') === cat);
          if (visible.length === 0) return null;
          return (
            <div key={cat}>
              {cat !== 'stu' && (
              <div className="px-3 py-1 bg-swu-bg/50 border-b border-swu-border/20">
                <span className="text-[10px] font-bold text-swu-muted uppercase tracking-wider">{cat}</span>
              </div>
            )}
              {visible.map((tech) => (
                <TechRow
                  key={tech.id}
                  tech={tech}
                  techs={techs}
                  unlocks={getUnlocks(tech)}
                  isFocused={focusTechId === tech.id}
                  hasActiveResearch={!!activeResearch}
                  onStart={() => startResearch(tech.id)}
                />
              ))}
            </div>
          );
        })}
        {availableTechs.length === 0 && (
          <div className="px-3 py-3 text-xs text-swu-muted">Keine Forschungen verfügbar.</div>
        )}
      </div>

      {/* Completed */}
      {completedTechs.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded">
          <div className="px-3 py-2 border-b border-swu-border/50">
            <span className="text-xs font-bold text-swu-muted">Abgeschlossen ({completedTechs.length})</span>
          </div>
          <div className="divide-y divide-swu-border/20">
            {completedTechs.map((tech) => (
              <div key={tech.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                <span className="text-green-400">✓</span>
                <span className="text-swu-primary">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TechRow({
  tech,
  techs,
  unlocks,
  isFocused,
  hasActiveResearch,
  onStart,
}: {
  tech: TechState;
  techs: TechState[];
  unlocks: string[];
  isFocused: boolean;
  hasActiveResearch: boolean;
  onStart: () => void;
}) {
  const deps = tech.dependencies.filter((d) => d.type === 'REQUIRE');
  const excludes = tech.dependencies.filter((d) => d.type === 'EXCLUDE');

  return (
    <div
      className={`px-3 py-2 flex items-center gap-3 border-b border-swu-border/20 hover:bg-swu-accent/5 transition-colors ${
        isFocused ? 'bg-swu-accent/10 ring-1 ring-swu-accent' : ''
      }`}
    >
      {/* Name + Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-swu-primary">{tech.name}</span>
          {deps.length > 0 && (
            <span className="text-[9px] text-swu-muted">
              ← {deps.flatMap((d) => d.techIds).map((id) => techs.find((t) => t.id === id)?.name || `#${id}`).join(', ')}
            </span>
          )}
        </div>
        {(unlocks.length > 0 || excludes.length > 0) && (
          <div className="flex items-center gap-2 mt-0.5">
            {unlocks.length > 0 && (
              <span className="text-[9px] text-cyan-400">Schaltet frei: {unlocks.join(', ')}</span>
            )}
            {excludes.length > 0 && (
              <span className="text-[9px] text-red-400">
                Schließt aus: {excludes.flatMap((d) => d.techIds).map((id) => techs.find((t) => t.id === id)?.name || `#${id}`).join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cost */}
      <div className="text-[10px] text-swu-muted shrink-0 text-right w-28">
        {tech.commodity ? `${tech.pointsRequired} ${tech.commodity.name}` : 'Keine Kosten'}
      </div>

      {/* Action */}
      <button
        onClick={onStart}
        disabled={hasActiveResearch}
        className="px-2 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] font-bold rounded hover:bg-swu-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        Erforschen
      </button>
    </div>
  );
}
