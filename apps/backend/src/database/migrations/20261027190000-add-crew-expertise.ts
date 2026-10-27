import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrewExpertise20261027190000 implements MigrationInterface {
  name = 'AddCrewExpertise20261027190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "crew"
      ADD COLUMN IF NOT EXISTS "rank" varchar NOT NULL DEFAULT 'CADET'
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crew_skills" (
        "crewId" integer NOT NULL,
        "position" varchar NOT NULL,
        "expertise" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_crew_skills" PRIMARY KEY ("crewId", "position"),
        CONSTRAINT "FK_crew_skills_crew" FOREIGN KEY ("crewId") REFERENCES "crew"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_crew_skills_expertise" CHECK ("expertise" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_crew_rank_owner"
      ON "crew" ("userId", "rank")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crew_skills"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crew_rank_owner"`);
    await queryRunner.query(`ALTER TABLE "crew" DROP COLUMN IF EXISTS "rank"`);
  }
}
