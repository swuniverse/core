import { useEffect, useState } from 'react';
import type { StationScrappingDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function StationScrappingPanel({
  stationId,
  refreshKey,
  onChanged,
  onRemoved,
}: {
  stationId: number;
  refreshKey: number;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [data, setData] = useState<StationScrappingDto | null>(null);
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setData(null);
    setCode('');
    setConfirmed(false);
    setError(null);
    void api
      .get<StationScrappingDto>(`/spacecraft/${stationId}/scrapping`)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Demontagedaten konnten nicht geladen werden',
          );
      });
    return () => {
      current = false;
    };
  }, [stationId, refreshKey]);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ removed: boolean }>(
        `/spacecraft/${stationId}/scrapping`,
        { code },
      );
      if (result.removed) onRemoved();
      else {
        setData(
          await api.get<StationScrappingDto>(
            `/spacecraft/${stationId}/scrapping`,
          ),
        );
        onChanged();
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Demontage fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-2 border border-swu-border bg-swu-surface p-2 text-xs">
      <h2 className="font-bold text-swu-primary">Station demontieren</h2>
      {data?.active ? (
        <>
          <p role="status">
            Demontage läuft · {data.remainingTicks} Ticks verbleibend
          </p>
          <p>
            {data.dockedWorkbees}/{data.requiredWorkbees} einsatzfähige Workbees
            angedockt
          </p>
          {(data.blockReason ||
            data.dockedWorkbees < data.requiredWorkbees) && (
            <p className="text-amber-300">
              Pausiert:{' '}
              {data.blockReason ?? 'Nicht genügend Workbees angedockt.'}
            </p>
          )}
        </>
      ) : (
        data && (
          <>
            <p>
              {data.immediate
                ? 'Das Konstrukt wird sofort entfernt.'
                : `Dauer: ${data.remainingTicks} Ticks · ${data.requiredWorkbees} einsatzfähige angedockte Workbees erforderlich.`}
            </p>
            <p>
              Die Demontage kann nicht abgebrochen werden. Stationslager und
              nicht zurückgegebene Module gehen verloren; alle angedockten
              Schiffe werden beim Entfernen abgedockt.
            </p>
            {!data.immediate && (
              <p>
                Recycelte Module gehen innerhalb der Lagergrenze an ein eigenes
                angedocktes Schiff. Ohne ein solches Schiff gibt es keine
                Rückgabe.
              </p>
            )}
            {data.blockReason && (
              <p className="text-amber-300">{data.blockReason}</p>
            )}
            <label className="my-2 block">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />{' '}
              Folgen verstanden
            </label>
            <p>
              Bestätigungscode: <strong>{data.confirmationCode}</strong>
            </p>
            <label className="block">
              Bestätigungscode eingeben
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="ml-2 border border-swu-border bg-swu-bg px-1"
              />
            </label>
            <button
              type="button"
              className="mt-2 rounded border border-red-500 px-2 py-1 disabled:opacity-40"
              disabled={
                pending ||
                !confirmed ||
                code.trim() !== data.confirmationCode ||
                !!data.blockReason
              }
              onClick={() => void start()}
            >
              {pending
                ? 'Demontage wird gestartet…'
                : data.immediate
                  ? 'Konstrukt entfernen'
                  : 'Demontage starten'}
            </button>
          </>
        )
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
