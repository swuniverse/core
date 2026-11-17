import type { ComponentPropsWithoutRef } from 'react';

const numberFormatter = new Intl.NumberFormat('de-DE');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDelta(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}

export function Delta({ value, className = '', ...props }: { value: number } & ComponentPropsWithoutRef<'span'>) {
  const colorClass = value > 0
    ? 'text-swu-positive'
    : value < 0
      ? 'text-swu-negative'
      : '';

  return (
    <span className={[colorClass, className].filter(Boolean).join(' ')} {...props}>
      {formatDelta(value)}
    </span>
  );
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('de-DE');
}

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** German date and time (dd.mm.yyyy, hh:mm) for an ISO timestamp. */
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/** In-universe era of game dates; real year 2023 is year 0. */
export const GAME_ERA = 'NSY';
const GAME_ERA_BEFORE = 'VSY';
const GAME_YEAR_OFFSET = 2023;

const gameDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function gameParts(formatter: Intl.DateTimeFormat, value: string) {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year) - GAME_YEAR_OFFSET;
  const era = year < 0 ? `${-year} ${GAME_ERA_BEFORE}` : `${year} ${GAME_ERA}`;
  return { ...parts, date: `${parts.day}.${parts.month}.${era}` };
}

/** In-universe date of a game event: real day and month, year as "n NSY". */
export function formatGameDate(value: string): string {
  return gameParts(gameDateFormatter, value).date;
}

/** In-universe date and real local time of a game event ("14.11.3 NSY, 18:30"). */
export function formatGameDateTime(value: string): string {
  const parts = gameParts(dateTimeFormatter, value);
  return `${parts.date}, ${parts.hour}:${parts.minute}`;
}
