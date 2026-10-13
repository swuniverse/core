import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameStatus20261013100000 implements MigrationInterface {
  name = 'AddGameStatus20261013100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "game_status" (
      "id" smallint NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'ONLINE',
      "message" text NOT NULL DEFAULT '',
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_game_status" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `INSERT INTO "game_status" ("id", "status", "message") VALUES (1, 'ONLINE', '')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "game_status"');
  }
}
