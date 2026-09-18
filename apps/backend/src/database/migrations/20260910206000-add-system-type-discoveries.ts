import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemTypeDiscoveries20260910206000 implements MigrationInterface {
  name = 'AddSystemTypeDiscoveries20260910206000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "system_type_discoveries" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "systemTypeId" integer NOT NULL,
        "source" varchar(32) NOT NULL,
        "spacecraftId" integer,
        "layerId" integer,
        "x" integer,
        "y" integer,
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_type_discoveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_system_type_discoveries_user_type" UNIQUE ("userId", "systemTypeId")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_system_type_discoveries_user" ON "system_type_discoveries" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "system_type_discoveries"');
  }
}
