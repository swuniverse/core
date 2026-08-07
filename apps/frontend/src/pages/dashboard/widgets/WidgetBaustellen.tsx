import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetBaustellen({ data }: { data: DashboardData }) {
  const alerts = data.baustelleAlerts;
  const hasAlerts = alerts.length > 0;

  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-swu-muted"
        style={{ fontFamily: 'var(--font-swu-display)' }}
      >
        Handlungsbedarf
      </div>
      {!hasAlerts ? (
        <div className="text-[10px] text-swu-muted">Alles läuft.</div>
      ) : (
        <div className="space-y-1 overflow-auto max-h-48">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={alert.linkTo}
              className={`flex items-center gap-2 text-xs hover:opacity-80 transition-opacity ${
                alert.severity === 'critical' ? 'text-swu-danger' : 'text-swu-warning'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  alert.severity === 'critical' ? 'bg-swu-danger' : 'bg-swu-warning'
                }`}
                aria-hidden="true"
              />
              <span aria-hidden="true">{alert.icon}</span>
              <span className="font-bold truncate">{alert.label}</span>
              <span className="text-[10px] text-swu-muted truncate">{alert.detail}</span>
              <span className="ml-auto text-[10px] shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
