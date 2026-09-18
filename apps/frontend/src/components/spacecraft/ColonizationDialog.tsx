import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Check = {
  canColonize: boolean;
  reasons: string[];
  target: { reclaimed?: boolean } | null;
  surface: {
    width: number;
    fields: Array<{
      fieldIndex: number;
      fieldType: number;
      terrainTileId: number | null;
      layer: string | null;
      selectable: boolean;
    }>;
  } | null;
};

export function ColonizationDialog({
  shipId,
  celestialObjectId,
  planetName,
  isRuins,
  onClose,
  onColonized,
}: {
  shipId: number;
  celestialObjectId: number;
  planetName: string | null;
  isRuins: boolean;
  onClose: () => void;
  onColonized: (colonyId: number) => void;
}) {
  const [check, setCheck] = useState<Check | null>(null);
  const [fieldIndex, setFieldIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get<Check>(`/colonization/targets/${celestialObjectId}?shipId=${shipId}`)
      .then(setCheck)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Kolonisierungsprüfung fehlgeschlagen',
        ),
      );
  }, [celestialObjectId, shipId]);

  const canSubmit = check?.canColonize && (isRuins || fieldIndex != null);
  async function colonize() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ colonyId: number }>(
        `/spacecraft/${shipId}/colonize`,
        {
          celestialObjectId,
          ...(fieldIndex != null ? { initialFieldIndex: fieldIndex } : {}),
        },
      );
      onColonized(result.colonyId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Kolonisierung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRuins ? 'Ruinen übernehmen' : 'Kolonie gründen'}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-lg border border-swu-border bg-swu-bg text-xs">
        <header className="flex justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">
            {isRuins ? 'Ruinenkolonie übernehmen' : 'Kolonie gründen'}
          </h3>
          <button type="button" onClick={onClose} disabled={pending}>
            Schließen
          </button>
        </header>
        <div className="space-y-3 p-3">
          <p className="text-swu-primary">
            {planetName ?? 'Unbenannter Himmelskörper'}
          </p>
          <p className="text-swu-muted">
            {isRuins
              ? 'Bestehende Gebäude und Lager werden übernommen. Das Kolonieschiff wird verbraucht.'
              : 'Wähle das Feld für das Startgebäude. Das Kolonieschiff wird verbraucht.'}
          </p>
          {check?.reasons.length ? (
            <ul className="list-disc pl-4 text-red-300">
              {check.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {!isRuins && check?.surface && (
            <div
              className="grid gap-px bg-swu-border"
              style={{
                gridTemplateColumns: `repeat(${check.surface.width}, minmax(0, 1fr))`,
              }}
            >
              {check.surface.fields.map((field) => (
                <button
                  key={field.fieldIndex}
                  type="button"
                  disabled={!field.selectable}
                  onClick={() => setFieldIndex(field.fieldIndex)}
                  className={`aspect-square border text-[9px] ${field.selectable ? 'bg-swu-surface hover:border-swu-accent' : 'bg-black/40 opacity-50'} ${fieldIndex === field.fieldIndex ? 'ring-2 ring-swu-accent' : ''}`}
                  title={`Feld ${field.fieldIndex}`}
                >
                  {field.selectable ? field.fieldIndex : ''}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!canSubmit || pending}
            onClick={() => void colonize()}
            className="border border-swu-accent px-3 py-1 text-swu-primary disabled:opacity-40"
          >
            {pending
              ? 'Gründe…'
              : isRuins
                ? 'Ruinen übernehmen'
                : 'Kolonie gründen'}
          </button>
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
