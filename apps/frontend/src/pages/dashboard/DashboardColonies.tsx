import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

export function DashboardColonies({ data }: { data: DashboardData }) {
  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="flex justify-between border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
        <span>Deine Kolonien · {data.colonyCount}</span>
        <Link to="/colonies" className="text-swu-muted hover:text-swu-accent">
          Alle →
        </Link>
      </header>
      {data.colonies.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3">
          {data.colonies.slice(0, 6).map((colony) => {
            const warnings = data.warnings.filter(
              (warning) => warning.colonyId === colony.id,
            );
            return (
              <Link
                key={colony.id}
                to={`/colonies?selected=${colony.id}`}
                className="flex items-center gap-3 border-b border-r border-swu-border/60 px-3 py-2 hover:bg-white/[0.04]"
              >
                <img
                  src="/assets/planets/201s.png"
                  alt=""
                  className="size-10 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-swu-primary">
                    {colony.name}
                  </div>
                  <div className="truncate text-[9px] text-swu-muted">
                    {colony.locationLabel ?? 'Unbekannter Standort'}
                  </div>
                  <div className="mt-1 flex gap-3 font-mono text-[9px] text-swu-muted">
                    <span>
                      EPS {colony.energy}/{colony.energyMax}
                    </span>
                    <span>
                      Lager {colony.storageUsed}/{colony.storageMax}
                    </span>
                  </div>
                </div>
                <span
                  className={`size-2 rounded-full ${warnings.length ? 'bg-swu-warning' : 'bg-swu-success'}`}
                  title={
                    warnings.map((warning) => warning.message).join(', ') ||
                    'Stabil'
                  }
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-swu-muted">
          Noch keine Kolonien gegründet.
        </p>
      )}
    </section>
  );
}
