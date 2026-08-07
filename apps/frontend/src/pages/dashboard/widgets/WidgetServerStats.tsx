import type { DashboardData } from '../types';

export function WidgetServerStats({ data }: { data: DashboardData }) {
  const s = data.serverStats;
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider mb-2">
        Universum-Stats
      </div>
      {s ? (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-swu-muted">Siedler</span>
            <span className="font-mono text-swu-primary">{s.settlers}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-swu-muted">Kolonien</span>
            <span className="font-mono text-swu-primary">{s.colonies}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-swu-muted">Schiffe</span>
            <span className="font-mono text-swu-primary">{s.ships}</span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-swu-muted">Keine Daten.</div>
      )}
    </div>
  );
}
