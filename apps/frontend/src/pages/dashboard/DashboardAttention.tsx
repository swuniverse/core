import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

export function DashboardAttention({ data }: { data: DashboardData }) {
  const items = data.baustelleAlerts.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section
      className="border border-swu-border bg-swu-surface/70"
      aria-label="Handlungsbedarf"
    >
      <header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
        Handlungsbedarf{' '}
        {items.length > 0 && (
          <span className="text-swu-warning">· {items.length}</span>
        )}
      </header>
      <div className="divide-y divide-swu-border/60">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.linkTo}
            className="flex gap-2 px-3 py-2 text-xs hover:bg-white/5"
          >
            <span aria-hidden>{item.icon}</span>
            <span className="min-w-0">
              <strong
                className={
                  item.severity === 'critical'
                    ? 'text-red-300'
                    : 'text-swu-warning'
                }
              >
                {item.label}
              </strong>
              <span className="ml-2 text-swu-muted">{item.detail}</span>
            </span>
            <span className="ml-auto text-swu-muted">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
