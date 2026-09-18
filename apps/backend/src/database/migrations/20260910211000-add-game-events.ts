import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameEvents20260910211000 implements MigrationInterface {
  name = 'AddGameEvents20260910211000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "game_events" (
      "id" SERIAL NOT NULL,
      "type" varchar(48) NOT NULL,
      "text" text NOT NULL,
      "scope" varchar(12),
      "layerId" integer,
      "systemId" integer,
      "x" integer,
      "y" integer,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_game_events" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_game_events_created" ON "game_events" ("createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_game_events_type_created" ON "game_events" ("type", "createdAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "game_events"');
  }
}
