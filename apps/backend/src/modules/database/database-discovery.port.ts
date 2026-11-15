import { Global, Module } from '@nestjs/common';
import type { DatabaseAwardCategory } from '@swuniverse/shared';

/**
 * Port for new database entries (STU `CreateDatabaseEntry`): discovery
 * services in the starmap and spacecraft modules report first discoveries;
 * the database module fills the port at startup with notice and award check,
 * so neither side imports the other.
 */
export const DATABASE_DISCOVERY = Symbol('DATABASE_DISCOVERY');

export interface DatabaseDiscovery {
  userId: number;
  category: DatabaseAwardCategory;
  /** Layer of a star system entry; checks only that layer's award. */
  layerId?: number | null;
  name: string;
  prestige: number;
}

export interface DatabaseDiscoveryPort {
  notify: ((discovery: DatabaseDiscovery) => Promise<void>) | null;
}

@Global()
@Module({
  providers: [
    { provide: DATABASE_DISCOVERY, useFactory: (): DatabaseDiscoveryPort => ({ notify: null }) },
  ],
  exports: [DATABASE_DISCOVERY],
})
export class DatabaseDiscoveryPortModule {}
