import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftFlightOrigin20260910208000 implements MigrationInterface {
  name = 'AddSpacecraftFlightOrigin20260910208000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD COLUMN "flightOrigin" jsonb',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP COLUMN "flightOrigin"',
    );
  }
}
