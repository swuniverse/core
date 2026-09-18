import type { DashboardData } from '../types';

const ICON: Record<string, string> = {
  SPACECRAFT_DESTROYED: '✹',
  HYPERSPACE_INTERCEPTED: '◉',
  SYSTEM_ENTERED: '✦',
};

export function WidgetRecentEvents({ data }: { data: DashboardData }) {
  const events = data.recentEvents.slice(0, 20);
  return (
    <div className="flex h-full flex-col border border-swu-border bg-swu-surface">
      <div className="border-b border-swu-border/50 px-3 py-1.5 text-xs font-bold text-swu-muted">
        Letzte Ereignisse
      </div>
      {events.length === 0 ? (
        <p className="px-3 py-2 text-[10px] text-swu-muted">Keine</p>
      ) : (
        <div className="divide-y divide-swu-border/30 overflow-auto">
          {events.map((event) => (
            <div key={event.id} className="flex gap-2 px-3 py-1.5 text-xs">
              <span className="text-swu-accent">{ICON[event.type] ?? '•'}</span>
              <span className="min-w-0 flex-1">{event.text}</span>
              <time className="shrink-0 font-mono text-[10px] text-swu-muted">
                {new Date(event.createdAt).toLocaleString('de-DE')}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
