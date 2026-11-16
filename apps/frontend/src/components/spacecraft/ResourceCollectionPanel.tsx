import { useEffect, useState } from 'react';
import type { ResourceCollectionDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function ResourceCollectionPanel({
  shipId,
  onUpdate,
  refreshKey,
}: {
  shipId: number;
  onUpdate: () => void;
  refreshKey: string;
}) {
  const [data, setData] = useState<ResourceCollectionDto | null>(null);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void api
      .get<ResourceCollectionDto>(`/spacecraft/${shipId}/resource-collection`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setChoice(
          String(
            result.selectedCommodityId ?? result.options[0]?.commodityId ?? '',
          ),
        );
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Sammeldaten konnten nicht geladen werden',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [shipId, refreshKey]);
  async function save(stop = false) {
    setPending(true);
    setError(null);
    try {
      const path = `/spacecraft/${shipId}/resource-collection`;
      const result = stop
        ? await api.delete<ResourceCollectionDto>(path)
        : await api.post<ResourceCollectionDto>(path, {
            commodityId: Number(choice),
          });
      setData(result);
      onUpdate();
    } catch (failure: unknown) {
      setError(
        failure instanceof Error ? failure.message : 'Sammeln fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="border-b border-swu-border p-2 text-xs" open>
      <summary className="font-bold text-swu-primary">
        Ressourcen-Kollektor
      </summary>
      <p className="my-1">15 EPS zum Einschalten · 10 EPS je aktivem Tick</p>
      {data && (
        <>
          <p role="status">
            {data.state === 'GATHER_RESOURCES'
              ? `Sammelt ${data.options.find((option) => option.commodityId === data.selectedCommodityId)?.name ?? 'Ressourcen'}`
              : 'Sammeln inaktiv'}{' '}
            · {data.freeCargo} Lager frei
          </p>
          <label>
            Ressource{' '}
            <select
              className="my-1 rounded bg-swu-bg p-1"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
              disabled={pending}
            >
              {data.options.map((option) => (
                <option key={option.commodityId} value={option.commodityId}>
                  {option.name} · {option.rate} je Tick
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
              disabled={pending || !!data.blockReason || !choice}
              onClick={() => void save()}
            >
              Sammeln
            </button>
            {data.selectedCommodityId != null && (
              <button
                type="button"
                className="rounded border border-swu-border px-2 py-1"
                disabled={pending}
                onClick={() => void save(true)}
              >
                Sammeln beenden
              </button>
            )}
          </div>
          {data.blockReason && (
            <p className="mt-1 text-swu-muted">{data.blockReason}</p>
          )}
          <p className="mt-1 text-swu-muted">
            Förderung im Tick bis das Lager voll ist. Bewegung beendet das
            Sammeln.
          </p>
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
