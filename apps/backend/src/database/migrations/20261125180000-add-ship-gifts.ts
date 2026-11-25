import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipGifts20261125180000 implements MigrationInterface {
  name = 'AddShipGifts20261125180000';

  async up(runner: QueryRunner): Promise<void> {
    // A broadcast with a target user is delivered to that player only.
    await runner.query(
      `ALTER TABLE "order_broadcasts" ADD COLUMN "targetUserId" integer NULL
       REFERENCES users(id) ON DELETE CASCADE`,
    );
    await runner.query(`CREATE TABLE "ship_gifts" (
      "id" SERIAL NOT NULL,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "giftKey" character varying NOT NULL,
      "spacecraftId" integer NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_ship_gifts" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_ship_gifts_user_key" UNIQUE ("userId", "giftKey")
    )`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "ship_gifts"');
    await runner.query('ALTER TABLE "order_broadcasts" DROP COLUMN "targetUserId"');
  }
}
