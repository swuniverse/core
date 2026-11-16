import { useEffect, useState } from 'react';
import type { ResourceConversionDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function ResourceConversionPanel({
  shipId,
  onUpdate,
  refreshKey,
}: {
  shipId: number;
  onUpdate: () => void;
  refreshKey: string;
}) {
  const [data, setData] = useState<ResourceConversionDto | null>(null);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void api
      .get<ResourceConversionDto>(`/spacecraft/${shipId}/resource-conversion`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setChoice(
          String(
            result.selectedCommodityId ??
              result.options.find((option) => option.producible)
                ?.sourceCommodityId ??
              '',
          ),
        );
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Umwandlungsdaten konnten nicht geladen werden',
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
      const path = `/spacecraft/${shipId}/resource-conversion`;
      const result = stop
        ? await api.delete<ResourceConversionDto>(path)
        : await api.post<ResourceConversionDto>(path, {
            commodityId: Number(choice),
          });
      setData(result);
      onUpdate();
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Umwandlung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="border-b border-swu-border p-2 text-xs" open>
      <summary className="font-bold text-swu-primary">
        Molekular-Raffinerie
      </summary>
      <p className="my-1">15 EPS zum Einschalten · 10 EPS je aktivem Tick</p>
      {data && (
        <>
          <p role="status">
            {data.active
              ? `Umwandlung aktiv: ${data.options.find((option) => option.sourceCommodityId === data.selectedCommodityId)?.targetName ?? 'Zielware'}`
              : 'Umwandlung inaktiv'}
          </p>
          <label>
            Umwandlung{' '}
            <select
              className="my-1 rounded bg-swu-bg p-1"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
              disabled={pending}
            >
              {(['COMPRESSOR', 'SUBLIMATOR'] as const).map((mode) => (
                <optgroup
                  key={mode}
                  label={
                    mode === 'COMPRESSOR' ? 'Partikelkompressor' : 'Sublimator'
                  }
                >
                  {data.options
                    .filter((option) => option.mode === mode)
                    .map((option) => (
                      <option
                        key={option.sourceCommodityId}
                        value={option.sourceCommodityId}
                        disabled={!option.producible}
                      >
                        {option.inputAmount} {option.sourceName} →{' '}
                        {option.outputAmount} {option.targetName}
                        {!option.producible ? ' (Forschung fehlt)' : ''}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
              disabled={
                pending ||
                !!data.blockReason ||
                !data.options.some(
                  (option) =>
                    String(option.sourceCommodityId) === choice &&
                    option.producible,
                )
              }
              onClick={() => void save()}
            >
              Umwandeln
            </button>
            {data.selectedCommodityId != null && (
              <button
                type="button"
                className="rounded border border-swu-border px-2 py-1"
                disabled={pending}
                onClick={() => void save(true)}
              >
                Umwandlung beenden
              </button>
            )}
          </div>
          {data.blockReason && (
            <p className="mt-1 text-swu-muted">{data.blockReason}</p>
          )}
          <p className="mt-1 text-swu-muted">
            Eine vollständige Charge je Tick. Die Zielware muss durch die
            Forschung eines Produktionsgebäudes freigeschaltet sein.
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
