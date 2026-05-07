export enum MigrationFaction {
  REBEL_ALLIANCE = 'REBEL_ALLIANCE',
  GALACTIC_EMPIRE = 'GALACTIC_EMPIRE',
}

export enum MigrationWsEventType {
  TICK_PROCESSED = 'tick.processed',
  COMBAT_UPDATED = 'combat.updated',
  SPACECRAFT_UPDATED = 'spacecraft.updated',
}

export interface MigrationJwtPayload {
  sub: number;
  username: string;
  faction?: MigrationFaction | null;
  iat?: number;
  exp?: number;
}
