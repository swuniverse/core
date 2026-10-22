import type { ComponentPropsWithoutRef } from 'react';

export type InviteStatus = 'available' | 'used' | 'revoked';

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

export function formatInviteStatus(status: InviteStatus): string {
  switch (status) {
    case 'available':
      return 'Verfuegbar';
    case 'used':
      return 'Verwendet';
    case 'revoked':
      return 'Widerrufen';
    default:
      return status;
  }
}
