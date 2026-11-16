import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFleetListPreferences20261116133000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fleets" ADD COLUMN "sort" integer NOT NULL DEFAULT 0, ADD COLUMN "isHidden" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fleets" DROP COLUMN "isHidden", DROP COLUMN "sort"`,
    );
  }
}
