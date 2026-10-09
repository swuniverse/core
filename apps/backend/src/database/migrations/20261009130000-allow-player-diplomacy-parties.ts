import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets diplomacy parties be alliance-less players as well as alliances.
 * Everything is backward compatible: existing rows keep their meaning
 * (alliance parties), no row is rewritten and the immutability trigger of
 * the public chronicle stays in place. The chronicle's vassalage check is
 * already generic and unchanged.
 *
 * Already party-generic and therefore unchanged: the canonical pair check
 * (distinct parties), active-pair and proposal-pair uniqueness, the
 * vassalage consistency check and the one-subject check on parties.
 * Alliance-specific and replaced here: the two faction triggers and the
 * chronicle (columns, self-relationship check, indexes).
 */
export class AllowPlayerDiplomacyParties20261009130000
  implements MigrationInterface
{
  name = 'AllowPlayerDiplomacyParties20261009130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assert_alliance_relationship_faction() RETURNS trigger AS $$
      DECLARE
        first_faction_id integer;
        second_faction_id integer;
      BEGIN
        SELECT COALESCE(a."factionId", u."factionId") INTO first_faction_id
          FROM "diplomacy_parties" p
          LEFT JOIN "alliances" a ON a."id" = p."allianceId"
          LEFT JOIN "users" u ON u."id" = p."userId"
          WHERE p."id" = NEW."firstPartyId";
        SELECT COALESCE(a."factionId", u."factionId") INTO second_faction_id
          FROM "diplomacy_parties" p
          LEFT JOIN "alliances" a ON a."id" = p."allianceId"
          LEFT JOIN "users" u ON u."id" = p."userId"
          WHERE p."id" = NEW."secondPartyId";
        IF first_faction_id IS NULL OR first_faction_id <> second_faction_id THEN
          RAISE EXCEPTION 'Alliance relationships require the same faction' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assert_alliance_relationship_proposal_faction()
      RETURNS trigger AS $$
      DECLARE
        first_faction integer;
        second_faction integer;
      BEGIN
        IF NEW."firstPartyId" = NEW."secondPartyId" THEN
          RAISE EXCEPTION 'Relationship proposals require two distinct parties';
        END IF;
        SELECT COALESCE(a."factionId", u."factionId") INTO first_faction
          FROM "diplomacy_parties" p
          LEFT JOIN "alliances" a ON a."id" = p."allianceId"
          LEFT JOIN "users" u ON u."id" = p."userId"
          WHERE p."id" = NEW."firstPartyId";
        SELECT COALESCE(a."factionId", u."factionId") INTO second_faction
          FROM "diplomacy_parties" p
          LEFT JOIN "alliances" a ON a."id" = p."allianceId"
          LEFT JOIN "users" u ON u."id" = p."userId"
          WHERE p."id" = NEW."secondPartyId";
        IF first_faction IS NULL OR first_faction <> second_faction THEN
          RAISE EXCEPTION 'Relationship proposals require parties from the same faction';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // The chronicle keeps its column names: "firstAllianceId" and friends now
    // hold the ID of an alliance or a user depending on the party type.
    for (const column of [
      '"firstPartyType"',
      '"secondPartyType"',
      '"lordPartyType"',
      '"vassalPartyType"',
    ]) {
      // Existing entries are alliance parties on every side; the default
      // keeps them untouched (the table is append-only).
      await queryRunner.query(
        `ALTER TABLE "alliance_diplomacy_chronicle_entries" ADD COLUMN ${column} character varying(16) NOT NULL DEFAULT 'ALLIANCE'`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "alliance_diplomacy_chronicle_entries" ADD COLUMN "endReason" character varying(32)`,
    );
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        ALTER COLUMN "firstAllianceName" TYPE character varying(255),
        ALTER COLUMN "secondAllianceName" TYPE character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        DROP CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair"
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        ADD CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair" CHECK (
          "firstPartyType" <> "secondPartyType" OR "firstAllianceId" <> "secondAllianceId"
        ),
        ADD CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_party_types" CHECK (
          "firstPartyType" IN ('ALLIANCE', 'PLAYER')
          AND "secondPartyType" IN ('ALLIANCE', 'PLAYER')
          AND "lordPartyType" IN ('ALLIANCE', 'PLAYER')
          AND "vassalPartyType" IN ('ALLIANCE', 'PLAYER')
        ),
        ADD CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_end_reason" CHECK (
          "endReason" IS NULL OR "endReason" IN ('PARTY_JOINED_ALLIANCE')
        )
    `);
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_first_order"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_second_order"',
    );
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_diplomacy_chronicle_entries_first_order"
      ON "alliance_diplomacy_chronicle_entries" ("firstPartyType", "firstAllianceId", "occurredAt" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_diplomacy_chronicle_entries_second_order"
      ON "alliance_diplomacy_chronicle_entries" ("secondPartyType", "secondAllianceId", "occurredAt" DESC, "id" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Rows with a player side cannot be represented by the old shape (a
    // player ID would read as an alliance ID). The immutability trigger is
    // lifted only for this purge and restored right after.
    await queryRunner.query(
      'ALTER TABLE "alliance_diplomacy_chronicle_entries" DISABLE TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"',
    );
    await queryRunner.query(
      `DELETE FROM "alliance_diplomacy_chronicle_entries" WHERE "firstPartyType" = 'PLAYER' OR "secondPartyType" = 'PLAYER' OR "lordPartyType" = 'PLAYER' OR "vassalPartyType" = 'PLAYER'`,
    );
    await queryRunner.query(
      'ALTER TABLE "alliance_diplomacy_chronicle_entries" ENABLE TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_second_order"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_chronicle_entries_first_order"',
    );
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        DROP CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_end_reason",
        DROP CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_party_types",
        DROP CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair"
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        DROP COLUMN "endReason",
        DROP COLUMN "vassalPartyType",
        DROP COLUMN "lordPartyType",
        DROP COLUMN "secondPartyType",
        DROP COLUMN "firstPartyType"
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        ALTER COLUMN "firstAllianceName" TYPE character varying(40),
        ALTER COLUMN "secondAllianceName" TYPE character varying(40)
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_chronicle_entries"
        ADD CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair" CHECK ( "firstAllianceId" <> "secondAllianceId" )
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
      CREATE OR REPLACE FUNCTION assert_alliance_relationship_proposal_faction()
      RETURNS trigger AS $$
      DECLARE
        first_alliance integer;
        second_alliance integer;
        first_faction integer;
        second_faction integer;
      BEGIN
        SELECT "allianceId" INTO first_alliance FROM diplomacy_parties WHERE id = NEW."firstPartyId";
        SELECT "allianceId" INTO second_alliance FROM diplomacy_parties WHERE id = NEW."secondPartyId";
        IF first_alliance IS NULL OR second_alliance IS NULL OR first_alliance = second_alliance THEN
          RAISE EXCEPTION 'Relationship proposals require two distinct alliance parties';
        END IF;
        SELECT "factionId" INTO first_faction FROM alliances WHERE id = first_alliance;
        SELECT "factionId" INTO second_faction FROM alliances WHERE id = second_alliance;
        IF first_faction IS NULL OR first_faction <> second_faction THEN
          RAISE EXCEPTION 'Relationship proposals require alliances from the same faction';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assert_alliance_relationship_faction() RETURNS trigger AS $$
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
  }
}
