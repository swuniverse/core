import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLayerColonizableNoobzone20260518140000 implements MigrationInterface {
  name = 'RemoveLayerColonizableNoobzone20260518140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "layers" DROP COLUMN IF EXISTS "isColonizable"');
    await queryRunner.query('ALTER TABLE "layers" DROP COLUMN IF EXISTS "isNoobZone"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "layers" ADD COLUMN "isNoobZone" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "layers" ADD COLUMN "isColonizable" boolean NOT NULL DEFAULT false');
  }
}
