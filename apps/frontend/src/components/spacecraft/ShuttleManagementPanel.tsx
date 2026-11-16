import { useEffect, useState } from 'react';
import type { ShuttleManagementDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function ShuttleManagementPanel({
  shipId,
  refreshKey,
  onUpdate,
  onLanded,
}: {
  shipId: number;
  refreshKey: string;
  onUpdate: () => void;
  onLanded?: () => void;
}) {
  const [data, setData] = useState<ShuttleManagementDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void api
      .get<ShuttleManagementDto>(`/spacecraft/${shipId}/shuttles`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setError(
            error instanceof Error
              ? error.message
              : 'Shuttle-Daten konnten nicht geladen werden',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [shipId, refreshKey]);
  async function act(action: 'launch' | 'store' | 'land', body: object) {
    setPending(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/shuttles/${action}`, body);
      if (action === 'land') {
        onLanded?.();
        return;
      }
      setData(
        await api.get<ShuttleManagementDto>(`/spacecraft/${shipId}/shuttles`),
      );
      onUpdate();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'Shuttle-Aktion fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details open className="border-b border-swu-border p-2 text-xs">
      <summary className="font-bold text-swu-primary">
        Shuttle-Management
      </summary>
      {data && (
        <>
          {data.capacity > 0 && (
            <p className="my-1">
              {data.storedCount} / {data.capacity} Shuttleplätze belegt ·
              Shuttlerampe ohne laufenden EPS-Verbrauch
            </p>
          )}
          {data.blockReason && (data.capacity > 0 || !data.isShuttle) && (
            <p className="text-swu-muted">{data.blockReason}</p>
          )}
          {(data.stored ?? []).map((item) => (
            <div key={item.commodityId} className="my-2">
              <p>
                {item.amount} × {item.name} · {item.energyCost} EPS ·{' '}
                {item.crewRequired} freie Crew
              </p>
              <button
                type="button"
                className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
                disabled={pending || !!item.blockReason}
                onClick={() =>
                  void act('launch', { commodityId: item.commodityId })
                }
              >
                {item.name} starten
              </button>
              {item.blockReason && (
                <p className="text-swu-muted">{item.blockReason}</p>
              )}
            </div>
          ))}
          {data.capacity > 0 && !data.stored?.length && (
            <p className="my-1 text-swu-muted">Keine Shuttles im Lager.</p>
          )}
          {(data.nearby ?? []).map((item) => (
            <div key={item.id} className="my-2">
              <button
                type="button"
                className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
                disabled={pending || !!item.blockReason}
                onClick={() => void act('store', { targetId: item.id })}
              >
                {item.name} aufnehmen
              </button>
              {item.blockReason && (
                <p className="text-swu-muted">{item.blockReason}</p>
              )}
            </div>
          ))}
          {data.isShuttle && (
            <>
              <p className="my-1">
                Landung bringt Rumpf, Fracht und Crew in die Kolonie zurück.
              </p>
              {(data.colonies ?? []).map((item) => (
                <div key={item.id} className="my-2">
                  <button
                    type="button"
                    className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
                    disabled={pending || !!item.blockReason}
                    onClick={() => void act('land', { colonyId: item.id })}
                  >
                    Auf {item.name} landen
                  </button>
                  {item.blockReason && (
                    <p className="text-swu-muted">{item.blockReason}</p>
                  )}
                </div>
              ))}
              {!data.colonies?.length && (
                <p className="text-swu-muted">
                  Keine eigene Kolonie am aktuellen Feld.
                </p>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </details>
  );
}
