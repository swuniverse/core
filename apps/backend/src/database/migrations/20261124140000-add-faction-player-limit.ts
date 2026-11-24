import { MigrationInterface, QueryRunner } from 'typeorm';

/** sh-AUD-06: STU `faction.player_limit`, 0 = unlimited. */
export class AddFactionPlayerLimit20261124140000 implements MigrationInterface {
  name = 'AddFactionPlayerLimit20261124140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "factions" ADD COLUMN IF NOT EXISTS "playerLimit" integer NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "factions" DROP COLUMN IF EXISTS "playerLimit"`);
  }
}
