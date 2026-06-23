import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyShipBuildplans20260620100000 implements MigrationInterface {
  name = 'AddColonyShipBuildplans20260620100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_ship_buildplans" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL,
        "name" varchar(255) NOT NULL,
        "signature" varchar(128) NOT NULL,
        "moduleCommodityIds" jsonb NOT NULL DEFAULT '[]',
        "moduleTypes" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_colony_ship_buildplans" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_user_signature" ON "colony_ship_buildplans" ("userId", "signature")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_user_ship_class" ON "colony_ship_buildplans" ("userId", "shipClassId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_ship_buildplans"`);
  }
}
