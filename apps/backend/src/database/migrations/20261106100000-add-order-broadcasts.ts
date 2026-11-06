import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderBroadcasts20261106100000 implements MigrationInterface {
  name = 'AddOrderBroadcasts20261106100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "order_broadcasts" (
      "id" SERIAL NOT NULL,
      "message" text NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_order_broadcasts" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE TABLE "order_broadcast_acks" (
      "broadcastId" integer NOT NULL,
      "userId" integer NOT NULL,
      "acknowledgedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_order_broadcast_acks" PRIMARY KEY ("broadcastId", "userId"),
      CONSTRAINT "FK_order_broadcast_acks_broadcast" FOREIGN KEY ("broadcastId")
        REFERENCES "order_broadcasts"("id") ON DELETE CASCADE
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "order_broadcast_acks"');
    await queryRunner.query('DROP TABLE "order_broadcasts"');
  }
}
