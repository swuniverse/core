import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-FA1b2: STU has no faction-dependent ship values; the never-read hull,
 * shield and cargo multipliers are dropped.
 */
export class DropFactionShipMultipliers20261115160000 implements MigrationInterface {
  name = 'DropFactionShipMultipliers20261115160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "faction_modifiers"
        DROP COLUMN "hullMultiplier",
        DROP COLUMN "shieldMultiplier",
        DROP COLUMN "cargoMultiplier"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "faction_modifiers"
        ADD "hullMultiplier" float NOT NULL DEFAULT 1,
        ADD "shieldMultiplier" float NOT NULL DEFAULT 1,
        ADD "cargoMultiplier" float NOT NULL DEFAULT 1
    `);
  }
}
