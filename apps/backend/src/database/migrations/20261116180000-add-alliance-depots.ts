import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceDepots20261116180000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "alliance_depots" (
      "stationId" integer PRIMARY KEY REFERENCES "spacecraft"("id") ON DELETE CASCADE,
      "allianceId" integer NOT NULL REFERENCES "alliances"("id") ON DELETE CASCADE,
      "ownerUserId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await runner.query(
      'CREATE INDEX "IDX_alliance_depots_alliance_owner" ON "alliance_depots" ("allianceId", "ownerUserId")',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "alliance_depots"');
  }
}
