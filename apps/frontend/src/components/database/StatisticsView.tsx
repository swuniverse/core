import { useEffect, useState } from 'react';
import type {
  StatisticDto,
  StatisticUnit,
  StatisticsResponseDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { StackedAreaChart } from './StackedAreaChart';

const UNITS: Array<{ unit: StatisticUnit; label: string }> = [
  { unit: 'tick', label: 'Tick' },
  { unit: 'daily', label: 'Täglich' },
  { unit: 'weekly', label: 'Wöchentlich' },
  { unit: 'monthly', label: 'Monatlich' },
];

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

const FORMATS: Record<
  StatisticUnit,
  { tick: (iso: string) => string; tooltip: (iso: string) => string }
> = {
  tick: {
    tick: (iso) => `${date(iso)} ${time(iso)}`,
    tooltip: (iso) => `${date(iso)} ${time(iso)}`,
  },
  daily: { tick: date, tooltip: date },
  weekly: { tick: date, tooltip: (iso) => `Woche ab ${date(iso)}` },
  monthly: {
    tick: (iso) =>
      new Date(iso).toLocaleDateString('de-DE', {
        month: '2-digit',
        year: '2-digit',
      }),
    tooltip: (iso) =>
      new Date(iso).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      }),
  },
};

export function StatisticsView() {
  const [unit, setUnit] = useState<StatisticUnit>('tick');
  const [metrics, setMetrics] = useState<StatisticDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMetrics(null);
    setError(null);
    api
      .get<StatisticsResponseDto>(`/database/statistics?unit=${unit}`)
      .then((data) => setMetrics(data.metrics))
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Statistiken konnten nicht geladen werden',
        ),
      );
  }, [unit]);

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Zeiteinheit"
      >
        {UNITS.map((entry) => (
          <button
            key={entry.unit}
            type="button"
            aria-pressed={unit === entry.unit}
            onClick={() => setUnit(entry.unit)}
            className={`border px-3 py-1 text-sm ${
              unit === entry.unit
                ? 'border-swu-accent bg-swu-primary/20 text-swu-accent'
                : 'border-swu-border text-swu-text hover:bg-swu-primary/10'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : !metrics ? (
        <p className="text-swu-muted">Statistiken werden geladen...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {metrics.map((metric) => (
            <section
              key={metric.key}
              className="border border-swu-border bg-black/30 p-3"
            >
              <h2 className="mb-2 font-bold text-swu-primary">
                {metric.title}
              </h2>
              {metric.points.length < 2 ? (
                <p className="text-sm text-swu-muted">
                  Noch nicht genug Messpunkte. Die Statistik füllt sich mit
                  jedem Haupttick.
                </p>
              ) : (
                <StackedAreaChart
                  title={metric.title}
                  series={metric.series}
                  points={metric.points}
                  formatTick={FORMATS[unit].tick}
                  formatTooltip={FORMATS[unit].tooltip}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
