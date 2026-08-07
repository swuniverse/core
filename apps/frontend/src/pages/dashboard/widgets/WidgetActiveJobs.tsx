import { Link } from 'react-router-dom';
import { SegmentedBar } from './shared';
import type { DashboardData } from '../types';

const TICK_DURATION_MINUTES = 15;

function ticksToHuman(ticks: number): string {
  const totalMinutes = ticks * TICK_DURATION_MINUTES;
  if (totalMinutes < 60) return `~${totalMinutes}min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

export function WidgetActiveJobs({ data }: { data: DashboardData }) {
  const hasContent =
    data.activeResearch ||
    data.queuedResearch ||
    data.buildJobs.length > 0 ||
    data.shipsInFlight.length > 0;

  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Laufende Aufträge
        </span>
      </div>
      {!hasContent ? (
        <div className="px-3 py-2 text-[10px] text-swu-muted">
          Keine laufenden Aufträge.
        </div>
      ) : (
        <div className="divide-y divide-swu-border/20 overflow-auto flex-1">
          {data.activeResearch && (
            <div className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap">
              <span className="text-swu-success">◆</span>
              <span className="text-swu-muted shrink-0">Forschung:</span>
              <span className="text-swu-primary font-bold truncate">
                {data.activeResearch.name}
              </span>
              <SegmentedBar
                value={data.activeResearch.progress}
                max={data.activeResearch.pointsRequired}
                color="bg-swu-success"
                label={`Forschung ${data.activeResearch.name}`}
              />
              <span className="text-[10px] font-mono text-swu-muted shrink-0">
                {data.activeResearch.progress}/{data.activeResearch.pointsRequired}
              </span>
              {data.activeResearch.ticksRemaining != null && (
                <span className="text-[10px] text-swu-muted shrink-0">
                  {ticksToHuman(data.activeResearch.ticksRemaining)}
                </span>
              )}
              {data.activeResearch.blockedReason && (
                <span className="text-[10px] text-red-400 font-bold shrink-0">
                  Blockiert
                </span>
              )}
            </div>
          )}
          {data.queuedResearch && (
            <div className="pl-7 pr-3 py-1 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap">
              <span className="text-swu-accent">◇</span>
              <span className="text-swu-muted shrink-0 text-[10px]">Warteschlange:</span>
              <span className="text-swu-primary truncate">{data.queuedResearch.name}</span>
              <span className="text-[10px] font-mono text-swu-muted shrink-0">
                {data.queuedResearch.pointsRequired}{' '}
                {data.queuedResearch.commodity?.name ?? 'FP'}
              </span>
            </div>
          )}
          {data.buildJobs.map((job) => (
            <div
              key={`${job.colonyName}-${job.fieldIndex}-${job.buildingId}`}
              className="px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs md:flex-nowrap"
            >
              <span className="text-swu-warning">▲</span>
              <span className="text-swu-muted shrink-0">Bau:</span>
              <span className="text-swu-primary font-bold truncate">{job.buildingName}</span>
              <span className="text-[10px] text-swu-muted shrink-0">
                ({job.colonyName}, Feld {job.fieldIndex})
              </span>
              <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                {job.finishesAt
                  ? new Date(job.finishesAt).toLocaleString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : 'bald'}
              </span>
            </div>
          ))}
          {data.shipsInFlight.map((ship) => (
            <Link
              key={ship.id}
              to={`/spacecraft/${ship.id}`}
              className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-swu-accent/5 transition-colors"
            >
              <span className="text-swu-primary">🚀</span>
              <span className="text-swu-muted shrink-0">Flug:</span>
              <span className="text-swu-primary font-bold truncate">{ship.name}</span>
              <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                {ship.arrivalAt
                  ? `Ankunft ${new Date(ship.arrivalAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`
                  : 'unterwegs'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
