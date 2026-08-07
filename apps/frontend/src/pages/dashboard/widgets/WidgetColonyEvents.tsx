import type { DashboardData } from '../types';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',
  WARNING: 'text-swu-warning',
  INFO: 'text-swu-muted',
};

const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: '🔴',
  WARNING: '🟡',
  INFO: '⚪',
};

export function WidgetColonyEvents({ data }: { data: DashboardData }) {
  const events = data.colonyEvents.slice(0, 20);
  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Kolonie-Ereignisse
        </span>
      </div>
      {events.length === 0 ? (
        <div className="px-3 py-2 text-[10px] text-swu-muted">Keine Ereignisse.</div>
      ) : (
        <div className="divide-y divide-swu-border/20 overflow-auto flex-1">
          {events.map((e) => (
            <div key={e.id} className="px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span>{SEVERITY_ICON[e.severity] ?? '⚪'}</span>
                <span className={`font-bold ${SEVERITY_COLOR[e.severity] ?? 'text-swu-muted'}`}>
                  {e.title}
                </span>
                {e.colonyName && (
                  <span className="text-[10px] text-swu-muted ml-auto shrink-0">
                    {e.colonyName}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-swu-muted pl-5">{e.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
