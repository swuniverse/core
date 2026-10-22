import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDestructionSalvageAndPrestige20261022210000 implements MigrationInterface {
  name = 'AddDestructionSalvageAndPrestige20261022210000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ship_class_defs" ADD COLUMN IF NOT EXISTS "prestige" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "spacecraft_wrecks" ADD COLUMN IF NOT EXISTS "modules" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft_wrecks" DROP COLUMN IF EXISTS "modules"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ship_class_defs" DROP COLUMN IF EXISTS "prestige"`,
    );
  }
}
