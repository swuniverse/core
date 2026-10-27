export const EMAIL_BLOCKLIST = Symbol('EMAIL_BLOCKLIST');

export interface EmailBlocklistPort {
  isBlocked(email: string): Promise<boolean>;
}

export class AllowAllEmailBlocklist implements EmailBlocklistPort {
  async isBlocked(_email: string): Promise<boolean> {
    return false;
  }
}
