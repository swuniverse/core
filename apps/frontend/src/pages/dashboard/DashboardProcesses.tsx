import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

export function DashboardProcesses({ data }: { data: DashboardData }) {
  return <section className="border border-swu-border bg-swu-surface/70"><header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">Aktive Prozesse</header>{data.processes.length ? <div className="divide-y divide-swu-border/60">{data.processes.map((process) => <Link key={process.id} to={process.linkTo} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-white/5"><span className="w-24 text-swu-muted">{process.kind}</span><strong className="min-w-0 flex-1 truncate text-swu-text">{process.label}</strong><span className="text-swu-muted">{process.detail}</span>{process.progress != null && <span className="font-mono text-swu-accent">{process.progress}%</span>}</Link>)}</div> : <p className="px-3 py-3 text-xs text-swu-muted">Keine aktiven Prozesse.</p>}</section>;
}
