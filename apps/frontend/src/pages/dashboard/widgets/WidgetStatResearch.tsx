import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

const TICK_DURATION_MINUTES = 15;

function ticksToHuman(ticks: number): string {
  const totalMinutes = ticks * TICK_DURATION_MINUTES;
  if (totalMinutes < 60) return `~${totalMinutes}min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

export function WidgetStatResearch({ data }: { data: DashboardData }) {
  const r = data.activeResearch;
  const pct =
    r && r.pointsRequired > 0
      ? Math.round((r.progress / r.pointsRequired) * 100)
      : null;

  return (
    <Link to="/research" className="block h-full">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 hover:border-swu-accent/40 transition-colors h-full">
        <div className="text-[10px] text-swu-muted uppercase tracking-wider">Forschung</div>
        <div className="text-lg font-bold text-swu-accent font-mono">
          {data.researchCompleted}
        </div>
        {r ? (
          <>
            <div className="text-[10px] text-swu-primary truncate">{r.name}</div>
            {pct !== null && (
              <div className="text-[10px] text-swu-muted">
                {pct}%{r.ticksRemaining != null ? ` · ${ticksToHuman(r.ticksRemaining)}` : ''}
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-swu-muted">abgeschl.</div>
        )}
      </div>
    </Link>
  );
}
