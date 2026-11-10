import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWormholeRestrictions20261110180000 implements MigrationInterface {
  name = 'AddWormholeRestrictions20261110180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wormhole_restrictions" (
        "id" SERIAL PRIMARY KEY,
        "wormholeId" integer NOT NULL,
        "targetType" varchar(16) NOT NULL,
        "targetId" integer NOT NULL,
        "mode" varchar(8) NOT NULL,
        CONSTRAINT "FK_wormhole_restrictions_wormhole" FOREIGN KEY ("wormholeId") REFERENCES "wormholes"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_wormhole_restrictions_type" CHECK ("targetType" IN ('USER', 'ALLIANCE', 'FACTION', 'SHIP')),
        CONSTRAINT "CHK_wormhole_restrictions_mode" CHECK ("mode" IN ('ALLOW', 'DENY')),
        CONSTRAINT "CHK_wormhole_restrictions_target" CHECK ("targetId" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_wormhole_restrictions_target" ON "wormhole_restrictions" ("wormholeId", "targetType", "targetId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "wormhole_restrictions"');
  }
}
