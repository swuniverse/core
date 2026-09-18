import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipClassDiscoveries20260910207000 implements MigrationInterface {
  name = 'AddShipClassDiscoveries20260910207000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ship_class_discoveries" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL,
        "source" varchar(32) NOT NULL,
        "sourceSpacecraftId" integer NOT NULL,
        "targetSpacecraftId" integer NOT NULL,
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ship_class_discoveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ship_class_discoveries_user_class" UNIQUE ("userId", "shipClassId")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_ship_class_discoveries_user" ON "ship_class_discoveries" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "ship_class_discoveries"');
  }
}
