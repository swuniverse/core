import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetFleetStatus({ data }: { data: DashboardData }) {
  const red = data.allShips.filter((s) => s.alertState === 'RED');
  const yellow = data.allShips.filter((s) => s.alertState === 'YELLOW');
  const green = data.allShips.filter(
    (s) => !s.alertState || s.alertState === 'GREEN',
  );

  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 flex items-center justify-between shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Flottenstatus
        </span>
        <Link to="/spacecraft" className="text-[10px] text-swu-accent hover:underline">
          →
        </Link>
      </div>
      <div className="px-3 py-2 space-y-1 overflow-auto flex-1">
        {red.length > 0 && (
          <div className="text-[10px] text-red-400 font-bold">
            🔴 Alarm — {red.map((s) => s.name).join(', ')}
          </div>
        )}
        {yellow.length > 0 && (
          <div className="text-[10px] text-swu-warning">
            🟡 Warnung — {yellow.map((s) => s.name).join(', ')}
          </div>
        )}
        {green.length > 0 && (
          <div className="text-[10px] text-swu-success">
            🟢 {green.length} Schiff{green.length !== 1 ? 'e' : ''} einsatzbereit
          </div>
        )}
        {data.allShips.length === 0 && (
          <div className="text-[10px] text-swu-muted">Keine Schiffe.</div>
        )}
      </div>
    </div>
  );
}
