import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscapePodsAndCrewLocationConstraint20261030160000
  implements MigrationInterface
{
  name = 'AddEscapePodsAndCrewLocationConstraint20261030160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "escape_pods" (
        "id" SERIAL NOT NULL,
        "locationId" integer NOT NULL,
        "originSpacecraftId" integer NOT NULL,
        "originShipName" character varying(255) NOT NULL,
        "originShipClassId" integer NOT NULL,
        "originFaction" character varying(32),
        "presentationKey" character varying(64) NOT NULL,
        "launchReason" character varying(32) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_escape_pods_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_escape_pods_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_escape_pods_location" ON "escape_pods" ("locationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD COLUMN IF NOT EXISTS "escapePodId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD CONSTRAINT "FK_crew_assignments_escape_pod" FOREIGN KEY ("escapePodId") REFERENCES "escape_pods"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crew_assignments_escape_pod" ON "crew_assignments" ("escapePodId")`,
    );

    // Ship build queues no longer reserve individual crew: return reserved
    // crew to the queue's colony, drop locationless crew, then drop the columns.
    await queryRunner.query(
      `UPDATE "crew_assignments" ca
         SET "colonyId" = q."colonyId"
        FROM "colony_ship_build_queue" q
       WHERE ca."colonyId" IS NULL AND ca."spacecraftId" IS NULL
         AND q."crewIds" @> to_jsonb(ca."crewId")`,
    );
    await queryRunner.query(
      `DELETE FROM "crew" WHERE "id" IN (
         SELECT "crewId" FROM "crew_assignments"
          WHERE "colonyId" IS NULL AND "spacecraftId" IS NULL AND "escapePodId" IS NULL)`,
    );
    await queryRunner.query(
      `UPDATE "colony_changeable" c
          SET "trainedCrew" = (SELECT COUNT(*) FROM "crew_assignments" ca WHERE ca."colonyId" = c."colonyId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD CONSTRAINT "CHK_crew_assignments_single_location" CHECK (num_nonnulls("colonyId", "spacecraftId", "escapePodId") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue" DROP COLUMN IF EXISTS "crewIds", DROP COLUMN IF EXISTS "crewAssigned"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue"
         ADD COLUMN IF NOT EXISTS "crewAssigned" integer NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS "crewIds" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP CONSTRAINT IF EXISTS "CHK_crew_assignments_single_location"`,
    );
    // Pod occupants cannot be represented without the pod: land them as ship-less crew is impossible, so remove them.
    await queryRunner.query(
      `DELETE FROM "crew" WHERE "id" IN (SELECT "crewId" FROM "crew_assignments" WHERE "escapePodId" IS NOT NULL)`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_crew_assignments_escape_pod"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP CONSTRAINT IF EXISTS "FK_crew_assignments_escape_pod"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP COLUMN IF EXISTS "escapePodId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escape_pods_location"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "escape_pods"`);
  }
}
