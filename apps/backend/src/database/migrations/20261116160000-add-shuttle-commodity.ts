import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddShuttleCommodity20261116160000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "spacecraft" ADD COLUMN "shuttleCommodityId" integer`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN "shuttleCommodityId"`,
    );
  }
}
