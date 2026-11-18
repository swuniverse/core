import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminBroadcastDeliveries20261117120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // No email_notification rows are inserted or changed: an absent preference
    // now means opt-out. Existing explicitly stored choices remain intact.
    await queryRunner.query(`CREATE TABLE admin_broadcast_deliveries (
      "broadcastId" uuid NOT NULL,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sent boolean NOT NULL DEFAULT false,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("broadcastId", "userId")
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE admin_broadcast_deliveries');
  }
}
