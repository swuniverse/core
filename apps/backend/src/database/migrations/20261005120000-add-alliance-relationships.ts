import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceRelationships20261005120000
  implements MigrationInterface
{
  name = 'AddAllianceRelationships20261005120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "diplomacy_parties" (
        "id" SERIAL NOT NULL,
        "allianceId" integer,
        "userId" integer,
        CONSTRAINT "PK_diplomacy_parties" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_diplomacy_parties_one_subject" CHECK (
          ("allianceId" IS NOT NULL AND "userId" IS NULL) OR
          ("allianceId" IS NULL AND "userId" IS NOT NULL)
        ),
        CONSTRAINT "FK_diplomacy_parties_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_diplomacy_parties_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_diplomacy_parties_alliance" ON "diplomacy_parties" ("allianceId") WHERE "allianceId" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_diplomacy_parties_user" ON "diplomacy_parties" ("userId") WHERE "userId" IS NOT NULL',
    );
    await queryRunner.query(
      'INSERT INTO "diplomacy_parties" ("allianceId") SELECT "id" FROM "alliances"',
    );

    await queryRunner.query(`
      CREATE TABLE "alliance_relationships" (
        "id" SERIAL NOT NULL,
        "firstPartyId" integer NOT NULL,
        "secondPartyId" integer NOT NULL,
        "type" varchar(32) NOT NULL,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "endedAt" TIMESTAMP,
        "contract" text NOT NULL DEFAULT '',
        "treatAsFriend" boolean NOT NULL DEFAULT false,
        "shareLivePositions" boolean NOT NULL DEFAULT false,
        "lordPartyId" integer,
        "vassalPartyId" integer,
        CONSTRAINT "PK_alliance_relationships" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_relationships_canonical_pair" CHECK ("firstPartyId" < "secondPartyId"),
        CONSTRAINT "CHK_alliance_relationships_type" CHECK ("type" IN ('WAR', 'PEACE', 'FRIENDSHIP', 'ALLIANCE', 'TRADE_AGREEMENT', 'VASSALAGE')),
        CONSTRAINT "CHK_alliance_relationships_vassalage" CHECK (
          ("type" = 'VASSALAGE' AND "lordPartyId" IS NOT NULL AND "vassalPartyId" IS NOT NULL AND "lordPartyId" <> "vassalPartyId" AND "lordPartyId" IN ("firstPartyId", "secondPartyId") AND "vassalPartyId" IN ("firstPartyId", "secondPartyId")) OR
          ("type" <> 'VASSALAGE' AND "lordPartyId" IS NULL AND "vassalPartyId" IS NULL)
        ),
        CONSTRAINT "CHK_alliance_relationships_permissions" CHECK (
          (NOT "treatAsFriend" OR "type" IN ('FRIENDSHIP', 'ALLIANCE', 'TRADE_AGREEMENT', 'VASSALAGE')) AND
          (NOT "shareLivePositions" OR "type" = 'ALLIANCE')
        ),
        CONSTRAINT "CHK_alliance_relationships_contract_length" CHECK (char_length(btrim("contract")) <= 20000),
        CONSTRAINT "CHK_alliance_relationships_war_contract" CHECK ("type" <> 'WAR' OR "contract" = ''),
        CONSTRAINT "FK_alliance_relationships_first_party" FOREIGN KEY ("firstPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationships_second_party" FOREIGN KEY ("secondPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationships_lord_party" FOREIGN KEY ("lordPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationships_vassal_party" FOREIGN KEY ("vassalPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_alliance_relationships_active_pair" ON "alliance_relationships" ("firstPartyId", "secondPartyId") WHERE "endedAt" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_relationships_first_party_active" ON "alliance_relationships" ("firstPartyId") WHERE "endedAt" IS NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_relationships_second_party_active" ON "alliance_relationships" ("secondPartyId") WHERE "endedAt" IS NULL',
    );

    await queryRunner.query(`
      CREATE FUNCTION assert_alliance_relationship_faction() RETURNS trigger AS $$
      DECLARE
        first_alliance_id integer;
        second_alliance_id integer;
        first_faction_id integer;
        second_faction_id integer;
      BEGIN
        SELECT "allianceId" INTO first_alliance_id FROM "diplomacy_parties" WHERE "id" = NEW."firstPartyId";
        SELECT "allianceId" INTO second_alliance_id FROM "diplomacy_parties" WHERE "id" = NEW."secondPartyId";
        IF first_alliance_id IS NULL OR second_alliance_id IS NULL THEN
          RAISE EXCEPTION 'Alliance relationships currently require alliance parties' USING ERRCODE = '23514';
        END IF;
        SELECT "factionId" INTO first_faction_id FROM "alliances" WHERE "id" = first_alliance_id;
        SELECT "factionId" INTO second_faction_id FROM "alliances" WHERE "id" = second_alliance_id;
        IF first_faction_id <> second_faction_id THEN
          RAISE EXCEPTION 'Alliance relationships require the same faction' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_alliance_relationships_same_faction"
      BEFORE INSERT OR UPDATE OF "firstPartyId", "secondPartyId"
      ON "alliance_relationships"
      FOR EACH ROW EXECUTE FUNCTION assert_alliance_relationship_faction()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER "TRG_alliance_relationships_same_faction" ON "alliance_relationships"',
    );
    await queryRunner.query('DROP FUNCTION assert_alliance_relationship_faction()');
    await queryRunner.query('DROP TABLE "alliance_relationships"');
    await queryRunner.query('DROP TABLE "diplomacy_parties"');
  }
}
