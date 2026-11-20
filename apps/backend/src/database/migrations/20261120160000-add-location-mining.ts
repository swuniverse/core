import type { MigrationInterface, QueryRunner } from 'typeorm';

/** sc-AUD-12a: STU `stu_location_mining`; rows are created on first collection. */
export class AddLocationMining1795190400000 implements MigrationInterface {
  name = 'AddLocationMining1795190400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "location_mining" (
        "id" SERIAL PRIMARY KEY,
        "locationId" integer NOT NULL REFERENCES "space_locations"("id") ON DELETE CASCADE,
        "commodityId" integer NOT NULL,
        "actualAmount" integer NOT NULL CHECK ("actualAmount" >= 0),
        "maxAmount" integer NOT NULL CHECK ("maxAmount" > 0),
        "depletedAt" timestamp NULL,
        CONSTRAINT "UQ_location_mining_location_commodity" UNIQUE ("locationId", "commodityId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_location_mining_depleted" ON "location_mining" ("depletedAt") WHERE "depletedAt" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "location_mining"`);
  }
}
