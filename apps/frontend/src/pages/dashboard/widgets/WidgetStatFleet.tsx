import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

const ALERT_COLOR: Record<string, string> = {
  RED: 'text-red-400',
  YELLOW: 'text-swu-warning',
  GREEN: 'text-swu-success',
};

export function WidgetStatFleet({ data }: { data: DashboardData }) {
  const red = data.allShips.filter((s) => s.alertState === 'RED').length;
  const yellow = data.allShips.filter((s) => s.alertState === 'YELLOW').length;

  return (
    <Link to="/spacecraft" className="block h-full">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 hover:border-swu-accent/40 transition-colors h-full">
        <div className="text-[10px] text-swu-muted uppercase tracking-wider">Schiffe</div>
        <div className="text-lg font-bold text-swu-accent font-mono">{data.fleetTotal}</div>
        {data.fleetInFlight > 0 && (
          <div className="text-[10px] text-swu-muted">{data.fleetInFlight} im Flug</div>
        )}
        <div className="text-[10px] flex gap-1.5 mt-0.5">
          {red > 0 && <span className={ALERT_COLOR.RED}>🔴 {red}</span>}
          {yellow > 0 && <span className={ALERT_COLOR.YELLOW}>🟡 {yellow}</span>}
          {red === 0 && yellow === 0 && data.fleetTotal > 0 && (
            <span className={ALERT_COLOR.GREEN}>🟢 Alles ok</span>
          )}
        </div>
      </div>
    </Link>
  );
}
