import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftTorpedoStorage20260624110000 implements MigrationInterface {
  name = 'AddSpacecraftTorpedoStorage20260624110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_torpedo_storage" (
        "id" SERIAL NOT NULL,
        "spacecraftId" integer NOT NULL,
        "torpedoTypeId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_spacecraft_torpedo_storage" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_spacecraft_torpedo_storage_ship" UNIQUE ("spacecraftId"),
        CONSTRAINT "FK_spacecraft_torpedo_storage_ship" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_spacecraft_torpedo_storage_ship" ON "spacecraft_torpedo_storage" ("spacecraftId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "spacecraft_torpedo_storage"`,
    );
  }
}
