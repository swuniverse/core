export type InviteStatus = 'available' | 'used' | 'revoked';

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('de-DE');
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
