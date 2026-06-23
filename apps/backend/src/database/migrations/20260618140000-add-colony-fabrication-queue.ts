import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFabricationQueue20260618140000 implements MigrationInterface {
  name = 'AddColonyFabricationQueue20260618140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_fabrication_queue" (
        "id" SERIAL NOT NULL,
        "colonyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "queueType" varchar NOT NULL,
        "itemKey" varchar(255) NOT NULL,
        "amount" integer NOT NULL DEFAULT 1,
        "buildingFunctionId" integer NOT NULL,
        "finishesAt" timestamp NOT NULL,
        "status" varchar NOT NULL DEFAULT 'QUEUED',
        CONSTRAINT "PK_colony_fabrication_queue" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_fabrication_queue_colony_status" ON "colony_fabrication_queue" ("colonyId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_fabrication_queue_user_status" ON "colony_fabrication_queue" ("userId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_fabrication_queue"`);
  }
}
