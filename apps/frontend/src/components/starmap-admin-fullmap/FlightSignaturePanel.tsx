import { useEffect, useState } from 'react';
import type {
  AdminFlightSignatureFieldDto,
  AdminFlightSignatureFilter,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useAdminSignatureStore } from '../../stores/admin-signature.store';

const FILTERS: Array<[AdminFlightSignatureFilter, string]> = [
  ['ALL', 'Alle Signaturen'],
  ['SPACECRAFT', 'Schiff'],
  ['USER', 'Spieler'],
  ['ALLIANCE', 'Allianz'],
];

export function FlightSignaturePanel() {
  const isAdmin = useAuthStore((state) => state.user?.isAdmin === true);
  const {
    enabled,
    filter,
    targetId,
    viewport,
    setEnabled,
    setFilter,
    setTargetId,
    setFields,
  } = useAdminSignatureStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const validTarget =
    filter === 'ALL' ||
    (Number.isSafeInteger(Number(targetId)) &&
      Number(targetId) > 0 &&
      Number(targetId) <= 2147483647);

  useEffect(() => {
    let current = true;
    setFields([]);
    setError(null);
    setLoading(false);
    if (!isAdmin || !enabled || !viewport || !validTarget) return;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        xStart: String(viewport.xStart),
        xEnd: String(viewport.xEnd),
        yStart: String(viewport.yStart),
        yEnd: String(viewport.yEnd),
        filter,
      });
      if (filter !== 'ALL') params.set('targetId', targetId);
      void api
        .get<AdminFlightSignatureFieldDto[]>(
          `/starmap/admin/layers/${viewport.layerId}/flight-signatures?${params}`,
        )
        .then((fields) => {
          if (current) setFields(fields);
        })
        .catch((err: unknown) => {
          if (current)
            setError(
              err instanceof Error
                ? err.message
                : 'Flugsignaturen konnten nicht geladen werden',
            );
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [
    isAdmin,
    enabled,
    filter,
    targetId,
    viewport,
    validTarget,
    refresh,
    setFields,
  ]);

  if (!isAdmin) return null;
  return (
    <section className="border-b border-swu-border pb-3 text-xs">
      <label className="flex items-center gap-2 font-bold text-swu-primary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Flugsignaturen
      </label>
      {enabled && (
        <div className="mt-2 space-y-2">
          <label className="block">
            Signaturfilter
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as AdminFlightSignatureFilter)
              }
              className="mt-1 w-full border border-swu-border bg-swu-bg p-1 text-swu-primary"
            >
              {FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {filter !== 'ALL' && (
            <label className="block">
              {filter === 'SPACECRAFT'
                ? 'Schiffs-ID'
                : filter === 'USER'
                  ? 'Spieler-ID'
                  : 'Allianz-ID'}
              <input
                type="number"
                min={1}
                max={2147483647}
                step={1}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="mt-1 w-full border border-swu-border bg-swu-bg p-1 text-swu-primary"
              />
            </label>
          )}
          <p className="text-swu-muted">
            Spuren der letzten 48 Stunden im sichtbaren Ausschnitt; Linienstärke
            zeigt die Anzahl unterschiedlicher Schiffe.
          </p>
          {!validTarget && <p>Bitte eine gültige ID eingeben.</p>}
          {loading && <p role="status">Signaturen werden geladen…</p>}
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={loading || !validTarget || !viewport}
            onClick={() => setRefresh((version) => version + 1)}
            className="border border-swu-border px-2 py-1 disabled:opacity-40"
          >
            Signaturen aktualisieren
          </button>
        </div>
      )}
    </section>
  );
}
