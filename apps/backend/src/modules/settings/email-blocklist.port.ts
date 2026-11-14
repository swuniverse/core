export const EMAIL_BLOCKLIST = Symbol('EMAIL_BLOCKLIST');

export interface EmailBlocklistPort {
  isBlocked(email: string): Promise<boolean>;
}
