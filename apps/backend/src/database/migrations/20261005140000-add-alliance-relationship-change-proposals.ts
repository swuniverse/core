import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceRelationshipChangeProposals20261005140000
  implements MigrationInterface
{
  name = 'AddAllianceRelationshipChangeProposals20261005140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_relationship_change_proposals" (
        "id" SERIAL NOT NULL,
        "relationshipId" integer NOT NULL,
        "senderPartyId" integer NOT NULL,
        "recipientPartyId" integer NOT NULL,
        "contract" text NOT NULL DEFAULT '',
        "treatAsFriend" boolean NOT NULL DEFAULT false,
        "shareLivePositions" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_relationship_change_proposals" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alliance_relationship_change_proposals_relationship" UNIQUE ("relationshipId"),
        CONSTRAINT "CHK_alliance_relationship_change_proposals_direction" CHECK (
          "senderPartyId" <> "recipientPartyId"
        ),
        CONSTRAINT "CHK_alliance_relationship_change_proposals_contract_length" CHECK (
          char_length(btrim("contract")) <= 20000
        ),
        CONSTRAINT "FK_alliance_relationship_change_proposals_relationship" FOREIGN KEY ("relationshipId") REFERENCES "alliance_relationships"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationship_change_proposals_sender_party" FOREIGN KEY ("senderPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_relationship_change_proposals_recipient_party" FOREIGN KEY ("recipientPartyId") REFERENCES "diplomacy_parties"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assert_alliance_relationship_change_proposal_shape()
      RETURNS trigger AS $$
      DECLARE
        relationship_type character varying(32);
        first_party integer;
        second_party integer;
      BEGIN
        SELECT "type", "firstPartyId", "secondPartyId"
          INTO relationship_type, first_party, second_party
          FROM alliance_relationships
          WHERE id = NEW."relationshipId" AND "endedAt" IS NULL;
        IF relationship_type IS NULL OR relationship_type IN ('WAR', 'PEACE') THEN
          RAISE EXCEPTION 'Relationship change proposals require an active non-war, non-peace relationship';
        END IF;
        IF NEW."senderPartyId" NOT IN (first_party, second_party)
          OR NEW."recipientPartyId" NOT IN (first_party, second_party) THEN
          RAISE EXCEPTION 'Relationship change proposal parties must belong to its relationship';
        END IF;
        IF NEW."treatAsFriend" AND relationship_type NOT IN ('FRIENDSHIP', 'ALLIANCE', 'TRADE_AGREEMENT', 'VASSALAGE') THEN
          RAISE EXCEPTION 'This relationship type cannot treat the counterparty as a friend';
        END IF;
        IF NEW."shareLivePositions" AND relationship_type <> 'ALLIANCE' THEN
          RAISE EXCEPTION 'Only an alliance relationship can share live positions';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_alliance_relationship_change_proposals_shape"
      BEFORE INSERT OR UPDATE ON "alliance_relationship_change_proposals"
      FOR EACH ROW EXECUTE FUNCTION assert_alliance_relationship_change_proposal_shape()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER "TRG_alliance_relationship_change_proposals_shape" ON "alliance_relationship_change_proposals"',
    );
    await queryRunner.query(
      'DROP FUNCTION assert_alliance_relationship_change_proposal_shape()',
    );
    await queryRunner.query(
      'DROP TABLE "alliance_relationship_change_proposals"',
    );
  }
}
