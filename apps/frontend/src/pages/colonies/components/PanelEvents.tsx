import { useState } from 'react';
import type { ColonyEventDto } from '@swuniverse/shared';

// ─── Panel: Ereignisse ───────────────────────────────────────

export function PanelEvents({
  initialEvents,
  onLoadEvents,
  onMarkRead,
  onMarkAllRead,
}: {
  initialEvents: ColonyEventDto[];
  onLoadEvents: (unreadOnly?: boolean) => Promise<ColonyEventDto[]>;
  onMarkRead: (eventId: number) => Promise<void> | void;
  onMarkAllRead: () => Promise<void> | void;
}) {
  const [events, setEvents] = useState<ColonyEventDto[]>(initialEvents);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const severityClass: Record<ColonyEventDto['severity'], string> = {
    INFO: 'text-swu-primary border-swu-border bg-swu-primary/5',
    WARNING: 'text-yellow-300 border-yellow-500/50 bg-yellow-900/20',
    CRITICAL: 'text-red-300 border-red-500/50 bg-red-900/20',
  };

  const reload = async (nextUnreadOnly = unreadOnly) => {
    setBusy('reload');
    setError(null);
    try {
      setEvents(await onLoadEvents(nextUnreadOnly));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ereignisse konnten nicht geladen werden',
      );
    } finally {
      setBusy(null);
    }
  };

  const markRead = async (eventId: number) => {
    setBusy(`read-${eventId}`);
    setError(null);
    try {
      await onMarkRead(eventId);
      await reload(unreadOnly);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ereignis konnte nicht markiert werden',
      );
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    setBusy('read-all');
    setError(null);
    try {
      await onMarkAllRead();
      await reload(unreadOnly);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ereignisse konnten nicht markiert werden',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
        <button
          onClick={() => reload(unreadOnly)}
          disabled={busy === 'reload'}
          className="px-2 py-1 rounded bg-swu-accent/20 border border-swu-accent text-swu-accent disabled:opacity-40"
        >
          Aktualisieren
        </button>
        <button
          onClick={markAll}
          disabled={busy === 'read-all'}
          className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-swu-primary disabled:opacity-40"
        >
          Alle gelesen
        </button>
        <label className="ml-auto flex items-center gap-1 text-swu-muted">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              reload(e.target.checked);
            }}
          />
          nur ungelesen
        </label>
      </div>
      <div className="bg-swu-surface border border-swu-border rounded divide-y divide-swu-border/20 text-xs">
        {events.length === 0 ? (
          <div className="px-3 py-2 text-swu-muted">Keine Ereignisse.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-3 py-2 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold mr-2 ${severityClass[event.severity]}`}
                  >
                    {event.severity}
                  </span>
                  <span className="font-bold text-swu-primary">
                    {event.title}
                  </span>
                  {!event.readAt ? (
                    <span className="ml-2 text-[9px] text-swu-accent">NEU</span>
                  ) : (
                    <span className="ml-2 text-green-400">✓</span>
                  )}
                </div>
                <span className="text-[10px] text-swu-muted whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-swu-muted">{event.message}</div>
              {!event.readAt && (
                <button
                  onClick={() => markRead(event.id)}
                  disabled={busy === `read-${event.id}`}
                  className="px-2 py-0.5 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-primary disabled:opacity-40"
                >
                  gelesen
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
