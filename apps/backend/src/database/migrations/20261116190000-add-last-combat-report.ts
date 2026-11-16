import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddLastCombatReport20261116190000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE "spacecraft" ADD COLUMN "lastCombatReport" jsonb',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE "spacecraft" DROP COLUMN "lastCombatReport"',
    );
  }
}
