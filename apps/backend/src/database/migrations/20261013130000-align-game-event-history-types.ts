import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignGameEventHistoryTypes20261013130000
  implements MigrationInterface
{
  name = 'AlignGameEventHistoryTypes20261013130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "game_events"
      SET "type" = 'SHIP'
      WHERE "type" IN ('SPACECRAFT_DESTROYED', 'HYPERSPACE_INTERCEPTED')
    `);
    await queryRunner.query(`
      DELETE FROM "game_events"
      WHERE "type" = 'SYSTEM_ENTERED'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "game_events"
      WHERE "type" IN ('STATION', 'COLONY', 'ALLIANCE', 'OTHER')
    `);
  }
}
