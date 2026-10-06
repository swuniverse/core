import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceDiplomacyChronicle20261005150000
  implements MigrationInterface
{
  name = 'AddAllianceDiplomacyChronicle20261005150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_diplomacy_chronicle_entries" (
        "id" SERIAL NOT NULL,
        "eventType" character varying(32) NOT NULL,
        "actorUserId" integer,
        "actorName" character varying(255),
        "firstAllianceId" integer NOT NULL,
        "firstAllianceName" character varying(40) NOT NULL,
        "secondAllianceId" integer NOT NULL,
        "secondAllianceName" character varying(40) NOT NULL,
        "relationshipType" character varying(32) NOT NULL,
        "lordAllianceId" integer,
        "vassalAllianceId" integer,
        "occurredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_diplomacy_chronicle_entries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair" CHECK (
          "firstAllianceId" <> "secondAllianceId"
        ),
        CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_vassalage" CHECK (
          ("lordAllianceId" IS NULL AND "vassalAllianceId" IS NULL)
          OR ("lordAllianceId" IS NOT NULL AND "vassalAllianceId" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_diplomacy_chronicle_entries_first_order"
      ON "alliance_diplomacy_chronicle_entries" ("firstAllianceId", "occurredAt" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_diplomacy_chronicle_entries_second_order"
      ON "alliance_diplomacy_chronicle_entries" ("secondAllianceId", "occurredAt" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE FUNCTION reject_alliance_diplomacy_chronicle_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Diplomacy chronicle entries are immutable';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"
      BEFORE UPDATE OR DELETE ON "alliance_diplomacy_chronicle_entries"
      FOR EACH ROW EXECUTE FUNCTION reject_alliance_diplomacy_chronicle_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable" ON "alliance_diplomacy_chronicle_entries"',
    );
    await queryRunner.query(
      'DROP FUNCTION reject_alliance_diplomacy_chronicle_mutation()',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_second_order"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_first_order"',
    );
    await queryRunner.query('DROP TABLE "alliance_diplomacy_chronicle_entries"');
  }
}
