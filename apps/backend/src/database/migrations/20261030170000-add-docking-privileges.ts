import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDockingPrivileges20261030170000 implements MigrationInterface {
  name = 'AddDockingPrivileges20261030170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "docking_privileges" (
        "id" SERIAL PRIMARY KEY,
        "stationId" integer NOT NULL,
        "targetType" varchar(16) NOT NULL,
        "targetId" integer NOT NULL,
        "mode" varchar(8) NOT NULL,
        CONSTRAINT "FK_docking_privileges_station" FOREIGN KEY ("stationId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_docking_privileges_type" CHECK ("targetType" IN ('USER', 'ALLIANCE', 'FACTION', 'SHIP')),
        CONSTRAINT "CHK_docking_privileges_mode" CHECK ("mode" IN ('ALLOW', 'DENY'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_docking_privileges_target" ON "docking_privileges" ("stationId", "targetType", "targetId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_docking_privileges_target_lookup" ON "docking_privileges" ("targetType", "targetId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "spacecraft" ADD COLUMN "dockPmAutoRead" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "dockPmAutoRead"`,
    );
    await queryRunner.query('DROP TABLE IF EXISTS "docking_privileges"');
  }
}
