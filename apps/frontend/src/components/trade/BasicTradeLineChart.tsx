import { useState } from 'react';
import type { BasicTradeChartDto } from '@swuniverse/shared';
import { formatDateTime, formatNumber } from '../../lib/format';

const WIDTH = 320;
const HEIGHT = 120;
const PAD = { top: 8, right: 8, bottom: 16, left: 52 };

/** Single-series rate line of one network and commodity; the title names the series. */
export function BasicTradeLineChart({ chart, title }: { chart: BasicTradeChartDto; title: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = chart.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (chart.points.length > 1 ? (index / (chart.points.length - 1)) * innerWidth : innerWidth / 2);
  const y = (value: number) => PAD.top + innerHeight - ((value - min) / span) * innerHeight;
  const point = hovered == null ? null : chart.points[hovered];

  return (
    <figure className="border border-swu-border bg-black/30 p-2">
      <figcaption className="mb-1 flex justify-between text-swu-primary">
        <span>{title}</span>
        <span className="text-swu-muted">{chart.totalTradeCount} Kurse</span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${title}: letzter Kurswert ${formatNumber(values.at(-1) ?? 0)}`}
          onMouseLeave={() => setHovered(null)}
        >
          {[max, min].map((value) => (
            <g key={value}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} stroke="var(--color-swu-border)" strokeWidth={1} />
              <text x={PAD.left - 4} y={y(value) + 3} textAnchor="end" fontSize={9} fill="var(--color-swu-muted)">
                {formatNumber(value)}
              </text>
            </g>
          ))}
          <polyline
            points={chart.points.map((entry, index) => `${x(index)},${y(entry.value)}`).join(' ')}
            fill="none"
            stroke="var(--color-swu-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {point && hovered != null && (
            <>
              <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={PAD.top + innerHeight} stroke="var(--color-swu-text)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(hovered)} cy={y(point.value)} r={4} fill="var(--color-swu-accent)" stroke="var(--color-swu-bg)" strokeWidth={2} />
            </>
          )}
          {chart.points.map((entry, index) => (
            <rect
              key={`${entry.dateMs}-${index}`}
              data-testid="chart-hit"
              x={x(index) - innerWidth / Math.max(1, chart.points.length - 1) / 2}
              y={PAD.top}
              width={innerWidth / Math.max(1, chart.points.length - 1)}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
          ))}
        </svg>
        {point && (
          <div role="tooltip" className="pointer-events-none absolute right-1 top-1 border border-swu-border bg-swu-bg px-1 text-[10px]">
            {formatNumber(point.value)} · {formatDateTime(new Date(point.dateMs).toISOString())}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {chart.points.map((entry, index) => (
            <tr key={`${entry.dateMs}-${index}`}>
              <td>{formatDateTime(new Date(entry.dateMs).toISOString())}</td>
              <td>{entry.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
