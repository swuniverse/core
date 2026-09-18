import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetDistressSignals({ data }: { data: DashboardData }) {
  return (
    <div className="h-full rounded border border-red-500/40 bg-red-950/20 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase text-red-300">
        Aktive Notrufe
      </h3>
      {(data.distressSignals ?? []).length === 0 ? (
        <p className="text-xs text-swu-muted">Keine aktiven Notrufe.</p>
      ) : (
        <ul className="space-y-2">
          {(data.distressSignals ?? []).map((signal) => (
            <li key={signal.id} className="text-xs">
              <Link
                to={`/spacecraft/${signal.spacecraftId}`}
                className="font-bold text-red-200"
              >
                {signal.shipName}
              </Link>
              <span className="ml-2 text-swu-muted">
                {signal.locationLabel}
              </span>
              <p className="text-swu-primary">{signal.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
