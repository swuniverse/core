import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftRepairTasks20261022233000
  implements MigrationInterface
{
  name = 'AddSpacecraftRepairTasks20261022233000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "spacecraft_repair_tasks" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL UNIQUE,
        "targetType" varchar NOT NULL,
        "moduleId" integer,
        "partsType" varchar NOT NULL,
        "targetIntegrity" integer NOT NULL,
        "spareParts" integer NOT NULL DEFAULT 0,
        "systemComponents" integer NOT NULL DEFAULT 0,
        "completesAt" timestamp NOT NULL,
        CONSTRAINT "FK_spacecraft_repair_task_spacecraft" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_repair_task_module" FOREIGN KEY ("moduleId") REFERENCES "spacecraft_modules"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "spacecraft_repair_tasks"');
  }
}
