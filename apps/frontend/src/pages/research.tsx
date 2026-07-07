import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface TechDependency {
  type: 'REQUIRE' | 'REQUIRE_SOME' | 'EXCLUDE';
  techIds: number[];
}

interface ResourceCost {
  commodityId: number;
  amount: number;
  name: string;
}

interface ProductionItem {
  commodityId: number;
  amount: number;
  name: string;
}

interface UnlockBuilding {
  id: number;
  name?: string;
  rawName?: string;
  buildTime?: number;
  costs?: { buildTime?: number } | ResourceCost[];
  resourceCosts?: ResourceCost[];
  production?: ProductionItem[];
  epsProc?: number;
  bevPro?: number;
  bonuses?: { energy: number; population: number; storage: number };
}

interface TechState {
  id: number;
  name: string;
  rawName?: string;
  key?: string;
  description?: string;
  category: string;
  tier: number;
  duration: number;
  dependencies: TechDependency[];
  unlocks?: { buildings?: UnlockBuilding[]; shipClasses?: number[]; modules?: string[] };
  researchMode?: 'commodity' | 'points';
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

export function ResearchPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const focusTechId = Number(searchParams.get('focus')) || null;
  const [techs, setTechs] = useState<TechState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<TechState | null>(null);

  const load = async () => {
    const data = await api.get<TechState[]>('/research');
    setTechs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (focusTechId && techs.length > 0) {
      const t = techs.find((tech) => tech.id === focusTechId);
      if (t) setSelectedTech(t);
    }
  }, [focusTechId, techs]);

  const startResearch = async (techId: number) => {
    await api.post('/research/start', { techId });
    setSelectedTech(null);
    load();
  };

  const cancelResearch = async (techId?: number) => {
    await api.post('/research/cancel', { techId });
    load();
  };

  const triggerTick = async () => {
    await api.post('/admin/tick/trigger', {});
    load();
  };

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Forschung wird geladen...</div>;

  const activeResearch = techs.find((tech) => tech.status === 'IN_PROGRESS');
  const queuedResearch = techs.find((tech) => tech.status === 'QUEUED');
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
        <div
          className="bg-swu-surface border border-swu-success/30 rounded px-4 py-3 cursor-pointer hover:border-swu-success/60 transition-colors"
          onClick={() => setSelectedTech(activeResearch)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-swu-success font-bold uppercase tracking-wider">Aktiv</span>
                <span className="text-sm font-bold text-swu-primary truncate">{activeResearch.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex-1 h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
                  <div
                    className="h-full bg-swu-success transition-all"
                    style={{ width: `${activeResearch.pointsRequired > 0 ? (activeResearch.progress / activeResearch.pointsRequired) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-swu-muted shrink-0">
                  {activeResearch.progress}/{activeResearch.pointsRequired} {activeResearch.commodity?.name ?? 'FP'}
                </span>
              </div>
              {activeResearch.blockedReason && (
                <span className="text-[10px] text-red-400 font-bold mt-1 block">Blockiert: Keine Produktion</span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); cancelResearch(activeResearch.id); }}
              className="px-2 py-1 text-[10px] font-bold border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors shrink-0"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Queued Research */}
      {queuedResearch && (
        <div
          className="bg-swu-surface border border-swu-accent/30 rounded px-4 py-3 cursor-pointer hover:border-swu-accent/60 transition-colors"
          onClick={() => setSelectedTech(queuedResearch)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-swu-accent font-bold uppercase tracking-wider">Warteschlange</span>
                <span className="text-sm font-bold text-swu-primary truncate">{queuedResearch.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] font-mono text-swu-muted">
                  0/{queuedResearch.pointsRequired} {queuedResearch.commodity?.name ?? 'FP'}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); cancelResearch(queuedResearch.id); }}
              className="px-2 py-1 text-[10px] font-bold border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors shrink-0"
            >
              Entfernen
            </button>
          </div>
        </div>
      )}

      {/* Available Research */}
      {availableTechs.length > 0 && (
        <div>
          <div className="px-1 py-1.5">
            <span className="text-xs font-bold text-swu-muted uppercase tracking-wider">Verfuegbare Forschungen</span>
          </div>
          <div className="space-y-1.5">
            {availableTechs.map((tech) => (
              <TechCard key={tech.id} tech={tech} onClick={() => setSelectedTech(tech)} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedTechs.length > 0 && (
        <div>
          <div className="px-1 py-1.5">
            <span className="text-xs font-bold text-swu-muted uppercase tracking-wider">Abgeschlossen ({completedTechs.length})</span>
          </div>
          <div className="space-y-1">
            {completedTechs.map((tech) => (
              <div
                key={tech.id}
                onClick={() => setSelectedTech(tech)}
                className="bg-swu-surface/50 border border-swu-border/30 rounded px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-swu-border/60 transition-colors"
              >
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-xs text-swu-primary">{tech.name}</span>
                {tech.commodity && (
                  <span className="text-[10px] text-swu-muted ml-auto">{tech.commodity.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTech && (
        <TechDetailModal
          tech={selectedTech}
          techs={techs}
          activeResearch={activeResearch ?? null}
          queuedResearch={queuedResearch ?? null}
          onStart={() => startResearch(selectedTech.id)}
          onSelect={(t) => setSelectedTech(t)}
          onClose={() => setSelectedTech(null)}
        />
      )}
    </div>
  );
}

function TechCard({ tech, onClick }: { tech: TechState; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-swu-surface border border-swu-border/50 rounded px-4 py-3 cursor-pointer hover:border-swu-accent/40 hover:bg-swu-accent/5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-swu-primary">{tech.name}</div>
          {tech.description && (
            <div className="text-[11px] text-swu-muted mt-0.5 line-clamp-1">{tech.description}</div>
          )}
        </div>
        <div className="text-[11px] text-swu-muted shrink-0 text-right">
          {tech.commodity
            ? <><span className="text-swu-accent font-bold">{tech.pointsRequired}</span> {tech.commodity.name}</>
            : <><span className="text-swu-accent font-bold">{tech.pointsRequired}</span> FP</>
          }
        </div>
      </div>
    </div>
  );
}

function TechDetailModal({
  tech,
  techs,
  activeResearch,
  queuedResearch,
  onStart,
  onSelect,
  onClose,
}: {
  tech: TechState;
  techs: TechState[];
  activeResearch: TechState | null;
  queuedResearch: TechState | null;
  onStart: () => void;
  onSelect: (t: TechState) => void;
  onClose: () => void;
}) {
  const downstreamTechs = techs.filter((t) =>
    t.dependencies.some((d) => d.type === 'REQUIRE' && d.techIds.includes(tech.id))
  );

  const unlockBuildings = (tech.unlocks?.buildings ?? [])
    .filter((b): b is UnlockBuilding & { name: string } => !!b.name)
    .filter((b) => !b.name?.startsWith('__'))
    .filter((b, i, arr) => arr.findIndex((x) => x.name === b.name) === i);

  const isCompleted = tech.status === 'COMPLETED';
  const isInProgress = tech.status === 'IN_PROGRESS';
  const isQueued = tech.status === 'QUEUED';

  const canStartDirect = tech.status === 'AVAILABLE' && !activeResearch;
  const canQueue =
    tech.status === 'AVAILABLE' &&
    !!activeResearch &&
    !queuedResearch &&
    activeResearch.commodity?.id === tech.commodity?.id;
  const canStart = canStartDirect || canQueue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#0d121c] border border-swu-border rounded-lg w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-swu-border bg-swu-surface/50">
          <span className="text-sm font-bold text-swu-primary">Forschung: {tech.name}</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-swu-muted hover:text-swu-text border border-swu-border/50 rounded text-xs"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Description */}
          {tech.description && (
            <p className="text-[11px] text-swu-text leading-relaxed">{tech.description}</p>
          )}

          {/* Info Table */}
          <div className="border border-swu-border/50 rounded overflow-hidden">
            <div className="grid grid-cols-2 text-[10px] font-bold text-swu-muted uppercase tracking-wider bg-swu-surface/50">
              <div className="px-3 py-1.5 border-r border-swu-border/50">Punkte</div>
              <div className="px-3 py-1.5">Benoetigte Ware / Effekt</div>
            </div>
            <div className="grid grid-cols-2 text-xs">
              <div className="px-3 py-2 border-r border-swu-border/50 font-mono text-swu-text">
                {tech.pointsRequired}
              </div>
              <div className="px-3 py-2 text-swu-text">
                {tech.commodity?.name ?? 'Forschungspunkte'}
                {tech.researchMode === 'commodity' && (
                  <span className="text-[9px] text-swu-muted ml-1">(Produktion)</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress (if in progress) */}
          {isInProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-swu-muted">
                <span>Fortschritt</span>
                <span className="font-mono">{tech.progress}/{tech.pointsRequired}</span>
              </div>
              <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
                <div
                  className="h-full bg-swu-success transition-all"
                  style={{ width: `${(tech.progress / tech.pointsRequired) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status badge */}
          {isCompleted && (
            <div className="text-center">
              <span className="text-[11px] text-green-400 font-bold">✓ Erforscht</span>
            </div>
          )}
          {isQueued && (
            <div className="text-center">
              <span className="text-[11px] text-swu-accent font-bold">In Warteschlange</span>
            </div>
          )}

          {/* Action button */}
          {canStart && (
            <div className="text-center pt-1">
              <button
                onClick={onStart}
                className="px-4 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 transition-colors"
              >
                {canQueue ? 'In Warteschlange' : 'Erforschen'}
              </button>
            </div>
          )}

          {/* Downstream techs */}
          {downstreamTechs.length > 0 && (
            <div className="border-t border-swu-border/30 pt-3">
              <div className="text-[10px] text-swu-muted font-bold uppercase tracking-wider mb-2 text-center">
                Folgende Forschungen werden ermoeglicht
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {downstreamTechs.map((dt) => (
                  <span
                    key={dt.id}
                    className="px-2 py-1 text-[10px] bg-swu-primary/10 border border-swu-primary/40 text-swu-primary rounded"
                  >
                    {dt.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unlock buildings */}
          {unlockBuildings.length > 0 && (
            <div className="border-t border-swu-border/30 pt-3">
              <div className="text-[10px] text-swu-muted font-bold uppercase tracking-wider mb-2 text-center">
                Schaltet frei
              </div>
              <div className="space-y-2">
                {unlockBuildings.map((b) => (
                  <BuildingCard key={b.id} building={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function BuildingCard({ building }: { building: UnlockBuilding }) {
  const costs = building.resourceCosts ?? [];
  const production = building.production ?? [];
  const energy = building.epsProc ?? 0;
  const storage = building.bonuses?.storage ?? 0;
  const housing = building.bevPro ?? 0;
  const buildTime = building.buildTime ?? 0;

  const effects = [
    ...(energy !== 0 ? [`⚡ ${energy > 0 ? '+' : ''}${energy}`] : []),
    ...(storage > 0 ? [`📦 +${storage}`] : []),
    ...(housing > 0 ? [`🏠 +${housing}`] : []),
  ];

  return (
    <div className="bg-swu-bg/50 border border-swu-border/40 rounded px-3 py-2">
      <div className="text-xs font-bold text-cyan-400 mb-1.5">{building.name}</div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {/* Baukosten */}
        <div>
          <div className="text-swu-muted font-bold mb-0.5">Baukosten</div>
          {costs.map((c) => (
            <div key={c.commodityId} className="text-swu-text">{c.amount} {c.name}</div>
          ))}
          {buildTime > 0 && (
            <div className="text-swu-muted mt-0.5">⏱ {formatDuration(buildTime)}</div>
          )}
        </div>
        {/* Produktion */}
        <div>
          <div className="text-swu-muted font-bold mb-0.5">Produktion</div>
          {production.map((p) => (
            <div key={p.commodityId} className={p.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
              {p.amount > 0 ? '+' : ''}{p.amount} {p.name}
            </div>
          ))}
          {production.length === 0 && <div className="text-swu-muted">—</div>}
        </div>
        {/* Auswirkungen */}
        <div>
          <div className="text-swu-muted font-bold mb-0.5">Auswirkungen</div>
          {effects.length > 0
            ? effects.map((e, i) => <div key={i} className="text-swu-text">{e}</div>)
            : <div className="text-swu-muted">—</div>
          }
        </div>
      </div>
    </div>
  );
}
