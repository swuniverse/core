import { useEffect, useState } from 'react';
import type {
  ColonySandboxMetricsDto,
  ColonySandboxPreviewDto,
} from '@swuniverse/shared';
import { api } from '../../../services/api';
import { formatNumber, formatDelta } from '../../../lib/format';

const rows: Array<{
  key: keyof ColonySandboxMetricsDto;
  label: string;
  unit?: string;
}> = [
  { key: 'energyBalance', label: 'Energiebilanz / Tick' },
  { key: 'energyProduction', label: 'Energieproduktion / Tick' },
  { key: 'energyConsumption', label: 'Energieverbrauch / Tick' },
  { key: 'energyMax', label: 'Energiekapazität' },
  { key: 'population', label: 'Bevölkerung' },
  { key: 'housing', label: 'Wohnraum gesamt' },
  { key: 'housingFree', label: 'Wohnraum frei' },
  { key: 'workers', label: 'Arbeiter' },
  { key: 'freeWorkers', label: 'Freie Arbeiter' },
  { key: 'lifeStandard', label: 'Lebensstandard' },
  { key: 'lifeStandardPercent', label: 'Lebensstandard (%)', unit: '%' },
];

export function ColonySandboxPreview({
  sandboxId,
  revision,
}: {
  sandboxId: number;
  revision: object;
}) {
  const [preview, setPreview] = useState<ColonySandboxPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError(null);
    void api
      .get<ColonySandboxPreviewDto>(`/colonies/sandboxes/${sandboxId}/preview`)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Vorschau konnte nicht geladen werden.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [sandboxId, revision, refresh]);

  const cell = 'border-b border-swu-border px-2 py-1 text-right tabular-nums';
  return (
    <section aria-label="Sandbox-Bilanz" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-swu-primary">Kolonie vs. Sandbox</h3>
        <button
          type="button"
          className="rounded border border-swu-border px-2 py-1"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Vergleich aktualisieren
        </button>
      </div>
      <p className="text-swu-muted">
        Bilanz der aktiven Gebäude pro Tick. Differenz = Sandbox minus Kolonie.
      </p>
      {error ? (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      ) : !preview ? (
        <p role="status">Vorschau wird geladen...</p>
      ) : (
        <>
          <p className="text-swu-muted">
            Quellkolonie: {preview.sourceColonyName}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Kennzahlen und Produktion im Vergleich
              </caption>
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left" scope="col">
                    Kennzahl
                  </th>
                  <th className={cell} scope="col">
                    Kolonie
                  </th>
                  <th className={cell} scope="col">
                    Sandbox
                  </th>
                  <th className={cell} scope="col">
                    Differenz
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, label, unit }) => (
                  <tr key={key}>
                    <th
                      scope="row"
                      className="border-b border-swu-border px-2 py-1 text-left font-normal"
                    >
                      {label}
                    </th>
                    <td className={cell}>
                      {formatNumber(preview.colony[key])}
                      {unit && ` ${unit}`}
                    </td>
                    <td className={cell}>
                      {formatNumber(preview.sandbox[key])}
                      {unit && ` ${unit}`}
                    </td>
                    <td className={cell}>
                      {formatDelta(preview.difference[key])}
                      {unit === '%' && ' PP'}
                    </td>
                  </tr>
                ))}
                {(['WARE', 'EFFECT', 'DEPOSIT'] as const).map((kind) => {
                  const entries = preview.production.filter(
                    (entry) => entry.kind === kind,
                  );
                  if (!entries.length) return null;
                  return entries.map((entry, index) => (
                    <tr key={entry.commodityId}>
                      <th
                        scope="row"
                        className="border-b border-swu-border px-2 py-1 text-left font-normal"
                      >
                        {index === 0 && (
                          <span className="block font-bold text-swu-muted">
                            {kind === 'WARE'
                              ? 'Waren / Tick'
                              : kind === 'EFFECT'
                                ? 'Effekte / Tick'
                                : 'Vorkommen / Tick'}
                          </span>
                        )}
                        {entry.name}
                      </th>
                      <td className={cell}>
                        {formatNumber(entry.colony)}
                      </td>
                      <td className={cell}>{formatNumber(entry.sandbox)}</td>
                      <td className={cell}>
                        {formatDelta(entry.difference)}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
