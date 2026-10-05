import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceRelationshipProposals20261005130000 implements MigrationInterface {
  name = 'AddAllianceRelationshipProposals20261005130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_relationship_proposals" (
        "id" SERIAL NOT NULL,
        "firstPartyId" integer NOT NULL,
        "secondPartyId" integer NOT NULL,
        "senderPartyId" integer NOT NULL,
        "recipientPartyId" integer NOT NULL,
        "type" character varying(32) NOT NULL,
        "contract" text NOT NULL DEFAULT '',
        "treatAsFriend" boolean NOT NULL DEFAULT false,
        "shareLivePositions" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_relationship_proposals" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alliance_relationship_proposals_pair" UNIQUE ("firstPartyId", "secondPartyId"),
        CONSTRAINT "CHK_alliance_relationship_proposals_pair" CHECK ("firstPartyId" < "secondPartyId"),
        CONSTRAINT "CHK_alliance_relationship_proposals_direction" CHECK (
          "senderPartyId" <> "recipientPartyId"
          AND "senderPartyId" IN ("firstPartyId", "secondPartyId")
          AND "recipientPartyId" IN ("firstPartyId", "secondPartyId")
        ),
        CONSTRAINT "CHK_alliance_relationship_proposals_type" CHECK (
          "type" IN ('PEACE', 'FRIENDSHIP', 'ALLIANCE', 'TRADE_AGREEMENT', 'VASSALAGE')
        ),
        CONSTRAINT "CHK_alliance_relationship_proposals_permissions" CHECK (
          (NOT "treatAsFriend" OR "type" IN ('FRIENDSHIP', 'ALLIANCE', 'TRADE_AGREEMENT', 'VASSALAGE'))
          AND (NOT "shareLivePositions" OR "type" = 'ALLIANCE')
        ),
        CONSTRAINT "FK_alliance_relationship_proposals_first_party" FOREIGN KEY ("firstPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationship_proposals_second_party" FOREIGN KEY ("secondPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationship_proposals_sender_party" FOREIGN KEY ("senderPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationship_proposals_recipient_party" FOREIGN KEY ("recipientPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE
      )
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
      CREATE TRIGGER "TRG_alliance_relationship_proposals_same_faction"
      BEFORE INSERT OR UPDATE ON "alliance_relationship_proposals"
      FOR EACH ROW EXECUTE FUNCTION assert_alliance_relationship_proposal_faction()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER "TRG_alliance_relationship_proposals_same_faction" ON "alliance_relationship_proposals"',
    );
    await queryRunner.query(
      'DROP FUNCTION assert_alliance_relationship_proposal_faction()',
    );
    await queryRunner.query('DROP TABLE "alliance_relationship_proposals"');
  }
}
