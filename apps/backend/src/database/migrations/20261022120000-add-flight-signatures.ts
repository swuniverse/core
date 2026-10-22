import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlightSignatures20261022120000 implements MigrationInterface {
  name = 'AddFlightSignatures20261022120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "flight_signatures" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "spacecraftId" integer NOT NULL,
        "spacecraftName" varchar(255) NOT NULL,
        "shipClassId" integer NOT NULL,
        "shipClassName" varchar(255) NOT NULL,
        "locationId" integer NOT NULL,
        "fromDirection" varchar(8),
        "toDirection" varchar(8),
        "isCloaked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flight_signatures" PRIMARY KEY ("id"),
        CONSTRAINT "FK_flight_signatures_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_flight_signatures_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_flight_signatures_location_created" ON "flight_signatures" ("locationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_flight_signatures_spacecraft_created" ON "flight_signatures" ("spacecraftId", "createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "flight_signatures"`);
  }
}
