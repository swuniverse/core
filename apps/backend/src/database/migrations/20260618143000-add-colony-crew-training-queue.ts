import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyCrewTrainingQueue20260618143000 implements MigrationInterface {
  name = 'AddColonyCrewTrainingQueue20260618143000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_stats"
        ADD COLUMN IF NOT EXISTS "trainedCrew" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_crew_training_queue" (
        "id" SERIAL NOT NULL,
        "colonyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 1,
        "finishesAt" timestamp NOT NULL,
        "status" varchar NOT NULL DEFAULT 'QUEUED',
        CONSTRAINT "PK_colony_crew_training_queue" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_crew_training_colony_status" ON "colony_crew_training_queue" ("colonyId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_crew_training_user_status" ON "colony_crew_training_queue" ("userId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "colony_crew_training_queue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "colony_stats" DROP COLUMN IF EXISTS "trainedCrew"`,
    );
  }
}
