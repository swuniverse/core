import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyScans20260716094500 implements MigrationInterface {
  name = 'AddColonyScans20260716094500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_scans" (
        "id" SERIAL NOT NULL,
        "colonyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "colonyOwnerId" integer NOT NULL,
        "colonyName" character varying(255),
        "colonyOwnerUsername" character varying(64) NOT NULL,
        "starSystemId" integer,
        "celestialObjectId" integer,
        "colonyClassId" integer,
        "surfaceWidth" integer,
        "surfaceHeight" integer,
        "surfaceFields" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_colony_scans_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_scans_user_colony" ON "colony_scans" ("userId", "colonyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_scans_owner" ON "colony_scans" ("colonyOwnerId")`,
    );
    await queryRunner
      .query(
        `
      ALTER TABLE "colony_scans"
      ADD CONSTRAINT "FK_colony_scans_colony"
      FOREIGN KEY ("colonyId") REFERENCES "colonies"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);
    await queryRunner
      .query(
        `
      ALTER TABLE "colony_scans"
      ADD CONSTRAINT "FK_colony_scans_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `,
      )
      .catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_scans" DROP CONSTRAINT IF EXISTS "FK_colony_scans_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "colony_scans" DROP CONSTRAINT IF EXISTS "FK_colony_scans_colony"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_colony_scans_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_colony_scans_user_colony"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_scans"`);
  }
}
