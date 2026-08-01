import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonySurfaceSnapshot20260720123000 implements MigrationInterface {
  name = 'AddColonySurfaceSnapshot20260720123000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colonies"
        ADD COLUMN IF NOT EXISTS "surfaceMask" text,
        ADD COLUMN IF NOT EXISTS "surfaceWidth" integer,
        ADD COLUMN IF NOT EXISTS "rotationFactor" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
        ADD COLUMN IF NOT EXISTS "layer" varchar(16)
    `);
    await queryRunner.query(`
      UPDATE "colony_fields"
      SET "layer" = CASE
        WHEN "fieldType" >= 900 THEN 'ORBIT'
        WHEN "fieldType" >= 800 THEN 'UNDERGROUND'
        ELSE 'SURFACE'
      END
      WHERE "layer" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "colonies"
      SET
        "surfaceWidth" = COALESCE("surfaceWidth", 10),
        "rotationFactor" = COALESCE("rotationFactor", 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colony_fields" DROP COLUMN IF EXISTS "layer"`);
    await queryRunner.query(`
      ALTER TABLE "colonies"
        DROP COLUMN IF EXISTS "rotationFactor",
        DROP COLUMN IF EXISTS "surfaceWidth",
        DROP COLUMN IF EXISTS "surfaceMask"
    `);
  }
}
