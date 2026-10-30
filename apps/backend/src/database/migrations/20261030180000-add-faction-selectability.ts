import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFactionSelectability20261030180000 implements MigrationInterface {
  name = 'AddFactionSelectability20261030180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "factions"
        ADD COLUMN "isSelectable" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "factions"
        DROP COLUMN "isSelectable"
    `);
  }
}
