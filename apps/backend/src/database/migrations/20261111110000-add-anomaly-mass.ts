import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnomalyMass20261111110000 implements MigrationInterface {
  name = 'AddAnomalyMass20261111110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "ship_class_defs" ADD "anomalyMass" integer');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "ship_class_defs" DROP COLUMN "anomalyMass"');
  }
}
