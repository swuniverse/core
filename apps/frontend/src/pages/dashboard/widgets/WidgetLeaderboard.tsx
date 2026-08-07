import { useAuthStore } from '../../../stores/auth.store';
import type { DashboardData } from '../types';

export function WidgetLeaderboard({ data }: { data: DashboardData }) {
  const user = useAuthStore((s) => s.user);
  // ponytail: data.serverStats holds overview, rankings come from a separate API call
  // For now render server stats as a placeholder until rankings are wired into DashboardData
  const stats = data.serverStats;

  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Universum
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {stats ? (
          <>
            <div className="flex justify-between text-[11px]">
              <span className="text-swu-muted">Siedler</span>
              <span className="font-mono text-swu-primary">{stats.settlers}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-swu-muted">Kolonien</span>
              <span className="font-mono text-swu-primary">{stats.colonies}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-swu-muted">Schiffe</span>
              <span className="font-mono text-swu-primary">{stats.ships}</span>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-swu-muted">Keine Daten.</div>
        )}
        {user && (
          <div className="pt-1 border-t border-swu-border/30 text-[10px] text-swu-muted">
            Du: Prestige {user.prestige ?? 0}
          </div>
        )}
      </div>
    </div>
  );
}
