import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyShipBuildQueue20260618130000 implements MigrationInterface {
  name = 'AddColonyShipBuildQueue20260618130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_ship_build_queue" (
        "id" SERIAL NOT NULL,
        "colonyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL,
        "name" varchar(255) NOT NULL,
        "finishesAt" timestamp NOT NULL,
        "status" varchar NOT NULL DEFAULT 'QUEUED',
        CONSTRAINT "PK_colony_ship_build_queue" PRIMARY KEY ("id"),
        CONSTRAINT "FK_colony_ship_build_queue_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_colony_ship_build_queue_ship_class" FOREIGN KEY ("shipClassId") REFERENCES "ship_class_defs"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_queue_colony_status" ON "colony_ship_build_queue" ("colonyId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_queue_user_status" ON "colony_ship_build_queue" ("userId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_ship_build_queue"`);
  }
}
