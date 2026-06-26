import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyEvents20260624100000 implements MigrationInterface {
  name = 'AddColonyEvents20260624100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_events" (
        "id" SERIAL NOT NULL,
        "colonyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "type" varchar(64) NOT NULL,
        "severity" varchar(16) NOT NULL DEFAULT 'INFO',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "tickId" bigint,
        "readAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_colony_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_colony_events_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_events_colony_created" ON "colony_events" ("colonyId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_events_user_read" ON "colony_events" ("userId", "readAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_events_colony_read" ON "colony_events" ("colonyId", "readAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_events_type" ON "colony_events" ("type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_events"`);
  }
}
