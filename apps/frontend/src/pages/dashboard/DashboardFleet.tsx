import { Link } from 'react-router-dom';
import type { DashboardData } from './types';
import { ShipName } from '../../components/ShipName';

const ALERT_PRESENTATION = {
  RED: { title: 'Alarmstufe Rot', color: 'bg-swu-negative' },
  YELLOW: { title: 'Alarmstufe Gelb', color: 'bg-swu-warning' },
  GREEN: { title: 'Alarmstufe Grün', color: 'bg-swu-positive' },
} as const;

export function DashboardFleet({ data }: { data: DashboardData }) {
  const ships = [...data.allShips]
    .sort(
      (a, b) =>
        Number(b.alertState === 'RED') - Number(a.alertState === 'RED'),
    )
    .slice(0, 6);

  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="flex justify-between border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
        <span>Deine Flotte · {data.fleetTotal}</span>
        <Link to="/spacecraft" className="text-swu-muted">
          Alle →
        </Link>
      </header>
      <div className="divide-y divide-swu-border/60">
        {ships.map((ship) => {
          const alert =
            ALERT_PRESENTATION[
              ship.alertState as keyof typeof ALERT_PRESENTATION
            ] ?? ALERT_PRESENTATION.GREEN;
          return (
            <Link
              key={ship.id}
              to={`/spacecraft/${ship.id}`}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${alert.color}`}
                title={alert.title}
              />
              <strong className="min-w-0 flex-1 truncate text-swu-text">
                <ShipName name={ship.name} />
              </strong>
              <span className="text-swu-muted">Bereit</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
