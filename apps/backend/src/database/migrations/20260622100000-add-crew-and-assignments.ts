import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrewAndAssignments20260622100000 implements MigrationInterface {
  name = 'AddCrewAndAssignments20260622100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crew" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "type" varchar NOT NULL DEFAULT 'CREWMAN',
        "gender" varchar NOT NULL DEFAULT 'DIVERSE',
        "name" varchar(255) NOT NULL,
        CONSTRAINT "PK_crew" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crew_user" ON "crew" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crew_assignments" (
        "crewId" integer NOT NULL,
        "userId" integer NOT NULL,
        "colonyId" integer,
        "spacecraftId" integer,
        "slot" varchar,
        CONSTRAINT "PK_crew_assignments" PRIMARY KEY ("crewId"),
        CONSTRAINT "FK_crew_assignments_crew" FOREIGN KEY ("crewId") REFERENCES "crew"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crew_assignments_user" ON "crew_assignments" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crew_assignments_colony" ON "crew_assignments" ("colonyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crew_assignments_spacecraft" ON "crew_assignments" ("spacecraftId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crew_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crew"`);
  }
}
