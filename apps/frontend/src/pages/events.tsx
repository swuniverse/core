import { useEffect, useMemo, useState } from 'react';
import {
  GAME_EVENT_TYPES,
  type GameEventType,
} from '@swuniverse/shared';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

const EVENT_TYPES = GAME_EVENT_TYPES;

type GameEvent = {
  id: number;
  type: GameEventType;
  text: string;
  scope: 'GALAXY' | 'SYSTEM' | null;
  layerId: number | null;
  systemId: number | null;
  x: number | null;
  y: number | null;
  locationId: number | null;
  location: {
    scope: 'GALAXY' | 'SYSTEM';
    layerId?: number;
    systemId?: number;
    x: number;
    y: number;
  } | null;
  createdAt: string;
};

type EventsResponse = {
  events: GameEvent[];
  counts: Record<GameEventType, number>;
};

const TYPE_LABELS: Record<GameEventType, string> = {
  SHIP: 'Schiffe',
  STATION: 'Station',
  COLONY: 'Kolonie',
  ALLIANCE: 'Diplomatie',
  OTHER: 'Sonstiges',
};

const LIMITS = [10, 20, 50] as const;

function selectedType(value: string | null): GameEventType | '' {
  return EVENT_TYPES.includes(value as GameEventType) ? (value as GameEventType) : '';
}

function selectedLimit(value: string | null): (typeof LIMITS)[number] {
  const limit = Number(value);
  return LIMITS.includes(limit as (typeof LIMITS)[number])
    ? (limit as (typeof LIMITS)[number])
    : 20;
}

function eventLocation(event: GameEvent) {
  const location = event.location;
  if (location) return location;
  if (
    event.scope === 'GALAXY' &&
    event.layerId != null &&
    event.x != null &&
    event.y != null
  ) {
    return {
      scope: 'GALAXY' as const,
      layerId: event.layerId,
      x: event.x,
      y: event.y,
    };
  }
  if (
    event.scope === 'SYSTEM' &&
    event.systemId != null &&
    event.x != null &&
    event.y != null
  ) {
    return {
      scope: 'SYSTEM' as const,
      systemId: event.systemId,
      x: event.x,
      y: event.y,
    };
  }
  return null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const type = selectedType(params.get('type'));
  const query = params.get('q') ?? '';
  const limit = selectedLimit(params.get('limit'));
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPath = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (type) queryParams.set('type', type);
    if (query.trim()) queryParams.set('search', query.trim());
    queryParams.set('limit', String(limit));
    const serialized = queryParams.toString();
    return serialized ? `/events/recent?${serialized}` : '/events/recent';
  }, [limit, query, type]);

  useEffect(() => {
    let active = true;
    setError(null);
    void api
      .get<EventsResponse>(requestPath)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setData(null);
          setError(
            reason instanceof Error
              ? reason.message
              : 'Die Ereignishistory konnte nicht geladen werden.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [requestPath]);

  function update(next: { type?: GameEventType | ''; q?: string; limit?: number }) {
    const values = {
      type,
      q: query,
      limit,
      ...next,
    };
    const nextParams = new URLSearchParams();
    if (values.type) nextParams.set('type', values.type);
    if (values.q.trim()) nextParams.set('q', values.q.trim());
    if (values.limit !== 20) nextParams.set('limit', String(values.limit));
    setParams(nextParams, { replace: true });
  }

  return (
    <main className="space-y-4 p-3 md:p-6">
      <header>
        <h1 className="text-lg font-bold text-swu-primary">Ereignishistory</h1>
        <p className="mt-1 text-sm text-swu-muted">
          Globale Ereignisse aus der bekannten Galaxis.
        </p>
      </header>

      <section
        aria-label="Ereignisfilter"
        className="flex flex-wrap items-end gap-3 border border-swu-border bg-swu-surface p-3"
      >
        <label className="space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide text-swu-muted">
            Ereignistyp
          </span>
          <select
            aria-label="Ereignistyp"
            value={type}
            onChange={(event) =>
              update({ type: selectedType(event.target.value) })
            }
            className="border border-swu-border bg-swu-bg px-2 py-1.5 text-swu-text"
          >
            <option value="">Alle Ereignisse</option>
            {EVENT_TYPES.map((eventType) => (
              <option key={eventType} value={eventType}>
                {TYPE_LABELS[eventType]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-52 flex-1 space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide text-swu-muted">
            Suche
          </span>
          <input
            aria-label="Suche"
            type="search"
            value={query}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Ereignistext durchsuchen"
            className="w-full border border-swu-border bg-swu-bg px-2 py-1.5 text-swu-text"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide text-swu-muted">
            Ergebnislimit
          </span>
          <select
            aria-label="Ergebnislimit"
            value={limit}
            onChange={(event) => update({ limit: Number(event.target.value) })}
            className="border border-swu-border bg-swu-bg px-2 py-1.5 text-swu-text"
          >
            {LIMITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section aria-label="Ereignistypzähler" className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((eventType) => (
          <span
            key={eventType}
            className="border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-muted"
          >
            {TYPE_LABELS[eventType]}: {data?.counts[eventType] ?? 0}
          </span>
        ))}
      </section>

      {error && (
        <p
          role="alert"
          className="border border-red-500/60 bg-red-950/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="text-sm text-swu-muted">Ereignisse werden geladen...</p>
      )}

      {data && (
        <section className="overflow-hidden border border-swu-border bg-swu-surface">
          {data.events.length === 0 ? (
            <p className="p-4 text-sm text-swu-muted">
              Keine Ereignisse entsprechen den aktuellen Filtern.
            </p>
          ) : (
            <ol className="divide-y divide-swu-border/50">
              {data.events.map((event) => {
                const location = eventLocation(event);
                return (
                  <li key={event.id} className="p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-xs font-bold text-swu-accent">
                        {TYPE_LABELS[event.type]}
                      </span>
                      <time
                        className="text-xs text-swu-muted"
                        dateTime={event.createdAt}
                      >
                        {formatDate(event.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-swu-text">{event.text}</p>
                    {location?.scope === 'GALAXY' &&
                    location.layerId != null ? (
                      <Link
                        to={`/starmap?layer=${location.layerId}&x=${location.x}&y=${location.y}`}
                        className="mt-2 inline-block text-xs text-swu-primary hover:text-swu-accent hover:underline"
                      >
                        {location.x}|{location.y}
                      </Link>
                    ) : location?.scope === 'SYSTEM' ? (
                      <span className="mt-2 inline-block text-xs text-swu-muted">
                        Systemort {location.x}|{location.y}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
