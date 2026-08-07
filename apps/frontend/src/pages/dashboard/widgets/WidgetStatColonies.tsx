import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetStatColonies({ data }: { data: DashboardData }) {
  const activeJobs = data.buildJobs.length;
  const energyWarnings = data.warnings.filter((w) => w.type === 'energy').length;
  const storageWarnings = data.warnings.filter((w) => w.type === 'storage').length;

  return (
    <Link to="/colonies" className="block h-full">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 hover:border-swu-accent/40 transition-colors h-full">
        <div className="text-[10px] text-swu-muted uppercase tracking-wider">Kolonien</div>
        <div className="text-lg font-bold text-swu-accent font-mono">{data.colonyCount}</div>
        {activeJobs > 0 && (
          <div className="text-[10px] text-swu-muted">{activeJobs} Bauaufträge</div>
        )}
        {(energyWarnings > 0 || storageWarnings > 0) && (
          <div className="text-[10px] text-swu-warning">
            {energyWarnings > 0 && <span>⚡{energyWarnings} </span>}
            {storageWarnings > 0 && <span>📦{storageWarnings}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
