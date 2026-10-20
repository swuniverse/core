import { useEffect, useRef, useState } from 'react';
import type { StatisticPointDto, StatisticSeriesDto } from '@swuniverse/shared';

// Farben aus den Design-Tokens, in Stapelreihenfolge.
const SERIES_COLORS = [
  'var(--color-swu-primary)',
  'var(--color-swu-accent)',
  'var(--color-swu-success)',
  'var(--color-swu-warning)',
  'var(--color-swu-orbit)',
  'var(--color-swu-danger)',
];

const DEFAULT_WIDTH = 640;
const MIN_WIDTH = 240;
const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const Y_TICKS = 4;
const TICK_FONT_SIZE = 11;
// Grobe Zeichenbreite der Achsenschrift und Mindestabstand zwischen Labels.
const CHAR_WIDTH = 6.2;
const LABEL_GAP = 16;

export type ChartTimeFormat = (iso: string) => string;

const colorOf = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

/** Rundet das Maximum auf einen gut lesbaren Achsenendwert. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => value <= m * magnitude)!;
  return step * magnitude;
}

/** Gleichmäßig verteilte y-Achsenwerte von 0 bis `max`. */
export function yAxisTicks(max: number): number[] {
  return Array.from({ length: Y_TICKS + 1 }, (_, i) => (max / Y_TICKS) * i);
}

/**
 * Indizes der x-Achsenlabels: so viele gleichmäßig verteilte, wie bei
 * `labelWidth` pro Label ohne Überlappung in `plotWidth` passen.
 */
export function xAxisTickIndexes(
  pointCount: number,
  labelWidth: number,
  plotWidth: number,
): number[] {
  const count = Math.max(
    1,
    Math.min(pointCount, Math.floor(plotWidth / (labelWidth + LABEL_GAP)) + 1),
  );
  return [
    ...new Set(
      Array.from({ length: count }, (_, i) =>
        count === 1 ? 0 : Math.round((i / (count - 1)) * (pointCount - 1)),
      ),
    ),
  ];
}

/**
 * Gestapeltes Flächendiagramm als schlankes SVG ohne Chart-Bibliothek.
 * Eine einzelne Serie wird als einfache Fläche gezeichnet.
 */
export function StackedAreaChart({
  title,
  series,
  points,
  formatTick,
  formatTooltip,
}: {
  title: string;
  series: StatisticSeriesDto[];
  points: StatisticPointDto[];
  formatTick: ChartTimeFormat;
  formatTooltip: ChartTimeFormat;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const container = useRef<HTMLDivElement>(null);

  // Das Diagramm nutzt die echte Containerbreite als viewBox, damit
  // Schrift und Linien auf schmalen Bildschirmen nicht mitskaliert werden.
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(Math.max(MIN_WIDTH, next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const PLOT_W = width - PAD.left - PAD.right;

  const totals = points.map((point) =>
    series.reduce((sum, s) => sum + (point.values[s.key] ?? 0), 0),
  );
  const max = niceMax(Math.max(...totals, 0));
  const x = (i: number) =>
    PAD.left + (points.length > 1 ? (i / (points.length - 1)) * PLOT_W : 0);
  const y = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;

  // lower[s][i] / upper[s][i]: untere und obere Kante der Serie s am Punkt i.
  const upper = series.map((_, s) =>
    points.map((point) =>
      series
        .slice(0, s + 1)
        .reduce((sum, entry) => sum + (point.values[entry.key] ?? 0), 0),
    ),
  );
  const areaPath = (s: number) => {
    const top = points.map((_, i) => `${x(i)},${y(upper[s][i])}`);
    const bottom = points
      .map((_, i) => `${x(i)},${y(s === 0 ? 0 : upper[s - 1][i])}`)
      .reverse();
    return `M${[...top, ...bottom].join('L')}Z`;
  };

  const yTicks = yAxisTicks(max);
  const labelWidth =
    Math.max(...points.map((p) => formatTick(p.t).length), 0) * CHAR_WIDTH;
  const xTickIndexes = xAxisTickIndexes(points.length, labelWidth, PLOT_W);
  const colWidth = points.length > 1 ? PLOT_W / (points.length - 1) : PLOT_W;
  const hovered = hover == null ? null : points[hover];

  return (
    <div className="space-y-2">
      <div ref={container} className="relative">
        <svg
          role="img"
          aria-label={title}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="h-auto w-full"
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-swu-border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(tick) + 4}
                textAnchor="end"
                fontSize={TICK_FONT_SIZE}
                fill="var(--color-swu-muted)"
              >
                {Math.round(tick * 10) / 10}
              </text>
            </g>
          ))}
          {xTickIndexes.map((i) => (
            <text
              key={i}
              data-axis="x"
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={
                i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
              }
              fontSize={TICK_FONT_SIZE}
              fill="var(--color-swu-muted)"
            >
              {formatTick(points[i].t)}
            </text>
          ))}
          {series.map((s, index) => (
            <path
              key={s.key}
              data-series={s.key}
              d={areaPath(index)}
              fill={colorOf(index)}
              fillOpacity={0.7}
              stroke={colorOf(index)}
              strokeWidth={1}
            />
          ))}
          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--color-swu-text)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {points.map((point, i) => (
            <rect
              key={point.t}
              data-testid="chart-hover"
              x={x(i) - colWidth / 2}
              y={PAD.top}
              width={colWidth}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hovered && hover != null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-2 border border-swu-border bg-swu-bg/95 px-2 py-1 text-xs text-swu-text"
            style={
              hover > points.length / 2
                ? { right: `${100 - (x(hover) / width) * 100 + 2}%` }
                : { left: `${(x(hover) / width) * 100 + 2}%` }
            }
          >
            <p className="mb-1 font-mono text-swu-muted">
              {formatTooltip(hovered.t)}
            </p>
            {series.map((s, index) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-2"
                  style={{
                    background: colorOf(index),
                  }}
                />
                <span>{s.label}</span>
                <span className="ml-auto pl-3 font-mono">
                  {hovered.values[s.key] ?? 0}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-swu-muted">
        {series.map((s, index) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2.5"
              style={{ background: colorOf(index) }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
