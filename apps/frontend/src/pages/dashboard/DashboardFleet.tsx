import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

export function DashboardFleet({ data }: { data: DashboardData }) {
  const ships = [...data.allShips].sort((a, b) => Number(a.alertState === 'RED') - Number(b.alertState === 'RED')).reverse().slice(0, 6);
  return <section className="border border-swu-border bg-swu-surface/70"><header className="flex justify-between border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary"><span>Deine Flotte · {data.fleetTotal}</span><Link to="/spacecraft" className="text-swu-muted">Alle →</Link></header><div className="divide-y divide-swu-border/60">{ships.map((ship) => <Link key={ship.id} to={`/spacecraft/${ship.id}`} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"><span>{ship.alertState === 'RED' ? '🔴' : ship.alertState === 'YELLOW' ? '🟡' : '🟢'}</span><strong className="min-w-0 flex-1 truncate text-swu-text">{ship.name}</strong><span className="text-swu-muted">{ship.status === 'IN_FLIGHT' ? 'Im Flug' : 'Bereit'}</span></Link>)}</div></section>;
}
