import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCargoItems20260512100000 implements MigrationInterface {
  name = 'AddCargoItems20260512100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cargo_items" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_cargo_ship_commodity" UNIQUE ("spacecraftId", "commodityId"),
        CONSTRAINT "FK_cargo_spacecraft" FOREIGN KEY ("spacecraftId")
          REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "cargo_items"');
  }
}
