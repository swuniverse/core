import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceChronicle20261009100000 implements MigrationInterface {
  name = 'AddAllianceChronicle20261009100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_chronicle_entries" (
        "id" SERIAL NOT NULL,
        "allianceId" integer NOT NULL,
        "eventType" character varying(32) NOT NULL,
        "actorUserId" integer,
        "actorName" character varying(255),
        "subjectUserId" integer,
        "subjectName" character varying(255),
        "metadata" jsonb,
        "occurredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_chronicle_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alliance_chronicle_entries_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_chronicle_entries_actor" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_alliance_chronicle_entries_subject" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_chronicle_entries_order"
      ON "alliance_chronicle_entries" ("allianceId", "occurredAt" DESC, "id" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_chronicle_entries_order"',
    );
    await queryRunner.query('DROP TABLE "alliance_chronicle_entries"');
  }
}
