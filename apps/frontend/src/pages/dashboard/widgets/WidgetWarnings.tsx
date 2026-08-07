import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetWarnings({ data }: { data: DashboardData }) {
  const hasWarnings = data.warnings.length > 0;
  return (
    <div className={`bg-swu-surface border rounded px-3 py-2 h-full ${hasWarnings ? 'border-swu-warning/40' : 'border-swu-border'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${hasWarnings ? 'text-swu-warning' : 'text-swu-muted'}`}>
        Warnungen
      </div>
      {!hasWarnings ? (
        <div className="text-[10px] text-swu-muted">Keine Warnungen.</div>
      ) : (
        <div className="space-y-1">
          {data.warnings.map((w, i) => (
            <Link
              key={i}
              to={`/colonies?selected=${w.colonyId}`}
              className="flex items-center gap-2 text-xs text-swu-warning/90 hover:text-swu-warning transition-colors"
            >
              <span aria-hidden="true">{w.type === 'energy' ? '⚡' : '📦'}</span>
              <span>
                {w.colonyName}: {w.message}
              </span>
              <span className="ml-auto text-[10px]">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
