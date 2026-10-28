import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationClassDiscoveries20261028120000
  implements MigrationInterface
{
  name = 'AddStationClassDiscoveries20261028120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "station_class_discoveries" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL,
        "source" varchar(32) NOT NULL,
        "sourceSpacecraftId" integer NOT NULL,
        "targetSpacecraftId" integer NOT NULL,
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_station_class_discoveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_station_class_discoveries_user_class" UNIQUE ("userId", "shipClassId")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_station_class_discoveries_user" ON "station_class_discoveries" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "station_class_discoveries"');
  }
}
