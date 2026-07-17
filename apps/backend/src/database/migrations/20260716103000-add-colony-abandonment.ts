import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyAbandonment20260716103000 implements MigrationInterface {
  name = 'AddColonyAbandonment20260716103000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colonies"
        ALTER COLUMN "userId" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "isAbandoned" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "abandonedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "previousUserId" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colonies"
      SET "userId" = "previousUserId"
      WHERE "userId" IS NULL AND "previousUserId" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "colonies"
        DROP COLUMN IF EXISTS "previousUserId",
        DROP COLUMN IF EXISTS "abandonedAt",
        DROP COLUMN IF EXISTS "isAbandoned"
    `);
    await queryRunner.query(`
      ALTER TABLE "colonies"
        ALTER COLUMN "userId" SET NOT NULL
    `);
  }
}
