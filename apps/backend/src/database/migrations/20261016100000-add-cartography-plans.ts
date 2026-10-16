import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartographyPlans20261016100000 implements MigrationInterface {
  name = 'AddCartographyPlans20261016100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cartography_plans" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "starSystemId" integer NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'PLANNED',
        "remainingFieldIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "finalizationStartedAt" TIMESTAMP,
        "finalizationTick" integer,
        "finalizingSpacecraftId" integer,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cartography_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cartography_plans_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cartography_plans_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cartography_plans_finalizing_ship" FOREIGN KEY ("finalizingSpacecraftId") REFERENCES "spacecraft"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_cartography_plans_status" CHECK ("status" IN ('PLANNED', 'MEASURED', 'FINISHING', 'DONE')),
        CONSTRAINT "CHK_cartography_plans_finalization_tick" CHECK ("finalizationTick" IS NULL OR "finalizationTick" BETWEEN 0 AND 3)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_user_system" ON "cartography_plans" ("userId", "starSystemId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_cartography_plans_user" ON "cartography_plans" ("userId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_cartography_plans_system_status" ON "cartography_plans" ("starSystemId", "status")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_finalizing_ship" ON "cartography_plans" ("finalizingSpacecraftId") WHERE "status" = \'FINISHING\'',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "cartography_plans"');
  }
}
