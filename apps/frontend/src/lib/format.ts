export type InviteStatus = 'available' | 'used' | 'revoked';

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
