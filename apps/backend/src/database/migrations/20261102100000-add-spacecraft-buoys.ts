import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftBuoys20261102100000 implements MigrationInterface {
  name = 'AddSpacecraftBuoys20261102100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_buoys" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "spacecraftId" integer NOT NULL,
        "locationId" integer NOT NULL,
        "text" varchar(60) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spacecraft_buoys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spacecraft_buoys_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_buoys_spacecraft" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_buoys_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spacecraft_buoys_user" ON "spacecraft_buoys" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spacecraft_buoys_location" ON "spacecraft_buoys" ("locationId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "spacecraft_buoys"`);
  }
}
