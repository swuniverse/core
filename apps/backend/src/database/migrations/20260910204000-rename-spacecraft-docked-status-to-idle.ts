import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSpacecraftDockedStatusToIdle20260910204000 implements MigrationInterface {
  name = 'RenameSpacecraftDockedStatusToIdle20260910204000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "status" = 'IDLE'
      WHERE "status" = 'DOCKED'
    `);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      ALTER COLUMN "status" SET DEFAULT 'IDLE'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "status" = 'DOCKED'
      WHERE "status" = 'IDLE'
    `);
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      ALTER COLUMN "status" SET DEFAULT 'DOCKED'
    `);
  }
}
