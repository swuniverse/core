import type { DashboardData } from '../types';
import { SegmentedBar } from './shared';

export function WidgetCurrentObjective({ data }: { data: DashboardData }) {
  const obj = data.currentObjective;
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider mb-2">
        Aktuelles Ziel
      </div>
      {obj ? (
        <div className="space-y-1">
          <div className="text-xs text-swu-primary font-bold">{obj.title}</div>
          {obj.description && (
            <div className="text-[10px] text-swu-muted">{obj.description}</div>
          )}
          {obj.progress != null && obj.target != null && (
            <div className="flex items-center gap-2 mt-1">
              <SegmentedBar
                value={obj.progress}
                max={obj.target}
                color="bg-swu-accent"
                label={obj.title}
              />
              <span className="text-[10px] font-mono text-swu-muted">
                {obj.progress}/{obj.target}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-swu-muted">Kein aktives Ziel.</div>
      )}
    </div>
  );
}
