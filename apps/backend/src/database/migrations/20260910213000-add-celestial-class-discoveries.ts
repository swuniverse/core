import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCelestialClassDiscoveries20260910213000
  implements MigrationInterface
{
  name = 'AddCelestialClassDiscoveries20260910213000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "celestial_class_discoveries" (
      "id" SERIAL NOT NULL,
      "userId" integer NOT NULL,
      "classId" integer NOT NULL,
      "celestialObjectId" integer NOT NULL,
      "spacecraftId" integer NOT NULL,
      "source" varchar(32) NOT NULL,
      "discoveredAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_celestial_class_discoveries" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_celestial_class_discovery_user_class" ON "celestial_class_discoveries" ("userId", "classId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "celestial_class_discoveries"');
  }
}
