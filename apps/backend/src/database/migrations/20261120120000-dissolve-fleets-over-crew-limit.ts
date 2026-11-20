import { Logger } from '@nestjs/common';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * sc-AUD-05a: STU `CorruptFleetDeletion` dissolves player fleets above 100
 * buildplan crew. Joining now enforces the limit, so one cleanup suffices.
 */
export class DissolveFleetsOverCrewLimit1795176000000 implements MigrationInterface {
  name = 'DissolveFleetsOverCrewLimit1795176000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Orbit orders cascade with the fleet; members fall back via ON DELETE SET NULL.
    const [, deleted] = (await queryRunner.query(`
      DELETE FROM "fleets" fleet
       USING "users" owner
       WHERE owner."id" = fleet."userId"
         AND owner."isNpc" = false
         AND (SELECT COALESCE(SUM(GREATEST(ship."crewRequired", 0)), 0)
                FROM "spacecraft" ship
               WHERE ship."fleetId" = fleet."id") > 100
    `)) as [unknown, number];
    new Logger(this.name).log(`${deleted ?? 0} Flotten über dem Crewlimit aufgelöst`);
  }

  async down(): Promise<void> {
    // Dissolved fleets cannot be restored.
  }
}
